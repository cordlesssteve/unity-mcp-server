using System;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json;

namespace MCPIntegration
{
    /// <summary>
    /// Unity Editor plugin that bridges communication with the MCP server
    /// Provides real Unity Editor state and control to the MCP server
    /// </summary>
    [InitializeOnLoad]
    public static class MCPServerBridge
    {
        private static NamedPipeServerStream pipeServer;
        private static CancellationTokenSource cancellationTokenSource;
        private static bool isInitialized = false;
        private static string pipeName;

        static MCPServerBridge()
        {
            Initialize();
        }

        /// <summary>
        /// Initialize the MCP bridge when Unity Editor starts
        /// </summary>
        private static void Initialize()
        {
            if (isInitialized) return;

            try
            {
                // Generate unique pipe name based on project path
                string projectPath = Application.dataPath;
                string projectHash = Math.Abs(projectPath.GetHashCode()).ToString();
                pipeName = $"unity-mcp-{projectHash}";

                Debug.Log($"[MCP Bridge] Initializing MCP Server Bridge for project: {Application.productName}");
                Debug.Log($"[MCP Bridge] Pipe name: {pipeName}");

                // Register Unity Editor events
                RegisterUnityEvents();

                // Start IPC server
                StartIPCServer();

                isInitialized = true;
                Debug.Log("[MCP Bridge] MCP Server Bridge initialized successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MCP Bridge] Failed to initialize: {ex.Message}");
            }
        }

        /// <summary>
        /// Register for Unity Editor events to broadcast state changes
        /// </summary>
        private static void RegisterUnityEvents()
        {
            EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
            EditorApplication.hierarchyChanged += OnHierarchyChanged;
            UnityEditor.SceneManagement.EditorSceneManager.sceneOpened += OnSceneOpened;
            AssemblyReloadEvents.beforeAssemblyReload += OnBeforeAssemblyReload;

            Debug.Log("[MCP Bridge] Unity Editor events registered");
        }

        /// <summary>
        /// Start the named pipe server for IPC communication
        /// </summary>
        private static async void StartIPCServer()
        {
            try
            {
                cancellationTokenSource = new CancellationTokenSource();

                await Task.Run(() => RunIPCServer(cancellationTokenSource.Token));
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MCP Bridge] IPC Server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Run the IPC server loop
        /// </summary>
        private static async Task RunIPCServer(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    pipeServer = new NamedPipeServerStream(
                        pipeName,
                        PipeDirection.InOut,
                        1,
                        PipeTransmissionMode.Message,
                        PipeOptions.Asynchronous
                    );

                    Debug.Log($"[MCP Bridge] Waiting for MCP server connection on pipe: {pipeName}");

                    // Wait for client connection
                    await pipeServer.WaitForConnectionAsync(cancellationToken);

                    Debug.Log("[MCP Bridge] MCP server connected!");

                    // Send initial Unity state
                    await SendUnityState();

                    // Handle incoming messages
                    await HandleMessages(cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    Debug.Log("[MCP Bridge] IPC Server stopped");
                    break;
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[MCP Bridge] IPC Server error: {ex.Message}");
                    await Task.Delay(1000, cancellationToken); // Wait before retrying
                }
                finally
                {
                    pipeServer?.Dispose();
                }
            }
        }

        /// <summary>
        /// Handle incoming messages from MCP server
        /// </summary>
        private static async Task HandleMessages(CancellationToken cancellationToken)
        {
            var buffer = new byte[4096];

            while (pipeServer.IsConnected && !cancellationToken.IsCancellationRequested)
            {
                try
                {
                    int bytesRead = await pipeServer.ReadAsync(buffer, 0, buffer.Length, cancellationToken);

                    if (bytesRead > 0)
                    {
                        string message = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                        await ProcessCommand(message);
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[MCP Bridge] Message handling error: {ex.Message}");
                    break;
                }
            }
        }

        /// <summary>
        /// Process commands from MCP server
        /// </summary>
        private static async Task ProcessCommand(string message)
        {
            try
            {
                var command = JsonConvert.DeserializeObject<MCPCommand>(message);

                Debug.Log($"[MCP Bridge] Received command: {command.Command}");

                var response = new MCPResponse
                {
                    Id = command.Id,
                    Command = command.Command,
                    Success = true,
                    Timestamp = DateTime.UtcNow
                };

                // Execute command on main thread
                UnityMainThreadDispatcher.Enqueue(() => ExecuteCommand(command, response));
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MCP Bridge] Command processing error: {ex.Message}");
            }
        }

        /// <summary>
        /// Execute Unity Editor commands
        /// </summary>
        private static void ExecuteCommand(MCPCommand command, MCPResponse response)
        {
            try
            {
                switch (command.Command.ToLower())
                {
                    case "get_state":
                        response.Data = GetUnityState();
                        break;

                    case "enter_play_mode":
                        EditorApplication.isPlaying = true;
                        response.Data = new { playMode = true };
                        break;

                    case "exit_play_mode":
                        EditorApplication.isPlaying = false;
                        response.Data = new { playMode = false };
                        break;

                    case "load_scene":
                        if (command.Parameters.ContainsKey("scenePath"))
                        {
                            string scenePath = command.Parameters["scenePath"].ToString();
                            UnityEditor.SceneManagement.EditorSceneManager.OpenScene(scenePath);
                            response.Data = new { sceneLoaded = scenePath };
                        }
                        break;

                    case "refresh_assets":
                        AssetDatabase.Refresh();
                        response.Data = new { assetsRefreshed = true };
                        break;

                    case "ping":
                        response.Data = new { pong = true, unityVersion = Application.unityVersion };
                        break;

                    default:
                        response.Success = false;
                        response.Error = $"Unknown command: {command.Command}";
                        break;
                }

                // Send response back to MCP server
                SendResponse(response);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.Error = ex.Message;
                SendResponse(response);
                Debug.LogError($"[MCP Bridge] Command execution error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get current Unity Editor state
        /// </summary>
        private static object GetUnityState()
        {
            return new
            {
                unityVersion = Application.unityVersion,
                projectName = Application.productName,
                isPlaying = EditorApplication.isPlaying,
                isCompiling = EditorApplication.isCompiling,
                isPaused = EditorApplication.isPaused,
                activeScene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name,
                targetPlatform = EditorUserBuildSettings.activeBuildTarget.ToString(),
                buildSettingsScenes = EditorBuildSettings.scenes.Length
            };
        }

        /// <summary>
        /// Send Unity state update to MCP server
        /// </summary>
        private static async Task SendUnityState()
        {
            try
            {
                var stateEvent = new MCPEvent
                {
                    Type = "state_update",
                    Data = GetUnityState(),
                    Timestamp = DateTime.UtcNow
                };

                await SendMessage(stateEvent);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MCP Bridge] Failed to send Unity state: {ex.Message}");
            }
        }

        /// <summary>
        /// Send response to MCP server
        /// </summary>
        private static async void SendResponse(MCPResponse response)
        {
            await SendMessage(response);
        }

        /// <summary>
        /// Send message to MCP server
        /// </summary>
        private static async Task SendMessage(object message)
        {
            try
            {
                if (pipeServer?.IsConnected == true)
                {
                    string json = JsonConvert.SerializeObject(message);
                    byte[] data = Encoding.UTF8.GetBytes(json);
                    await pipeServer.WriteAsync(data, 0, data.Length);
                    await pipeServer.FlushAsync();
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MCP Bridge] Failed to send message: {ex.Message}");
            }
        }

        #region Unity Event Handlers

        private static void OnPlayModeStateChanged(PlayModeStateChange state)
        {
            Debug.Log($"[MCP Bridge] Play mode changed: {state}");

            var playModeEvent = new MCPEvent
            {
                Type = "play_mode_changed",
                Data = new { state = state.ToString(), isPlaying = EditorApplication.isPlaying },
                Timestamp = DateTime.UtcNow
            };

            UnityMainThreadDispatcher.Enqueue(async () => await SendMessage(playModeEvent));
        }

        private static void OnHierarchyChanged()
        {
            var hierarchyEvent = new MCPEvent
            {
                Type = "hierarchy_changed",
                Data = new { activeScene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name },
                Timestamp = DateTime.UtcNow
            };

            UnityMainThreadDispatcher.Enqueue(async () => await SendMessage(hierarchyEvent));
        }

        private static void OnSceneOpened(UnityEngine.SceneManagement.Scene scene, UnityEditor.SceneManagement.OpenSceneMode mode)
        {
            Debug.Log($"[MCP Bridge] Scene opened: {scene.name}");

            var sceneEvent = new MCPEvent
            {
                Type = "scene_opened",
                Data = new { sceneName = scene.name, scenePath = scene.path },
                Timestamp = DateTime.UtcNow
            };

            UnityMainThreadDispatcher.Enqueue(async () => await SendMessage(sceneEvent));
        }

        private static void OnBeforeAssemblyReload()
        {
            Debug.Log("[MCP Bridge] Assembly reload starting - shutting down IPC");
            Shutdown();
        }

        #endregion

        /// <summary>
        /// Shutdown the MCP bridge
        /// </summary>
        public static void Shutdown()
        {
            try
            {
                cancellationTokenSource?.Cancel();
                pipeServer?.Dispose();
                isInitialized = false;
                Debug.Log("[MCP Bridge] MCP Server Bridge shut down");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MCP Bridge] Shutdown error: {ex.Message}");
            }
        }
    }

    #region Data Structures

    [Serializable]
    public class MCPCommand
    {
        public string Id { get; set; }
        public string Command { get; set; }
        public Dictionary<string, object> Parameters { get; set; }
        public DateTime Timestamp { get; set; }
    }

    [Serializable]
    public class MCPResponse
    {
        public string Id { get; set; }
        public string Command { get; set; }
        public bool Success { get; set; }
        public object Data { get; set; }
        public string Error { get; set; }
        public DateTime Timestamp { get; set; }
    }

    [Serializable]
    public class MCPEvent
    {
        public string Type { get; set; }
        public object Data { get; set; }
        public DateTime Timestamp { get; set; }
    }

    #endregion
}