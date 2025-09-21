/**
 * Unity IPC Communication Layer
 *
 * Handles real communication with Unity Editor via named pipes
 * Replaces mock connections with actual Unity Editor integration
 */

import * as net from 'net';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import type { Logger } from '../utils/logger.js';

export interface UnityIPCMessage {
  id?: string;
  command?: string;
  type?: string;
  data?: any;
  parameters?: Record<string, any>;
  success?: boolean;
  error?: string;
  timestamp?: Date;
}

export interface UnityEditorState {
  unityVersion: string;
  projectName: string;
  isPlaying: boolean;
  isCompiling: boolean;
  isPaused: boolean;
  activeScene: string;
  targetPlatform: string;
  buildSettingsScenes: number;
}

/**
 * Manages IPC communication with Unity Editor instances
 */
export class UnityIPC extends EventEmitter {
  private socket: net.Socket | null = null;
  private isConnected = false;
  private logger: Logger;
  private projectPath: string;
  private pipeName: string;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private messageHandlers = new Map<string, (response: UnityIPCMessage) => void>();

  constructor(projectPath: string, logger: Logger) {
    super();
    this.projectPath = projectPath;
    this.logger = logger.child('UnityIPC');

    // Generate pipe name based on project path (same logic as Unity plugin)
    const projectHash = Math.abs(this.hashCode(projectPath)).toString();
    this.pipeName = `unity-mcp-${projectHash}`;

    this.logger.debug(`Unity IPC initialized for pipe: ${this.pipeName}`);
  }

  /**
   * Connect to Unity Editor via named pipe
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.logger.info(`Attempting to connect to Unity Editor via pipe: ${this.pipeName}`);

        // Create socket connection to named pipe
        const pipePath = process.platform === 'win32'
          ? `\\\\.\\pipe\\${this.pipeName}`
          : `/tmp/${this.pipeName}`;

        this.socket = net.createConnection(pipePath);

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.logger.info('Successfully connected to Unity Editor');
          this.emit('connected');
          resolve(true);
        });

        this.socket.on('data', (data) => {
          this.handleIncomingMessage(data);
        });

        this.socket.on('error', (error) => {
          this.logger.debug(`Unity IPC connection failed: ${error.message}`);
          this.isConnected = false;
          resolve(false);
        });

        this.socket.on('close', () => {
          this.logger.info('Unity IPC connection closed');
          this.isConnected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.logger.warn('Unity IPC connection timeout');
            this.socket?.destroy();
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        this.logger.error(`Failed to connect to Unity Editor: ${error}`);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from Unity Editor
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.isConnected = false;
    this.logger.info('Disconnected from Unity Editor');
  }

  /**
   * Send command to Unity Editor
   */
  async sendCommand(command: string, parameters: Record<string, any> = {}): Promise<UnityIPCMessage> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) {
        reject(new Error('Not connected to Unity Editor'));
        return;
      }

      const messageId = this.generateMessageId();
      const message: UnityIPCMessage = {
        id: messageId,
        command,
        parameters,
        timestamp: new Date()
      };

      // Store response handler
      this.messageHandlers.set(messageId, resolve);

      // Send message
      const jsonMessage = JSON.stringify(message);
      this.socket.write(jsonMessage);

      this.logger.debug(`Sent command to Unity: ${command}`, parameters);

      // Timeout for response
      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId);
          reject(new Error(`Command timeout: ${command}`));
        }
      }, 10000);
    });
  }

  /**
   * Get current Unity Editor state
   */
  async getUnityState(): Promise<UnityEditorState> {
    const response = await this.sendCommand('get_state');
    return response.data as UnityEditorState;
  }

  /**
   * Control Unity play mode
   */
  async setPlayMode(playing: boolean): Promise<boolean> {
    const command = playing ? 'enter_play_mode' : 'exit_play_mode';
    const response = await this.sendCommand(command);
    return response.success === true;
  }

  /**
   * Load a Unity scene
   */
  async loadScene(scenePath: string): Promise<boolean> {
    const response = await this.sendCommand('load_scene', { scenePath });
    return response.success === true;
  }

  /**
   * Refresh Unity assets
   */
  async refreshAssets(): Promise<boolean> {
    const response = await this.sendCommand('refresh_assets');
    return response.success === true;
  }

  /**
   * Ping Unity Editor (connection test)
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.sendCommand('ping');
      return response.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if connected to Unity Editor
   */
  isConnectedToUnity(): boolean {
    return this.isConnected;
  }

  /**
   * Get project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Handle incoming messages from Unity Editor
   */
  private handleIncomingMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as UnityIPCMessage;

      // Handle responses to commands
      if (message.id && this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id)!;
        this.messageHandlers.delete(message.id);
        handler(message);
        return;
      }

      // Handle Unity events
      if (message.type) {
        this.logger.debug(`Received Unity event: ${message.type}`, message.data);
        this.emit('unity_event', message);

        // Emit specific event types
        switch (message.type) {
          case 'state_update':
            this.emit('state_update', message.data);
            break;
          case 'play_mode_changed':
            this.emit('play_mode_changed', message.data);
            break;
          case 'scene_opened':
            this.emit('scene_opened', message.data);
            break;
          case 'hierarchy_changed':
            this.emit('hierarchy_changed', message.data);
            break;
        }
      }

    } catch (error) {
      this.logger.error(`Failed to parse Unity message: ${error}`);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.logger.debug('Attempting to reconnect to Unity Editor...');
      this.reconnectTimer = undefined;
      await this.connect();
    }, 5000);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Hash string to number (for pipe name generation)
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

/**
 * Unity Process Detection
 * Finds running Unity Editor instances
 */
export class UnityProcessDetector {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child('UnityProcessDetector');
  }

  /**
   * Find running Unity Editor processes
   */
  async findUnityProcesses(): Promise<UnityProcess[]> {
    try {
      // Platform-specific process detection
      if (process.platform === 'win32') {
        return await this.findWindowsUnityProcesses();
      } else {
        return await this.findUnixUnityProcesses();
      }
    } catch (error) {
      this.logger.error(`Failed to detect Unity processes: ${error}`);
      return [];
    }
  }

  /**
   * Find Unity processes on Windows
   */
  private async findWindowsUnityProcesses(): Promise<UnityProcess[]> {
    const { execSync } = await import('child_process');

    try {
      const output = execSync('wmic process where "name=\'Unity.exe\'" get ProcessId,CommandLine /format:csv', {
        encoding: 'utf8',
        timeout: 5000
      });

      return this.parseWindowsProcessOutput(output);
    } catch (error) {
      this.logger.debug('No Unity processes found on Windows');
      return [];
    }
  }

  /**
   * Find Unity processes on Unix systems
   */
  private async findUnixUnityProcesses(): Promise<UnityProcess[]> {
    const { execSync } = await import('child_process');

    try {
      const output = execSync('ps aux | grep -i unity | grep -v grep', {
        encoding: 'utf8',
        timeout: 5000
      });

      return this.parseUnixProcessOutput(output);
    } catch (error) {
      this.logger.debug('No Unity processes found on Unix');
      return [];
    }
  }

  /**
   * Parse Windows process output
   */
  private parseWindowsProcessOutput(output: string): UnityProcess[] {
    const processes: UnityProcess[] = [];
    const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const commandLine = parts[1]?.trim();
        const pid = parseInt(parts[2]?.trim());

        if (commandLine && pid && commandLine.includes('-projectPath')) {
          const projectPath = this.extractProjectPath(commandLine);
          if (projectPath) {
            processes.push({
              pid,
              projectPath,
              commandLine
            });
          }
        }
      }
    }

    return processes;
  }

  /**
   * Parse Unix process output
   */
  private parseUnixProcessOutput(output: string): UnityProcess[] {
    const processes: UnityProcess[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 11) {
        const pid = parseInt(parts[1]);
        const commandLine = parts.slice(10).join(' ');

        if (pid && commandLine.includes('-projectPath')) {
          const projectPath = this.extractProjectPath(commandLine);
          if (projectPath) {
            processes.push({
              pid,
              projectPath,
              commandLine
            });
          }
        }
      }
    }

    return processes;
  }

  /**
   * Extract project path from Unity command line
   */
  private extractProjectPath(commandLine: string): string | null {
    const match = commandLine.match(/-projectPath\s+"?([^"]+)"?/);
    return match ? match[1].trim() : null;
  }
}

export interface UnityProcess {
  pid: number;
  projectPath: string;
  commandLine: string;
}