/**
 * Unity Connection Manager
 *
 * Manages connections to Unity Editor instances and projects
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

import type { UnityConnection, UnityProjectInfo, UnityStatus, SceneInfo } from '../types/unity.js';
import type { Logger } from '../utils/logger.js';
import { UnityIPC, UnityProcessDetector } from '../unity/unity-ipc.js';

/**
 * Manages Unity Editor connections and project discovery
 */
export class UnityConnectionManager extends EventEmitter {
  private connections = new Map<string, UnityConnection>();
  private unityIPCConnections = new Map<string, UnityIPC>();
  private activeConnection: string | undefined = undefined;
  private heartbeatInterval?: NodeJS.Timeout;
  private processDetector: UnityProcessDetector;
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger.child('ConnectionManager');
    this.processDetector = new UnityProcessDetector(this.logger);
  }

  /**
   * Initialize the connection manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Unity Connection Manager...');

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    this.logger.info('Unity Connection Manager initialized');
  }

  /**
   * Discover Unity projects in a directory
   */
  async discoverProjects(searchPath: string): Promise<string[]> {
    this.logger.debug(`Discovering Unity projects in: ${searchPath}`);

    try {
      const projects: string[] = [];
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(searchPath, entry.name);
          if (await this.isValidUnityProject(projectPath)) {
            projects.push(projectPath);
          }
        }
      }

      this.logger.info(`Found ${projects.length} Unity projects in ${searchPath}`);
      return projects;
    } catch (error) {
      this.logger.error(`Failed to discover projects in ${searchPath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a directory is a valid Unity project
   */
  async isValidUnityProject(projectPath: string): Promise<boolean> {
    try {
      // Check for required Unity project files/directories
      const requiredPaths = [
        path.join(projectPath, 'Assets'),
        path.join(projectPath, 'ProjectSettings'),
        path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt'),
      ];

      for (const requiredPath of requiredPaths) {
        try {
          await fs.access(requiredPath);
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Unity project information
   */
  async getProjectInfo(projectPath: string): Promise<UnityProjectInfo> {
    if (!await this.isValidUnityProject(projectPath)) {
      throw new Error(`Invalid Unity project: ${projectPath}`);
    }

    try {
      // Read project version
      const versionFile = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
      const versionContent = await fs.readFile(versionFile, 'utf-8');
      const versionMatch = versionContent.match(/m_EditorVersion: (.+)/);
      const unityVersion = versionMatch ? versionMatch[1].trim() : 'unknown';

      // Get project name from path
      const projectName = path.basename(projectPath);

      // Get target platform from ProjectSettings
      const targetPlatform = await this.getTargetPlatform(projectPath);

      // Get scenes information
      const scenes = await this.getScenes(projectPath);

      // Get last modified time
      const stats = await fs.stat(projectPath);
      const lastModified = stats.mtime.toISOString();

      return {
        projectPath,
        projectName,
        unityVersion,
        targetPlatform,
        scenes,
        lastModified,
      };
    } catch (error) {
      this.logger.error(`Failed to get project info for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Connect to a Unity project
   */
  async connectToProject(projectPath: string): Promise<UnityConnection> {
    this.logger.info(`Connecting to Unity project: ${projectPath}`);

    try {
      // Validate project
      const projectInfo = await this.getProjectInfo(projectPath);

      // Check if already connected
      if (this.connections.has(projectPath)) {
        const existing = this.connections.get(projectPath)!;
        if (existing.status === 'connected') {
          this.logger.info(`Already connected to project: ${projectPath}`);
          return existing;
        }
      }

      // Attempt to connect to running Unity instance
      const unityIPC = new UnityIPC(projectPath, this.logger);
      const isUnityRunning = await unityIPC.connect();

      // Create connection with real Unity state if available
      const editorPID = isUnityRunning ? await this.getUnityPID(projectPath) : undefined;
      const connection: UnityConnection = {
        projectPath,
        unityVersion: projectInfo.unityVersion,
        status: isUnityRunning ? 'connected' : 'project_only',
        lastHeartbeat: new Date(),
        targetPlatform: projectInfo.targetPlatform,
        projectName: projectInfo.projectName,
        ...(editorPID !== undefined && { editorPID }),
      };

      // Set up Unity IPC event handlers if connected
      if (isUnityRunning) {
        this.setupUnityIPCHandlers(unityIPC, connection);
        this.unityIPCConnections.set(projectPath, unityIPC);

        // Get real Unity state
        try {
          const unityState = await unityIPC.getUnityState();
          connection.isPlaying = unityState.isPlaying;
          connection.isCompiling = unityState.isCompiling;
        } catch (error) {
          this.logger.warn(`Failed to get Unity state: ${error}`);
        }
      }

      this.connections.set(projectPath, connection);
      this.activeConnection = projectPath;

      this.emit('projectConnected', connection);

      if (isUnityRunning) {
        this.logger.info(`Successfully connected to running Unity Editor: ${projectInfo.projectName}`);
      } else {
        this.logger.info(`Connected to Unity project (file-based): ${projectInfo.projectName}`);
        this.logger.info('Unity Editor not running - file-based analysis only');
      }

      return connection;
    } catch (error) {
      this.logger.error(`Failed to connect to Unity project ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from a Unity project
   */
  async disconnectFromProject(projectPath?: string): Promise<void> {
    const targetPath = projectPath || this.activeConnection;
    if (!targetPath) {
      throw new Error('No project specified and no active connection');
    }

    const connection = this.connections.get(targetPath);
    if (!connection) {
      throw new Error(`No connection found for project: ${targetPath}`);
    }

    this.logger.info(`Disconnecting from Unity project: ${targetPath}`);

    // Clean up Unity IPC connection
    const unityIPC = this.unityIPCConnections.get(targetPath);
    if (unityIPC) {
      unityIPC.disconnect();
      this.unityIPCConnections.delete(targetPath);
    }

    // Update connection status
    connection.status = 'disconnected';

    // Remove from active connection if it's the active one
    if (this.activeConnection === targetPath) {
      this.activeConnection = undefined;
    }

    // Remove from connections
    this.connections.delete(targetPath);

    this.emit('projectDisconnected', connection);
    this.logger.info(`Disconnected from Unity project: ${connection.projectName}`);
  }

  /**
   * Set up Unity IPC event handlers
   */
  private setupUnityIPCHandlers(unityIPC: UnityIPC, connection: UnityConnection): void {
    unityIPC.on('state_update', (state) => {
      connection.isPlaying = state.isPlaying;
      connection.isCompiling = state.isCompiling;
      connection.lastHeartbeat = new Date();
      this.emit('unityStateUpdate', { projectPath: connection.projectPath, state });
    });

    unityIPC.on('play_mode_changed', (data) => {
      connection.isPlaying = data.isPlaying;
      this.emit('playModeChanged', { projectPath: connection.projectPath, data });
    });

    unityIPC.on('scene_opened', (data) => {
      this.emit('sceneOpened', { projectPath: connection.projectPath, data });
    });

    unityIPC.on('disconnected', () => {
      connection.status = 'project_only';
      delete connection.editorPID;
      this.logger.warn(`Unity Editor disconnected from project: ${connection.projectName}`);
    });

    unityIPC.on('error', (error) => {
      this.logger.error(`Unity IPC error for ${connection.projectName}: ${error.message}`);
    });
  }

  /**
   * Get Unity Editor PID for project
   */
  private async getUnityPID(projectPath: string): Promise<number | undefined> {
    try {
      const processes = await this.processDetector.findUnityProcesses();
      const process = processes.find(p => p.projectPath === projectPath);
      return process?.pid;
    } catch (error) {
      this.logger.debug(`Could not detect Unity PID: ${error}`);
      return undefined;
    }
  }

  /**
   * Get Unity IPC connection for project
   */
  getUnityIPC(projectPath: string): UnityIPC | undefined {
    return this.unityIPCConnections.get(projectPath);
  }

  /**
   * Get current Unity status
   */
  getStatus(): UnityStatus {
    const connections = Array.from(this.connections.values());

    // Get real Unity state from active connection
    let isCompiling = false;
    let playModeState: 'Playing' | 'Stopped' | 'Paused' = 'Stopped';

    if (this.activeConnection) {
      const activeConn = this.connections.get(this.activeConnection);
      if (activeConn) {
        isCompiling = activeConn.isCompiling || false;
        if (activeConn.isPlaying) {
          playModeState = 'Playing';
        }
      }
    }

    return {
      connections,
      activeProject: this.activeConnection,
      isCompiling,
      playModeState,
    };
  }

  /**
   * Get active connection
   */
  getActiveConnection(): UnityConnection | undefined {
    if (!this.activeConnection) {
      return undefined;
    }
    return this.connections.get(this.activeConnection);
  }

  /**
   * Switch active project
   */
  async switchActiveProject(projectPath: string): Promise<void> {
    const connection = this.connections.get(projectPath);
    if (!connection) {
      throw new Error(`No connection found for project: ${projectPath}`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Project is not connected: ${projectPath}`);
    }

    const previousActive = this.activeConnection;
    this.activeConnection = projectPath;

    this.emit('activeProjectChanged', {
      previous: previousActive || null,
      current: projectPath,
    });

    this.logger.info(`Switched active project to: ${connection.projectName}`);
  }

  /**
   * Start heartbeat monitoring for connections
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check health of all connections
   */
  private async checkConnectionHealth(): Promise<void> {
    for (const [projectPath, connection] of this.connections) {
      try {
        const isHealthy = await this.isConnectionHealthy(connection);
        if (!isHealthy) {
          this.logger.warn(`Connection unhealthy for project: ${projectPath}`);
          connection.status = 'error';
          this.emit('connectionError', connection);
        } else {
          connection.lastHeartbeat = new Date();
        }
      } catch (error) {
        this.logger.error(`Error checking connection health for ${projectPath}:`, error);
        connection.status = 'error';
        this.emit('connectionError', connection);
      }
    }
  }

  /**
   * Check if a connection is healthy
   */
  private async isConnectionHealthy(connection: UnityConnection): Promise<boolean> {
    // TODO: Implement actual health check
    // This would ping the Unity Editor process or check IPC connection

    // For now, check basic connection validity
    if (!connection.projectPath || connection.status !== 'connected') {
      return false;
    }

    // Check if project directory still exists
    try {
      await fs.access(connection.projectPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get target platform from project settings
   */
  private async getTargetPlatform(_projectPath: string): Promise<string> {
    try {
      // Try to read from EditorBuildSettings.asset
      // For now, return a default
      return 'Standalone';
    } catch {
      return 'Standalone';
    }
  }

  /**
   * Get scenes from the project
   */
  private async getScenes(_projectPath: string): Promise<SceneInfo[]> {
    try {
      // TODO: Implement proper scene discovery
      // This would recursively search for .unity files
      // and check EditorBuildSettings for build status

      const scenes: SceneInfo[] = [];
      return scenes;
    } catch {
      return [];
    }
  }

  /**
   * Shutdown the connection manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Unity Connection Manager...');

    // Clear heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Disconnect from all projects
    const projectPaths = Array.from(this.connections.keys());
    for (const projectPath of projectPaths) {
      try {
        await this.disconnectFromProject(projectPath);
      } catch (error) {
        this.logger.error(`Error disconnecting from ${projectPath}:`, error);
      }
    }

    this.logger.info('Unity Connection Manager shut down');
  }
}