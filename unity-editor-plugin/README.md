# Unity MCP Integration Plugin

This Unity Editor plugin enables real-time communication between Unity Editor and the Unity MCP Server.

## Installation

1. Copy the entire `Assets/Editor/MCPIntegration/` folder to your Unity project
2. Ensure you have Newtonsoft.Json package installed in Unity:
   - Window > Package Manager > Unity Registry > Newtonsoft Json

## Features

### Real Unity Editor Integration
- **Named Pipe Communication**: Secure IPC between Unity and MCP Server
- **Real-time State Monitoring**: Live Unity Editor state updates
- **Unity Editor Control**: Remote control of play mode, scene loading, etc.
- **Event Broadcasting**: Unity Editor events streamed to MCP Server

### Supported Commands
- `ping` - Test connection and get Unity version
- `get_state` - Get current Unity Editor state
- `enter_play_mode` - Start Unity play mode
- `exit_play_mode` - Stop Unity play mode
- `load_scene` - Load a specific scene
- `refresh_assets` - Refresh Unity asset database

### Real-time Events
- Play mode state changes
- Scene loading/switching
- Hierarchy changes
- Assembly reloads

## Technical Details

### Communication Protocol
- **Named Pipes**: `unity-mcp-{projectHash}` where projectHash is based on project path
- **Message Format**: JSON with command/response structure
- **Async Communication**: Non-blocking Unity Editor integration

### Unity Editor Integration
- Automatic initialization when Unity starts
- Graceful shutdown on assembly reload
- Main thread dispatching for Unity API calls
- Comprehensive error handling and logging

## Usage with MCP Server

Once installed, the plugin will:
1. Automatically start when Unity Editor opens
2. Create a named pipe for communication
3. Wait for MCP Server connection
4. Provide real Unity Editor state and control

The MCP Server will detect and connect to running Unity instances automatically.

## Debugging

Check Unity Console for MCP Bridge log messages:
- `[MCP Bridge] Initializing...` - Plugin starting
- `[MCP Bridge] MCP server connected!` - Successful connection
- `[MCP Bridge] Received command: ...` - Command processing

## Compatibility

- Unity 2020.3 LTS or newer
- Windows, macOS, Linux
- Requires Newtonsoft.Json package