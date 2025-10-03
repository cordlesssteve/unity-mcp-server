# Unity MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Unity](https://img.shields.io/badge/Unity-2022.3+-black.svg)](https://unity.com/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io/)

A Model Context Protocol (MCP) server that enables Large Language Models to interact smoothly with Unity's developer interface for streamlined game development workflows.

## What is Unity MCP Server?

Unity MCP Server bridges the gap between AI assistants (like Claude Code) and Unity Editor, allowing LLMs to perform Unity operations through natural language commands. This creates a more intuitive development experience where you can describe what you want to accomplish rather than manually navigating Unity's interface.

### The Problem
- Unity development involves many repetitive manual operations
- Context switching between planning, implementation, and Unity interface
- Complex workflows that could benefit from AI assistance
- Time spent on boilerplate setup and configuration tasks

### The Solution
Enable LLMs to directly interact with Unity Editor through:
- Natural language commands that translate to Unity operations
- Automated workflow execution based on conversational instructions
- AI-driven project setup, asset management, and build processes
- Seamless integration between development planning and execution

## Current Status

**Early Development** - This is a prototype project currently in the planning and initial development phase. The core MCP server foundation is being built, with Unity integration features planned for future releases.

## Planned Features

### LLM-Unity Integration
- Direct LLM communication with Unity Editor
- Natural language to Unity command translation
- Context-aware operation interpretation
- Conversational project management

### Core Unity Operations
- Scene manipulation and management
- Asset creation, import, and organization  
- Component setup and configuration
- Build automation for multiple platforms

### AI-Driven Workflows
- Intelligent project scaffolding
- Automated testing and validation
- Performance optimization suggestions
- Code generation and script templates

## Installation

```bash
npm install -g unity-mcp-server
```

### Unity Package (Planned)
A Unity package will be required to enable the bridge between this MCP server and Unity Editor, allowing seamless LLM interaction with Unity's developer interface.

## Usage Examples (Planned)

### Natural Language Unity Operations
```
"Create a new scene for the main menu"
"Add a camera controller script to the main camera"
"Set up physics materials for the card objects"
"Build the game for Android with release settings"
"Run all unit tests and show me any failures"
```

### Conversational Workflow
```
You: "I need to set up a card game scene"
Unity MCP: "Creating new scene 'CardGame'... 
           Added main camera with controller...
           Created card spawn points...
           Set up lighting for card visibility...
           Scene ready. What card mechanics should I implement?"
```

## Architecture

```
Unity MCP Server
├── LLM Interface (Natural language processing)
├── Unity Bridge (C# package for Editor communication)  
├── Command Interpreter (Converts requests to Unity operations)
├── Context Manager (Maintains project state and history)
└── Workflow Engine (Handles complex multi-step operations)
```

## Development Status

| Component | Status | Description |
|-----------|--------|-------------|
| MCP Core | In Development | Basic MCP server implementation |
| LLM Interface | Planned | Natural language command processing |
| Unity Bridge | Planned | Unity Editor communication package |
| Command Interpreter | Planned | Language to operation translation |
| Asset Management | Planned | File and resource operations |
| Build Automation | Planned | Multi-platform build system |
| Workflow Engine | Planned | Complex operation orchestration |

## Real-World Use Case

This project was inspired by development work on **Invariant**, a physics-based card game. Common workflows like:
- Setting up card physics interactions
- Creating ScriptableObjects for card data
- Configuring build settings for different platforms
- Managing scene transitions and UI elements

These tasks could be significantly streamlined through conversational AI interaction with Unity.

## Why Enable LLM-Unity Integration?

### Benefits for Developers
- **Reduced Context Switching**: Stay in conversation flow rather than switching to Unity UI
- **Faster Prototyping**: Quickly set up game elements through natural language
- **Automated Best Practices**: AI ensures proper Unity conventions and optimization
- **Learning Acceleration**: Interactive guidance for Unity development patterns

### Use Cases
- **Solo Developers**: AI assistant for Unity best practices and productivity
- **Development Teams**: Standardized workflows and collaboration patterns
- **Educators**: Interactive Unity teaching and student project guidance
- **Rapid Prototyping**: Quick game concept validation and iteration

## Development Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Core MCP server implementation
- [ ] Basic Unity Editor detection and connection
- [ ] Simple command parsing and validation
- [ ] Unity package framework setup

### Phase 2: Basic LLM Integration (Weeks 5-8)
- [ ] Natural language command interpretation
- [ ] Basic Unity operations (scene, asset management)
- [ ] Error handling and user feedback
- [ ] Documentation and examples

### Phase 3: Advanced Workflows (Weeks 9-12)
- [ ] Complex multi-step operations
- [ ] Build system integration
- [ ] Performance monitoring and optimization
- [ ] Advanced scripting and code generation

### Phase 4: Polish and Release (Weeks 13-16)
- [ ] Community feedback integration
- [ ] Performance optimization
- [ ] Comprehensive documentation
- [ ] Public release and Unity Asset Store submission

## Contributing

Contributions welcome! This project is in early development, so there are opportunities to help shape how LLMs interact with Unity.

- Check [Issues](https://github.com/cordlesssteve/unity-mcp-server/issues) for development tasks
- Review [Contributing Guide](./CONTRIBUTING.md) for setup instructions
- Join discussions about LLM-Unity interaction patterns

## Requirements

- Node.js 18+ for the MCP server
- Unity 2022.3+ for Editor integration
- TypeScript knowledge for server development
- C# knowledge for Unity package development

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Unity Technologies for Unity Editor and extensibility APIs
- Model Context Protocol for enabling AI tool integration
- The Unity developer community for workflow insights and feedback
- Invariant card game project for real-world development scenarios

---

**Note**: This project is in active development. The goal is to create smooth LLM interaction with Unity's developer interface to enhance game development workflows.