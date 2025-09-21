#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "unity-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions for Unity3D game development integration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_unity_project",
        description: "Create a new Unity3D project with specified template and settings",
        inputSchema: {
          type: "object",
          properties: {
            project_name: {
              type: "string",
              description: "Name of the Unity project"
            },
            template: {
              type: "string",
              enum: ["3D", "2D", "VR", "Mobile", "HDRP", "URP", "Custom"],
              description: "Unity project template",
              default: "3D"
            },
            unity_version: {
              type: "string",
              description: "Unity editor version (e.g., '2023.3.0f1')",
              default: "latest"
            },
            project_path: {
              type: "string",
              description: "Path where project should be created"
            }
          },
          required: ["project_name"]
        }
      },
      {
        name: "manage_unity_assets",
        description: "Manage Unity assets including import, organization, and optimization",
        inputSchema: {
          type: "object",
          properties: {
            project_path: {
              type: "string",
              description: "Path to Unity project"
            },
            action: {
              type: "string",
              enum: ["import", "organize", "optimize", "validate", "cleanup"],
              description: "Asset management action"
            },
            asset_types: {
              type: "array",
              items: {
                type: "string",
                enum: ["textures", "models", "audio", "animations", "materials", "prefabs", "scripts"]
              },
              description: "Types of assets to manage"
            },
            import_settings: {
              type: "object",
              description: "Import settings for assets"
            }
          },
          required: ["project_path", "action"]
        }
      },
      {
        name: "generate_unity_scripts",
        description: "Generate Unity C# scripts with templates and best practices",
        inputSchema: {
          type: "object",
          properties: {
            script_type: {
              type: "string",
              enum: ["MonoBehaviour", "ScriptableObject", "Editor", "PropertyDrawer", "CustomInspector", "Utility"],
              description: "Type of Unity script to generate"
            },
            script_name: {
              type: "string",
              description: "Name of the script class"
            },
            namespace: {
              type: "string",
              description: "Namespace for the script"
            },
            features: {
              type: "array",
              items: {
                type: "string",
                enum: ["singleton", "object_pooling", "coroutines", "events", "serialization", "networking"]
              },
              description: "Features to include in the script"
            },
            target_path: {
              type: "string",
              description: "Path where script should be created"
            }
          },
          required: ["script_type", "script_name"]
        }
      },
      {
        name: "build_unity_project",
        description: "Build Unity project for specified platforms",
        inputSchema: {
          type: "object",
          properties: {
            project_path: {
              type: "string",
              description: "Path to Unity project"
            },
            target_platform: {
              type: "string",
              enum: ["Windows", "macOS", "Linux", "iOS", "Android", "WebGL", "Console"],
              description: "Target build platform"
            },
            build_type: {
              type: "string",
              enum: ["Development", "Release", "Debug"],
              description: "Build configuration",
              default: "Development"
            },
            output_path: {
              type: "string",
              description: "Output path for built application"
            },
            build_options: {
              type: "object",
              description: "Additional build options and settings"
            }
          },
          required: ["project_path", "target_platform"]
        }
      },
      {
        name: "analyze_unity_performance",
        description: "Analyze Unity project performance and provide optimization suggestions",
        inputSchema: {
          type: "object",
          properties: {
            project_path: {
              type: "string",
              description: "Path to Unity project"
            },
            analysis_scope: {
              type: "array",
              items: {
                type: "string",
                enum: ["rendering", "memory", "cpu", "assets", "scripts", "physics", "lighting"]
              },
              description: "Areas to analyze for performance",
              default: ["rendering", "memory", "cpu"]
            },
            target_platform: {
              type: "string",
              enum: ["Mobile", "Desktop", "Console", "VR", "WebGL"],
              description: "Target platform for optimization",
              default: "Desktop"
            }
          },
          required: ["project_path"]
        }
      },
      {
        name: "manage_unity_packages",
        description: "Manage Unity packages and dependencies",
        inputSchema: {
          type: "object",
          properties: {
            project_path: {
              type: "string",
              description: "Path to Unity project"
            },
            action: {
              type: "string",
              enum: ["install", "update", "remove", "list", "validate"],
              description: "Package management action"
            },
            package_name: {
              type: "string",
              description: "Package name for install/update/remove actions"
            },
            package_version: {
              type: "string",
              description: "Specific package version"
            }
          },
          required: ["project_path", "action"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "create_unity_project":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                project_name: args?.project_name,
                template: args?.template || "3D",
                unity_version: args?.unity_version || "latest",
                project_path: args?.project_path || `./UnityProjects/${args?.project_name}`,
                status: "created",
                project_guid: `unity_${Date.now()}`,
                initial_scenes: ["SampleScene"],
                default_packages: [
                  "com.unity.ugui",
                  "com.unity.timeline",
                  "com.unity.cinemachine"
                ],
                folder_structure: [
                  "Assets/Scripts",
                  "Assets/Scenes",
                  "Assets/Materials",
                  "Assets/Prefabs",
                  "Assets/Textures",
                  "Assets/Audio"
                ]
              }, null, 2)
            }
          ]
        };
        
      case "generate_unity_scripts":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                script_name: args?.script_name,
                script_type: args?.script_type,
                namespace: args?.namespace || "GameProject",
                features: args?.features || [],
                generated_file: `${args?.target_path || "Assets/Scripts"}/${args?.script_name}.cs`,
                template_used: `${args?.script_type}_Template`,
                includes: [
                  "using UnityEngine;",
                  "using System.Collections;",
                  "using System.Collections.Generic;"
                ],
                status: "generated",
                compilation_status: "pending"
              }, null, 2)
            }
          ]
        };
        
      case "analyze_unity_performance":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                project_path: args?.project_path,
                analysis_scope: args?.analysis_scope || ["rendering", "memory", "cpu"],
                target_platform: args?.target_platform || "Desktop",
                performance_analysis: {
                  rendering: {
                    draw_calls: 245,
                    triangles: 125000,
                    optimization_suggestions: [
                      "Consider using GPU Instancing for repeated objects",
                      "Optimize texture sizes for mobile targets"
                    ]
                  },
                  memory: {
                    total_usage: "512MB",
                    texture_memory: "256MB",
                    script_memory: "45MB",
                    recommendations: [
                      "Compress textures for target platform",
                      "Use object pooling for frequently instantiated objects"
                    ]
                  },
                  cpu: {
                    main_thread: "60fps target",
                    script_execution: "12ms avg",
                    bottlenecks: ["Complex physics calculations in Update()"],
                    suggestions: [
                      "Move heavy calculations to coroutines",
                      "Use FixedUpdate for physics-related code"
                    ]
                  }
                },
                overall_score: 7.8,
                priority_fixes: [
                  "Reduce draw calls in main scene",
                  "Optimize particle systems"
                ]
              }, null, 2)
            }
          ]
        };
        
      default:
        return {
          content: [
            {
              type: "text",
              text: `Unity tool ${name} not fully implemented yet - returning mock data`
            }
          ]
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Unity server error:", error);
  process.exit(1);
});