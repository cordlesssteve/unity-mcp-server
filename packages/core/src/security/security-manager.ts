/**
 * Security Manager
 *
 * Handles security validation and audit logging for Unity MCP operations
 */

import * as path from 'path';
import type { SecurityPolicy, AuditLogEntry, Logger } from '../types/mcp.js';

/**
 * Manages security policies and audit logging
 */
export class SecurityManager {
  private policy: SecurityPolicy;
  private auditLog: AuditLogEntry[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child('SecurityManager');
    this.policy = this.getDefaultPolicy();
  }

  /**
   * Initialize the security manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Security Manager...');

    // Load security policy (from config file in production)
    await this.loadSecurityPolicy();

    this.logger.info('Security Manager initialized');
  }

  /**
   * Validate a tool call against security policies
   */
  async validateToolCall(toolName: string, params: Record<string, any>): Promise<void> {
    this.logger.debug(`Validating tool call: ${toolName}`);

    try {
      // Check if operation is allowed
      if (!this.policy.allowedOperations.includes(toolName) && !this.policy.allowedOperations.includes('*')) {
        throw new Error(`Operation not allowed: ${toolName}`);
      }

      // Validate file paths
      await this.validateFilePaths(params);

      // Check if approval is required
      if (this.policy.requireApprovalFor.includes(toolName)) {
        await this.requestApproval(toolName, params);
      }

      // Rate limiting check
      await this.checkRateLimit();

      // Log the validation
      if (this.policy.enableAuditLogging) {
        await this.logAuditEntry({
          timestamp: new Date(),
          operation: toolName,
          projectPath: params.projectPath || 'unknown',
          parameters: params,
          result: 'success',
        });
      }

      this.logger.debug(`Tool call validated successfully: ${toolName}`);
    } catch (error) {
      // Log security violation
      if (this.policy.enableAuditLogging) {
        await this.logAuditEntry({
          timestamp: new Date(),
          operation: toolName,
          projectPath: params.projectPath || 'unknown',
          parameters: params,
          result: 'failure',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Security validation failed for ${toolName}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Validate file paths against security restrictions
   */
  private async validateFilePaths(params: Record<string, any>): Promise<void> {
    const pathParams = ['projectPath', 'outputPath', 'assetPath', 'buildPath', 'searchPath'];

    for (const paramName of pathParams) {
      const filePath = params[paramName];
      if (filePath && typeof filePath === 'string') {
        await this.validateSinglePath(filePath, paramName);
      }
    }
  }

  /**
   * Validate a single file path
   */
  private async validateSinglePath(filePath: string, paramName: string): Promise<void> {
    // Normalize the path
    const normalizedPath = path.resolve(filePath);

    // Check for path traversal attacks
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new Error(`Path traversal detected in ${paramName}: ${filePath}`);
    }

    // Check against restricted paths
    for (const restrictedPath of this.policy.projectPathRestrictions) {
      if (normalizedPath.startsWith(restrictedPath)) {
        throw new Error(`Access denied to restricted path in ${paramName}: ${filePath}`);
      }
    }

    // Ensure path is within allowed directories (if restrictions are defined)
    if (this.policy.projectPathRestrictions.length > 0) {
      const isAllowed = this.policy.projectPathRestrictions.some(allowedPath =>
        normalizedPath.startsWith(allowedPath)
      );

      if (!isAllowed) {
        throw new Error(`Path not in allowed directories for ${paramName}: ${filePath}`);
      }
    }
  }

  /**
   * Request user approval for sensitive operations
   */
  private async requestApproval(toolName: string, _params: Record<string, any>): Promise<void> {
    // In a full implementation, this would:
    // 1. Show a user prompt/dialog
    // 2. Wait for user confirmation
    // 3. Log the approval decision

    this.logger.warn(`Operation requires approval: ${toolName} (auto-approved for development)`);
    // For development, we'll auto-approve
    // In production, this should prompt the user
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    // Simple rate limiting implementation
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Count recent requests
    const recentRequests = this.auditLog.filter(
      entry => now - entry.timestamp.getTime() < oneMinute
    ).length;

    if (recentRequests >= this.policy.maxRequestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${recentRequests} requests in the last minute`);
    }
  }

  /**
   * Log an audit entry
   */
  private async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    this.auditLog.push(entry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // In production, this should also write to a persistent audit log
    this.logger.info('Audit log entry', {
      operation: entry.operation,
      result: entry.result,
      projectPath: entry.projectPath,
    });
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filter?: {
    operation?: string;
    projectPath?: string;
    result?: 'success' | 'failure' | 'error';
    since?: Date;
  }): AuditLogEntry[] {
    let filteredLog = this.auditLog;

    if (filter) {
      filteredLog = filteredLog.filter(entry => {
        if (filter.operation && entry.operation !== filter.operation) return false;
        if (filter.projectPath && entry.projectPath !== filter.projectPath) return false;
        if (filter.result && entry.result !== filter.result) return false;
        if (filter.since && entry.timestamp < filter.since) return false;
        return true;
      });
    }

    return filteredLog.slice(); // Return a copy
  }

  /**
   * Load security policy from configuration
   */
  private async loadSecurityPolicy(): Promise<void> {
    // In production, this would load from a configuration file
    // For now, use the default policy
    this.policy = this.getDefaultPolicy();
  }

  /**
   * Get default security policy
   */
  private getDefaultPolicy(): SecurityPolicy {
    return {
      allowedOperations: [
        // Connection operations
        'unity_connect',
        'unity_disconnect',
        'unity_status',
        'unity_discover_projects',
        'unity_project_info',

        // Asset operations
        'unity_list_assets',
        'unity_create_scriptable_object',
        'unity_update_asset',

        // Build operations
        'unity_build_project',
        'unity_get_build_settings',

        // Code generation
        'unity_generate_component',
        'unity_generate_manager',

        // Testing
        'unity_run_tests',
        'unity_generate_test',

        // Analysis
        'unity_analyze_project',
        'unity_suggest_optimization',
      ],
      projectPathRestrictions: [
        // Allow access to common project directories
        // In production, this should be more restrictive
      ],
      requireApprovalFor: [
        // Operations that require user approval
        'unity_build_project',
        'unity_update_asset',
      ],
      maxRequestsPerMinute: 60,
      enableAuditLogging: true,
    };
  }

  /**
   * Update security policy
   */
  async updatePolicy(newPolicy: Partial<SecurityPolicy>): Promise<void> {
    this.policy = { ...this.policy, ...newPolicy };
    this.logger.info('Security policy updated');
  }

  /**
   * Get current security policy
   */
  getPolicy(): SecurityPolicy {
    return { ...this.policy }; // Return a copy
  }
}