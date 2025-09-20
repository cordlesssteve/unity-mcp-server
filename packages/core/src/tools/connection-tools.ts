/**
 * Unity Connection Tools
 *
 * MCP tools for managing Unity project connections
 */

import type { UnityTool, MCPCommand, Logger } from '../types/mcp.js';
import { UnityConnectionManager } from '../connection/connection-manager.js';

/**
 * Tool for connecting to Unity projects
 */
export class UnityConnectionTool {
  private logger: Logger;
  private connectionManager: UnityConnectionManager;

  constructor(logger: Logger) {
    this.logger = logger.child('UnityConnectionTool');
    this.connectionManager = new UnityConnectionManager(this.logger);
  }

  /**
   * Get the tool definition
   */
  getTool(): UnityTool {
    return {
      name: 'unity_connect',
      description: 'Connect to a Unity project',
      category: 'connection',
      builtin: true,
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Absolute path to Unity project directory',
          },
          autoDetect: {
            type: 'boolean',
            description: 'Auto-detect Unity version and settings',
            default: true,
          },
        },
        required: ['projectPath'],
      },
    };
  }

  /**
   * Execute the connection command
   */
  async execute(command: MCPCommand): Promise<any> {
    const { projectPath, autoDetect = true } = command.params;

    this.logger.info(`Connecting to Unity project: ${projectPath}`);

    try {
      // Validate project path
      if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('projectPath is required and must be a string');
      }

      // Connect to the project
      const connection = await this.connectionManager.connectToProject(projectPath);

      // Get additional project info if auto-detect is enabled
      let projectInfo = null;
      if (autoDetect) {
        try {
          projectInfo = await this.connectionManager.getProjectInfo(projectPath);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to auto-detect project info: ${errorMessage}`);
        }
      }

      const result = {
        connected: true,
        projectPath: connection.projectPath,
        unityVersion: connection.unityVersion,
        editorPID: connection.editorPID,
        projectName: connection.projectName,
        targetPlatform: connection.targetPlatform,
        lastModified: new Date().toISOString(),
        ...(projectInfo && {
          scenes: projectInfo.scenes,
          additionalInfo: {
            scenesCount: projectInfo.scenes.length,
            hasValidStructure: true,
          },
        }),
      };

      this.logger.info(`Successfully connected to Unity project: ${connection.projectName}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to connect to Unity project: ${errorMessage}`, error);
      throw new Error(`Failed to connect to Unity project: ${errorMessage}`);
    }
  }
}

/**
 * Tool for disconnecting from Unity projects
 */
export class UnityDisconnectTool {
  private logger: Logger;
  private connectionManager: UnityConnectionManager;

  constructor(logger: Logger) {
    this.logger = logger.child('UnityDisconnectTool');
    this.connectionManager = new UnityConnectionManager(this.logger);
  }

  /**
   * Get the tool definition
   */
  getTool(): UnityTool {
    return {
      name: 'unity_disconnect',
      description: 'Disconnect from Unity project',
      category: 'connection',
      builtin: true,
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Project to disconnect from (optional, defaults to active)',
          },
        },
      },
    };
  }

  /**
   * Execute the disconnection command
   */
  async execute(command: MCPCommand): Promise<any> {
    const { projectPath } = command.params;

    this.logger.info(`Disconnecting from Unity project: ${projectPath || 'active'}`);

    try {
      await this.connectionManager.disconnectFromProject(projectPath);

      return {
        disconnected: true,
        projectPath: projectPath || 'active',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to disconnect from Unity project: ${errorMessage}`, error);
      throw new Error(`Failed to disconnect from Unity project: ${errorMessage}`);
    }
  }
}

/**
 * Tool for discovering Unity projects
 */
export class UnityDiscoverTool {
  private logger: Logger;
  private connectionManager: UnityConnectionManager;

  constructor(logger: Logger) {
    this.logger = logger.child('UnityDiscoverTool');
    this.connectionManager = new UnityConnectionManager(this.logger);
  }

  /**
   * Get the tool definition
   */
  getTool(): UnityTool {
    return {
      name: 'unity_discover_projects',
      description: 'Discover Unity projects in a directory',
      category: 'connection',
      builtin: true,
      inputSchema: {
        type: 'object',
        properties: {
          searchPath: {
            type: 'string',
            description: 'Directory path to search for Unity projects',
          },
          includeSubdirectories: {
            type: 'boolean',
            description: 'Search subdirectories recursively',
            default: false,
          },
        },
        required: ['searchPath'],
      },
    };
  }

  /**
   * Execute the project discovery command
   */
  async execute(command: MCPCommand): Promise<any> {
    const { searchPath, includeSubdirectories: _includeSubdirectories = false } = command.params;

    this.logger.info(`Discovering Unity projects in: ${searchPath}`);

    try {
      const projects = await this.connectionManager.discoverProjects(searchPath);

      // Get detailed info for each project
      const projectDetails = await Promise.allSettled(
        projects.map(async (projectPath) => {
          try {
            const info = await this.connectionManager.getProjectInfo(projectPath);
            return {
              path: projectPath,
              name: info.projectName,
              version: info.unityVersion,
              valid: true,
              lastModified: info.lastModified,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
              path: projectPath,
              valid: false,
              error: errorMessage,
            };
          }
        })
      );

      const validProjects = projectDetails
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<any>).value)
        .filter((project) => project.valid);

      const result = {
        searchPath,
        projectsFound: projects.length,
        validProjects: validProjects.length,
        projects: validProjects,
      };

      this.logger.info(`Found ${validProjects.length} valid Unity projects in ${searchPath}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to discover Unity projects: ${errorMessage}`, error);
      throw new Error(`Failed to discover Unity projects: ${errorMessage}`);
    }
  }
}