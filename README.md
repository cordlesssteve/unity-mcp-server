# Unity MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Unity](https://img.shields.io/badge/Unity-2022.3+-black.svg)](https://unity.com/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io/)

A Model Context Protocol (MCP) server for Unity Editor integration, allowing AI assistants to interact with Unity projects through natural language commands.

## What is Unity MCP Server?

Unity MCP Server provides an interface between AI assistants (like Claude Code) and Unity Editor, enabling automated Unity operations through conversational commands. Instead of manually executing Unity tasks, you can describe what you want to accomplish.

## Current Status

**Early Development** - This is a prototype project currently in the planning and initial development phase. The core MCP server foundation is being built, with Unity integration features planned for future releases.

## Planned Features

### Core Integration
- Unity project connection and communication
- Basic asset management operations
- Scene manipulation through MCP commands
- Build automation for supported platforms

### Development Tools
- Script generation and modification
- Component creation and configuration
- Testing integration support
- Project organization utilities

### Natural Language Interface
- Convert common Unity tasks to conversational commands
- Context-aware command interpretation
- Project-specific operation suggestions

## Installation

```bash
npm install -g unity-mcp-server
```

### Unity Package (Planned)
A Unity package will be available for easy integration with Unity projects once the core server is complete.

## Basic Usage (Planned)

### Connect to Unity Project
```bash
unity-mcp connect /path/to/your/unity-project
```

### Example Commands
```
"List my scenes"
"Create a new script for card management" 
"Build for Android with release settings"
"Run unit tests and show results"
```

## Architecture

```
Unity MCP Server
├── Core Engine (TypeScript + MCP SDK)
├── Unity Integration (C# package)  
├── Command Parser (Natural language processing)
└── Context Manager (Project state and learning)
```

## Development Status

| Component | Status | Description |
|-----------|--------|-------------|
| Core Engine | In Development | MCP server foundation |
| Unity Integration | Planned | Unity package and bridge |
| Asset Management | Planned | Asset operations and optimization |
| Build Automation | Planned | Cross-platform build system |
| Code Generation | Planned | Script creation and modification |
| Testing Integration | Planned | Automated testing workflows |

## Example Use Case

This project was inspired by development work on **Invariant**, a physics-based card game. Common tasks like creating ScriptableObjects for card data, setting up physics interactions, and managing build configurations could benefit from AI assistance.

## Why Unity MCP Server?

### Current Problems
- Unity workflows involve many repetitive manual steps
- Context switching between planning and implementation
- Inconsistent project organization across team members
- Time-consuming build and deployment processes

### Proposed Solutions  
- Automate routine Unity operations through conversation
- Maintain consistent project structure and best practices
- Reduce time spent on boilerplate code and setup
- Enable rapid prototyping and iteration

## Development Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project setup and core architecture
- [ ] Basic MCP server implementation
- [ ] Unity project detection and connection
- [ ] Simple command parsing

### Phase 2: Core Features (Weeks 5-8)
- [ ] Asset management operations
- [ ] Scene manipulation tools
- [ ] Build system integration
- [ ] Error handling and validation

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Code generation capabilities
- [ ] Testing framework integration
- [ ] Performance monitoring tools
- [ ] Documentation and examples

### Phase 4: Polish and Release (Weeks 13-16)
- [ ] Unity Asset Store preparation
- [ ] Community documentation
- [ ] Performance optimization
- [ ] Public beta release

## Contributing

Contributions welcome! This project is in early development, so there are many opportunities to help shape the direction.

- Check the [Issues](https://github.com/cordlesssteve/unity-mcp-server/issues) for tasks
- Review the [Contributing Guide](./CONTRIBUTING.md) for development setup
- Join discussions about features and implementation approaches

## Documentation

- [API Documentation](./docs/api/) (Coming Soon)
- [User Guides](./docs/guides/) (Coming Soon)  
- [Examples](./examples/) (Coming Soon)
- [Plugin Development](./docs/guides/plugin-development.md) (Coming Soon)

## Requirements

- Node.js 18+ for the MCP server
- Unity 2022.3+ for Unity integration
- TypeScript knowledge for contributing to the server
- C# knowledge for Unity package development

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Unity Technologies for creating Unity Editor
- Model Context Protocol for enabling AI tool integration  
- The Unity developer community for inspiration and feedback
- Invariant card game project for real-world testing scenarios

---

**Note**: This project is in active development. Features and timelines may change based on development progress and community feedback.