/**
 * Unity Tool Registry
 *
 * Manages and executes Unity MCP tools
 */

import type { UnityTool, MCPCommand, Logger } from '../types/mcp.js';
import { UnityConnectionTool } from './connection-tools.js';
import { UnityStatusTool } from './status-tools.js';

/**
 * Registry for Unity MCP tools
 */
export class UnityToolRegistry {
  private tools = new Map<string, UnityTool>();
  private toolHandlers = new Map<string, (command: MCPCommand) => Promise<any>>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child('ToolRegistry');
  }

  /**
   * Initialize the tool registry with built-in tools
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Unity Tool Registry...');

    // Register built-in tools
    await this.registerBuiltinTools();

    this.logger.info(`Registered ${this.tools.size} Unity tools`);
  }

  /**
   * Register built-in Unity tools
   */
  private async registerBuiltinTools(): Promise<void> {
    // Connection management tools
    const connectionTool = new UnityConnectionTool(this.logger);
    await this.registerTool(connectionTool.getTool(), connectionTool.execute.bind(connectionTool));

    // Status tools
    const statusTool = new UnityStatusTool(this.logger);
    await this.registerTool(statusTool.getTool(), statusTool.execute.bind(statusTool));
  }

  /**
   * Register a new tool
   */
  async registerTool(tool: UnityTool, handler: (command: MCPCommand) => Promise<any>): Promise<void> {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);

    this.logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  async unregisterTool(toolName: string): Promise<void> {
    if (!this.tools.has(toolName)) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    this.tools.delete(toolName);
    this.toolHandlers.delete(toolName);

    this.logger.debug(`Unregistered tool: ${toolName}`);
  }

  /**
   * Get a tool by name
   */
  getTool(toolName: string): UnityTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): UnityTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): UnityTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Execute a command using the appropriate tool
   */
  async executeCommand(command: MCPCommand): Promise<any> {
    const handler = this.toolHandlers.get(command.method);
    if (!handler) {
      throw new Error(`No handler found for command: ${command.method}`);
    }

    const tool = this.tools.get(command.method);
    if (!tool) {
      throw new Error(`Tool not found: ${command.method}`);
    }

    this.logger.debug(`Executing tool: ${command.method}`, { params: command.params });

    try {
      const result = await handler(command);
      this.logger.debug(`Tool execution completed: ${command.method}`);
      return result;
    } catch (error) {
      this.logger.error(`Tool execution failed: ${command.method}`, error);
      throw error;
    }
  }

  /**
   * Validate command parameters against tool schema
   */
  validateCommand(command: MCPCommand): void {
    const tool = this.tools.get(command.method);
    if (!tool) {
      throw new Error(`Tool not found: ${command.method}`);
    }

    // TODO: Implement JSON schema validation
    // This would validate command.params against tool.inputSchema
  }
}