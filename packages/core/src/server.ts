#!/usr/bin/env node

/**
 * Unity MCP Server - Main server implementation
 *
 * This is the core MCP server that provides Unity development assistance
 * through natural language interaction and intelligent automation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { UnityConnectionManager } from './connection/connection-manager.js';
import { UnityToolRegistry } from './tools/tool-registry.js';
import { ProjectContextManager } from './context/context-manager.js';
import { SecurityManager } from './security/security-manager.js';
import { Logger } from './utils/logger.js';
import type { MCPCommand } from './types/mcp.js';

/**
 * Unity MCP Server class
 *
 * Coordinates all Unity development operations through MCP protocol
 */
export class UnityMCPServer {
  private server: Server;
  private connectionManager: UnityConnectionManager;
  private toolRegistry: UnityToolRegistry;
  private contextManager: ProjectContextManager;
  private securityManager: SecurityManager;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('UnityMCPServer');
    this.server = new Server(
      {
        name: 'unity-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.connectionManager = new UnityConnectionManager(this.logger);
    this.toolRegistry = new UnityToolRegistry(this.logger);
    this.contextManager = new ProjectContextManager(this.logger);
    this.securityManager = new SecurityManager(this.logger);

    this.setupHandlers();
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getAllTools();
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Security validation
        await this.securityManager.validateToolCall(name, args || {});

        // Find and execute tool
        const tool = this.toolRegistry.getTool(name);
        if (!tool) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool not found: ${name}`
          );
        }

        // Create command context
        const command: MCPCommand = {
          id: Math.random().toString(36).substr(2, 9),
          method: name,
          params: args || {},
          requiresUnity: tool.requiresPlayMode || tool.affectsAssets || false,
          timeout: 30000, // 30 second default timeout
        };

        // Execute tool
        const result = await this.executeCommand(command);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Tool execution failed: ${errorMessage}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  /**
   * Execute a Unity command
   */
  private async executeCommand(command: MCPCommand): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info(`Executing command: ${command.method}`);

      // Validate Unity connection if required
      if (command.requiresUnity) {
        const connection = this.connectionManager.getActiveConnection();
        if (!connection || connection.status !== 'connected') {
          throw new Error('Unity connection required but not available');
        }
      }

      // Get tool and execute
      const tool = this.toolRegistry.getTool(command.method);
      if (!tool) {
        throw new Error(`Tool not found: ${command.method}`);
      }

      // Execute with timeout
      const result = await Promise.race([
        this.toolRegistry.executeCommand(command),
        this.createTimeoutPromise(command.timeout || 30000),
      ]);

      // Update context based on command execution
      await this.updateContextFromCommand(command, result);

      const duration = Date.now() - startTime;
      this.logger.info(`Command completed in ${duration}ms: ${command.method}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Command failed after ${duration}ms: ${command.method}`, error);
      throw error;
    }
  }

  /**
   * Create a timeout promise that rejects after specified milliseconds
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Command timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Update project context based on command execution
   */
  private async updateContextFromCommand(command: MCPCommand, result: any): Promise<void> {
    try {
      const activeConnection = this.connectionManager.getActiveConnection();
      if (activeConnection) {
        await this.contextManager.recordCommand(
          activeConnection.projectPath,
          command,
          result
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to update context: ${errorMessage}`);
    }
  }

  /**
   * Initialize the server and start listening
   */
  async start(): Promise<void> {
    this.logger.info('Starting Unity MCP Server...');

    try {
      // Initialize managers
      await this.connectionManager.initialize();
      await this.toolRegistry.initialize();
      await this.contextManager.initialize();
      await this.securityManager.initialize();

      // Connect to transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('Unity MCP Server started successfully');
      this.logger.info('Ready to assist with Unity development!');
    } catch (error) {
      this.logger.error('Failed to start Unity MCP Server', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Unity MCP Server...');

    try {
      await this.connectionManager.shutdown();
      await this.contextManager.shutdown();
      await this.server.close();

      this.logger.info('Unity MCP Server shut down successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }
}

/**
 * Main entry point for the Unity MCP Server
 */
async function main(): Promise<void> {
  const server = new UnityMCPServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  // Start the server
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start Unity MCP Server:', error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}