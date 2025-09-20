/**
 * Unity MCP Server - Core Package
 *
 * Main exports for the Unity MCP server core functionality
 */

// Main server class
export { UnityMCPServer } from './server.js';

// Connection management
export { UnityConnectionManager } from './connection/connection-manager.js';

// Tool system
export { UnityToolRegistry } from './tools/tool-registry.js';
export { UnityConnectionTool, UnityDisconnectTool, UnityDiscoverTool } from './tools/connection-tools.js';
export { UnityStatusTool, UnityProjectInfoTool } from './tools/status-tools.js';

// Context and memory
export { ProjectContextManager } from './context/context-manager.js';

// Security
export { SecurityManager } from './security/security-manager.js';

// Utilities
export { Logger } from './utils/logger.js';

// Types
export type * from './types/unity.js';
export type * from './types/mcp.js';

// Re-export commonly used types from MCP SDK
export type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';