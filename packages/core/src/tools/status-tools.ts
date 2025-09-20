/**
 * Unity Status Tools
 *
 * MCP tools for checking Unity status and project information
 */

import type { UnityTool, MCPCommand, Logger } from '../types/mcp.js';
import { UnityConnectionManager } from '../connection/connection-manager.js';

/**
 * Tool for getting Unity status
 */
export class UnityStatusTool {
  private logger: Logger;
  private connectionManager: UnityConnectionManager;

  constructor(logger: Logger) {
    this.logger = logger.child('UnityStatusTool');
    this.connectionManager = new UnityConnectionManager(this.logger);
  }

  /**
   * Get the tool definition
   */
  getTool(): UnityTool {
    return {
      name: 'unity_status',
      description: 'Get current Unity connection and project status',
      category: 'connection',
      builtin: true,
      inputSchema: {
        type: 'object',
        properties: {
          includeDetails: {
            type: 'boolean',
            description: 'Include detailed project information',
            default: false,
          },
        },
      },
    };
  }

  /**
   * Execute the status command
   */
  async execute(command: MCPCommand): Promise<any> {
    const { includeDetails = false } = command.params;

    this.logger.debug('Getting Unity status...');

    try {
      const status = this.connectionManager.getStatus();
      const activeConnection = this.connectionManager.getActiveConnection();

      const result: any = {
        timestamp: new Date().toISOString(),
        serverVersion: '0.1.0',
        connections: status.connections.map(conn => ({
          projectPath: conn.projectPath,
          projectName: conn.projectName,
          unityVersion: conn.unityVersion,
          status: conn.status,
          targetPlatform: conn.targetPlatform,
          lastHeartbeat: conn.lastHeartbeat.toISOString(),
          isActive: conn.projectPath === status.activeProject,
        })),
        activeProject: status.activeProject,
        isCompiling: status.isCompiling,
        playModeState: status.playModeState,
        lastError: status.lastError,
        summary: {
          totalConnections: status.connections.length,
          connectedProjects: status.connections.filter(c => c.status === 'connected').length,
          hasActiveProject: !!status.activeProject,
        },
      };

      // Add detailed information if requested
      if (includeDetails && activeConnection) {
        try {
          const projectInfo = await this.connectionManager.getProjectInfo(activeConnection.projectPath);
          result.activeProjectDetails = {
            ...projectInfo,
            connectionInfo: activeConnection,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to get detailed project info: ${errorMessage}`);
          result.activeProjectDetails = {
            error: 'Failed to retrieve detailed project information',
          };
        }
      }

      this.logger.debug(`Unity status retrieved: ${result.summary.connectedProjects} connected projects`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Unity status: ${errorMessage}`, error);
      throw new Error(`Failed to get Unity status: ${errorMessage}`);
    }
  }
}

/**
 * Tool for getting project information
 */
export class UnityProjectInfoTool {
  private logger: Logger;
  private connectionManager: UnityConnectionManager;

  constructor(logger: Logger) {
    this.logger = logger.child('UnityProjectInfoTool');
    this.connectionManager = new UnityConnectionManager(this.logger);
  }

  /**
   * Get the tool definition
   */
  getTool(): UnityTool {
    return {
      name: 'unity_project_info',
      description: 'Get detailed information about a Unity project',
      category: 'connection',
      builtin: true,
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to Unity project (optional, defaults to active project)',
          },
        },
      },
    };
  }

  /**
   * Execute the project info command
   */
  async execute(command: MCPCommand): Promise<any> {
    const { projectPath } = command.params;

    // Determine which project to analyze
    let targetPath = projectPath;
    if (!targetPath) {
      const activeConnection = this.connectionManager.getActiveConnection();
      if (!activeConnection) {
        throw new Error('No project path specified and no active project connection');
      }
      targetPath = activeConnection.projectPath;
    }

    this.logger.info(`Getting project information for: ${targetPath}`);

    try {
      const projectInfo = await this.connectionManager.getProjectInfo(targetPath);
      const connection = this.connectionManager.getActiveConnection();

      const result = {
        ...projectInfo,
        analysis: {
          isValidProject: true,
          hasScenes: projectInfo.scenes.length > 0,
          scenesInBuild: projectInfo.scenes.filter(s => s.isInBuild).length,
          totalScenes: projectInfo.scenes.length,
        },
        connectionStatus: connection ? {
          isConnected: connection.projectPath === targetPath,
          status: connection.status,
          lastHeartbeat: connection.lastHeartbeat?.toISOString(),
        } : {
          isConnected: false,
          status: 'not_connected',
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.info(`Project info retrieved for: ${projectInfo.projectName}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get project info: ${errorMessage}`, error);
      throw new Error(`Failed to get project info: ${errorMessage}`);
    }
  }
}