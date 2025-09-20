/**
 * Unity-specific types and interfaces for the MCP server
 */

/** Unity project connection information */
export interface UnityConnection {
  projectPath: string;
  unityVersion: string;
  editorPID?: number;
  status: 'connected' | 'disconnected' | 'error';
  lastHeartbeat: Date;
  targetPlatform: string;
  projectName: string;
}

/** Unity project information */
export interface UnityProjectInfo {
  projectPath: string;
  projectName: string;
  unityVersion: string;
  targetPlatform: string;
  scenes: SceneInfo[];
  lastModified: string;
}

/** Unity scene information */
export interface SceneInfo {
  path: string;
  name: string;
  isInBuild: boolean;
  buildIndex?: number;
  lastModified: string;
}

/** Unity asset information */
export interface AssetInfo {
  path: string;
  name: string;
  type: string;
  guid: string;
  size: number;
  lastModified: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

/** Unity build target platforms */
export type BuildTarget =
  | 'Win64'
  | 'OSX'
  | 'Linux64'
  | 'iOS'
  | 'Android'
  | 'WebGL'
  | 'Switch'
  | 'PS4'
  | 'PS5'
  | 'XboxOne'
  | 'GameCoreXboxSeries';

/** Unity build configuration */
export interface BuildConfig {
  target: BuildTarget;
  buildPath: string;
  development: boolean;
  scriptingBackend?: 'Mono' | 'IL2CPP';
  defineSymbols?: string[];
  scenes?: string[];
}

/** Unity build result */
export interface BuildResult {
  success: boolean;
  buildPath: string;
  duration: number;
  warnings: string[];
  errors: string[];
  outputSize: number;
  buildLog: string;
}

/** Unity compilation state */
export interface CompilationState {
  isCompiling: boolean;
  lastCompilation: Date;
  errors: CompilationError[];
  warnings: CompilationWarning[];
}

/** Unity compilation error */
export interface CompilationError {
  file: string;
  line: number;
  column: number;
  message: string;
  type: 'error' | 'warning';
}

/** Unity compilation warning */
export interface CompilationWarning {
  file: string;
  line: number;
  column: number;
  message: string;
}

/** Unity play mode states */
export type PlayModeState = 'Stopped' | 'Playing' | 'Paused';

/** Unity editor events */
export interface UnityEvent {
  type: 'compilation' | 'asset_change' | 'play_mode' | 'scene_change' | 'build_complete';
  timestamp: Date;
  data: any;
  projectPath: string;
}

/** Unity event handlers */
export type UnityEventHandler = (event: UnityEvent) => Promise<void> | void;

/** Unity MCP error codes */
export enum UnityMCPErrorCode {
  // Connection errors (4000-4099)
  UNITY_NOT_FOUND = 4000,
  PROJECT_NOT_FOUND = 4001,
  CONNECTION_FAILED = 4002,
  VERSION_INCOMPATIBLE = 4003,
  PROJECT_CORRUPTED = 4004,

  // Operation errors (4100-4199)
  COMPILATION_ERROR = 4100,
  BUILD_FAILED = 4101,
  ASSET_NOT_FOUND = 4102,
  INVALID_ASSET_TYPE = 4103,
  PERMISSION_DENIED = 4104,

  // State errors (4200-4299)
  UNITY_BUSY = 4200,
  PLAY_MODE_REQUIRED = 4201,
  EDIT_MODE_REQUIRED = 4202,
  PROJECT_LOCKED = 4203,

  // System errors (4300-4399)
  INSUFFICIENT_RESOURCES = 4300,
  TIMEOUT = 4301,
  UNKNOWN_ERROR = 4399
}

/** Unity MCP error */
export interface UnityMCPError extends Error {
  code: UnityMCPErrorCode;
  details?: {
    unityVersion?: string;
    projectPath?: string;
    compilationErrors?: CompilationError[];
    suggestions?: string[];
    recoveryOptions?: string[];
  };
  timestamp: Date;
}

/** Unity project status */
export interface UnityStatus {
  connections: UnityConnection[];
  activeProject: string | undefined;
  isCompiling: boolean;
  playModeState: PlayModeState;
  lastError?: string;
}

/** Unity asset creation parameters */
export interface CreateAssetParams {
  className: string;
  assetName: string;
  outputPath: string;
  properties?: Record<string, any>;
}

/** Unity component generation parameters */
export interface ComponentGenParams {
  componentName: string;
  namespace?: string;
  baseClass?: string;
  interfaces?: string[];
  properties?: PropertyDefinition[];
  methods?: MethodDefinition[];
  outputPath?: string;
}

/** Property definition for code generation */
export interface PropertyDefinition {
  name: string;
  type: string;
  serialized?: boolean;
  description?: string;
  defaultValue?: any;
}

/** Method definition for code generation */
export interface MethodDefinition {
  name: string;
  returnType?: string;
  parameters?: ParameterDefinition[];
  isOverride?: boolean;
  description?: string;
  body?: string;
}

/** Parameter definition for code generation */
export interface ParameterDefinition {
  name: string;
  type: string;
  defaultValue?: any;
}

/** Unity test results */
export interface TestResults {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  testDetails: TestDetail[];
  coverage?: CoverageInfo;
  reportPath?: string;
}

/** Individual test result */
export interface TestDetail {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  message?: string;
  stackTrace?: string;
}

/** Test coverage information */
export interface CoverageInfo {
  linesCovered: number;
  totalLines: number;
  percentage: number;
  details: CoverageDetail[];
}

/** Coverage detail for specific file */
export interface CoverageDetail {
  file: string;
  linesCovered: number;
  totalLines: number;
  percentage: number;
}