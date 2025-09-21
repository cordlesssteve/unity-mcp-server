using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

namespace MCPIntegration
{
    /// <summary>
    /// Utility to execute code on Unity's main thread from background threads
    /// Required for Unity API calls from async/background operations
    /// </summary>
    [InitializeOnLoad]
    public static class UnityMainThreadDispatcher
    {
        private static readonly Queue<Action> executionQueue = new Queue<Action>();
        private static readonly object queueLock = new object();

        static UnityMainThreadDispatcher()
        {
            EditorApplication.update += Update;
        }

        /// <summary>
        /// Queue an action to be executed on the main thread
        /// </summary>
        /// <param name="action">Action to execute</param>
        public static void Enqueue(Action action)
        {
            if (action == null) return;

            lock (queueLock)
            {
                executionQueue.Enqueue(action);
            }
        }

        /// <summary>
        /// Execute queued actions on the main thread
        /// Called every Unity Editor update
        /// </summary>
        private static void Update()
        {
            lock (queueLock)
            {
                while (executionQueue.Count > 0)
                {
                    try
                    {
                        var action = executionQueue.Dequeue();
                        action?.Invoke();
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError($"[MCP Bridge] Main thread dispatcher error: {ex.Message}");
                    }
                }
            }
        }
    }
}