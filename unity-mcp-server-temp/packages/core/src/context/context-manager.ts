/**
 * Project Context Manager
 *
 * Manages project context, memory, and learning for Unity development
 */

import * as path from 'path';
import Database from 'better-sqlite3';

import type { ProjectContext, MCPCommand, Logger } from '../types/mcp.js';

/**
 * Manages project context and learning data
 */
export class ProjectContextManager {
  private db: Database.Database | null = null;
  private contexts = new Map<string, ProjectContext>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child('ContextManager');
  }

  /**
   * Initialize the context manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Project Context Manager...');

    try {
      // Initialize SQLite database for persistent context storage
      const dbPath = path.join(process.cwd(), 'unity-mcp-context.db');
      this.db = new Database(dbPath);

      // Create tables for context storage
      this.createTables();

      this.logger.info('Project Context Manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Project Context Manager', error);
      throw error;
    }
  }

  /**
   * Create database tables for context storage
   */
  private createTables(): void {
    if (!this.db) return;

    // Project contexts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_contexts (
        project_path TEXT PRIMARY KEY,
        unity_version TEXT,
        last_accessed TEXT,
        context_data TEXT
      )
    `);

    // Command history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_path TEXT,
        timestamp TEXT,
        command TEXT,
        parameters TEXT,
        result TEXT,
        duration INTEGER,
        FOREIGN KEY (project_path) REFERENCES project_contexts (project_path)
      )
    `);

    // Performance metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_path TEXT,
        timestamp TEXT,
        metric_type TEXT,
        value REAL,
        metadata TEXT,
        FOREIGN KEY (project_path) REFERENCES project_contexts (project_path)
      )
    `);

    this.logger.debug('Database tables created successfully');
  }

  /**
   * Load project context
   */
  async loadContext(projectPath: string): Promise<ProjectContext> {
    this.logger.debug(`Loading context for project: ${projectPath}`);

    // Check in-memory cache first
    let context = this.contexts.get(projectPath);
    if (context) {
      context.lastAccessed = new Date();
      return context;
    }

    // Load from database
    context = await this.loadFromDatabase(projectPath);
    if (!context) {
      // Create new context
      context = await this.initializeNewContext(projectPath);
    }

    // Cache in memory
    this.contexts.set(projectPath, context);
    return context;
  }

  /**
   * Save project context
   */
  async saveContext(projectPath: string, context: ProjectContext): Promise<void> {
    this.logger.debug(`Saving context for project: ${projectPath}`);

    try {
      // Update in-memory cache
      this.contexts.set(projectPath, context);

      // Save to database
      await this.saveToDatabase(projectPath, context);
    } catch (error) {
      this.logger.error(`Failed to save context for ${projectPath}`, error);
      throw error;
    }
  }

  /**
   * Record a command execution
   */
  async recordCommand(projectPath: string, command: MCPCommand, result: any): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO command_history (project_path, timestamp, command, parameters, result, duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        projectPath,
        new Date().toISOString(),
        command.method,
        JSON.stringify(command.params),
        JSON.stringify(result),
        0 // Duration would be calculated by caller
      );

      // Update project context with learning data
      const context = await this.loadContext(projectPath);
      await this.updateLearningFromCommand(context, command, result);
      await this.saveContext(projectPath, context);
    } catch (error) {
      this.logger.error(`Failed to record command for ${projectPath}`, error);
    }
  }

  /**
   * Record performance metrics
   */
  async recordPerformanceMetric(
    projectPath: string,
    metricType: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO performance_metrics (project_path, timestamp, metric_type, value, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        projectPath,
        new Date().toISOString(),
        metricType,
        value,
        metadata ? JSON.stringify(metadata) : null
      );
    } catch (error) {
      this.logger.error(`Failed to record performance metric for ${projectPath}`, error);
    }
  }

  /**
   * Get command history for a project
   */
  async getCommandHistory(projectPath: string, limit = 100): Promise<any[]> {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM command_history
        WHERE project_path = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      return stmt.all(projectPath, limit);
    } catch (error) {
      this.logger.error(`Failed to get command history for ${projectPath}`, error);
      return [];
    }
  }

  /**
   * Load context from database
   */
  private async loadFromDatabase(projectPath: string): Promise<ProjectContext | null> {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM project_contexts WHERE project_path = ?');
      const row = stmt.get(projectPath);

      if (!row) return null;

      const contextData = JSON.parse(row.context_data);
      return {
        ...contextData,
        lastAccessed: new Date(row.last_accessed),
      };
    } catch (error) {
      this.logger.error(`Failed to load context from database for ${projectPath}`, error);
      return null;
    }
  }

  /**
   * Save context to database
   */
  private async saveToDatabase(projectPath: string, context: ProjectContext): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO project_contexts (project_path, unity_version, last_accessed, context_data)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        projectPath,
        context.unityVersion,
        context.lastAccessed.toISOString(),
        JSON.stringify(context)
      );
    } catch (error) {
      this.logger.error(`Failed to save context to database for ${projectPath}`, error);
      throw error;
    }
  }

  /**
   * Initialize a new project context
   */
  private async initializeNewContext(projectPath: string): Promise<ProjectContext> {
    this.logger.debug(`Initializing new context for project: ${projectPath}`);

    const context: ProjectContext = {
      projectPath,
      unityVersion: 'unknown',
      lastAccessed: new Date(),
      compilationState: {
        isCompiling: false,
        lastCompilation: new Date(),
        errors: [],
        warnings: [],
      },
      architecture: {
        designPatterns: [],
        namingConventions: [],
        folderStructure: {},
        codeStyle: {},
      },
      performance: {
        buildTimes: [],
        playModeStartup: [],
        memoryUsage: [],
        frameRates: [],
      },
      developer: {
        preferredPatterns: [],
        workingHours: [],
        productivityMetrics: {},
        customTemplates: [],
      },
    };

    return context;
  }

  /**
   * Update learning data from command execution
   */
  private async updateLearningFromCommand(
    context: ProjectContext,
    command: MCPCommand,
    result: any
  ): Promise<void> {
    // Update developer preferences based on command usage
    if (command.method.startsWith('unity_generate_')) {
      // Track code generation preferences
      if (command.params.namespace) {
        this.updateArrayUnique(context.architecture.namingConventions, command.params.namespace);
      }
    }

    if (command.method === 'unity_build_project') {
      // Track build preferences
      if (command.params.target) {
        this.updateArrayUnique(context.developer.preferredPatterns, `build_target:${command.params.target}`);
      }
    }

    // Track working patterns
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      this.updateArrayUnique(context.developer.preferredPatterns, 'works_business_hours');
    }
  }

  /**
   * Update array with unique values (helper method)
   */
  private updateArrayUnique(array: string[], value: string): void {
    if (!array.includes(value)) {
      array.push(value);
      // Keep only last 20 items to prevent infinite growth
      if (array.length > 20) {
        array.shift();
      }
    }
  }

  /**
   * Shutdown the context manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Project Context Manager...');

    try {
      // Save all in-memory contexts
      for (const [projectPath, context] of this.contexts) {
        await this.saveContext(projectPath, context);
      }

      // Close database
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      this.logger.info('Project Context Manager shut down');
    } catch (error) {
      this.logger.error('Error during context manager shutdown', error);
    }
  }
}