/**
 * MCP protocol extensions and types for Unity integration
 */

import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { UnityConnection, UnityEvent } from './unity.js';

/** Extended MCP message with Unity context */
export interface UnityMCPMessage {
  id: string;
  method: string;
  params: Record<string, any>;
  unity?: {
    projectPath: string;
    unityVersion: string;
    editorMode: 'edit' | 'play';
    targetPlatform: string;
  };
}

/** Unity-specific MCP tool */
export interface UnityTool extends Tool {
  unityVersion?: string;
  requiresPlayMode?: boolean;
  affectsAssets?: boolean;
  builtin?: boolean;
  category: 'connection' | 'asset' | 'build' | 'code' | 'test' | 'analysis';
}

/** Unity-specific MCP resource */
export interface UnityResource extends Resource {
  assetType: 'scene' | 'prefab' | 'scriptable_object' | 'script' | 'material' | 'texture' | 'project';
  guid?: string;
  dependencies?: string[];
  unityVersion?: string;
}

/** MCP command request */
export interface MCPCommand {
  id: string;
  method: string;
  params: Record<string, any>;
  requiresUnity: boolean;
  timeout?: number;
}

/** MCP command response */
export interface MCPResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/** Plugin capability definition */
export interface PluginCapability {
  name: string;
  description: string;
  commands: string[];
  events: string[];
}

/** Plugin configuration */
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
}

/** Plugin context provided to plugins */
export interface PluginContext {
  unityConnection: UnityConnection;
  logger: import('../utils/logger.js').Logger;
  database: Database;
  eventEmitter: EventEmitter;
}

/** Logger interface - reference to actual Logger class */
export type { Logger } from '../utils/logger.js';

/** Database interface */
export interface Database {
  get(query: string, params?: any[]): any;
  all(query: string, params?: any[]): any[];
  run(query: string, params?: any[]): void;
  prepare(query: string): PreparedStatement;
}

/** Prepared statement interface */
export interface PreparedStatement {
  get(params?: any[]): any;
  all(params?: any[]): any[];
  run(params?: any[]): void;
}

/** Event emitter interface */
export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}

/** Unity plugin interface */
export interface UnityPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly capabilities: PluginCapability[];
  readonly dependencies: string[];

  // Lifecycle methods
  init(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;

  // Command handling
  canHandle(command: MCPCommand): boolean;
  handleCommand(command: MCPCommand): Promise<any>;

  // Event handling
  onUnityEvent?(event: UnityEvent): Promise<void>;

  // Configuration
  getConfig(): PluginConfig;
  setConfig(config: Partial<PluginConfig>): Promise<void>;
}

/** Security policy configuration */
export interface SecurityPolicy {
  allowedOperations: string[];
  projectPathRestrictions: string[];
  requireApprovalFor: string[];
  maxRequestsPerMinute: number;
  enableAuditLogging: boolean;
}

/** Audit log entry */
export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  operation: string;
  projectPath: string;
  parameters: Record<string, any>;
  result: 'success' | 'failure' | 'error';
  error?: string;
}

/** Project context for memory and learning */
export interface ProjectContext {
  projectPath: string;
  unityVersion: string;
  lastAccessed: Date;
  compilationState: {
    isCompiling: boolean;
    lastCompilation: Date;
    errors: any[];
    warnings: any[];
  };
  architecture: {
    designPatterns: string[];
    namingConventions: string[];
    folderStructure: Record<string, string[]>;
    codeStyle: Record<string, any>;
  };
  performance: {
    buildTimes: Array<{ timestamp: Date; duration: number }>;
    playModeStartup: Array<{ timestamp: Date; duration: number }>;
    memoryUsage: Array<{ timestamp: Date; usage: number }>;
    frameRates: Array<{ timestamp: Date; fps: number }>;
  };
  developer: {
    preferredPatterns: string[];
    workingHours: Array<{ start: string; end: string }>;
    productivityMetrics: Record<string, number>;
    customTemplates: Array<{ name: string; content: string }>;
  };
}