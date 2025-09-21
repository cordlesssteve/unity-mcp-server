#!/usr/bin/env node

/**
 * Test Unity IPC Connection
 * Tests the connection between the Unity MCP Server and Unity Editor
 */

import { UnityConnectionManager } from './packages/core/dist/connection/connection-manager.js';
import { Logger } from './packages/core/dist/utils/logger.js';

async function testUnityConnection() {
    const logger = new Logger('TestConnection');
    const connectionManager = new UnityConnectionManager(logger);

    console.log('🚀 Starting Unity IPC Connection Test...\n');

    try {
        // Initialize connection manager
        await connectionManager.initialize();

        // Connect to the Invariant Unity project
        const projectPath = '/home/cordlesssteve/projects/Extra/Invariant/Invariant-Unity';
        console.log(`📂 Connecting to Unity project: ${projectPath}`);

        const connection = await connectionManager.connectToProject(projectPath);

        console.log('\n✅ Connection Result:');
        console.log(`   Status: ${connection.status}`);
        console.log(`   Project: ${connection.projectName}`);
        console.log(`   Unity Version: ${connection.unityVersion}`);
        console.log(`   Platform: ${connection.targetPlatform}`);

        if (connection.status === 'connected') {
            console.log(`   🎮 Unity Editor PID: ${connection.editorPID}`);
            console.log(`   ▶️  Is Playing: ${connection.isPlaying || false}`);
            console.log(`   🔨 Is Compiling: ${connection.isCompiling || false}`);

            // Test Unity IPC commands
            const unityIPC = connectionManager.getUnityIPC(projectPath);
            if (unityIPC) {
                console.log('\n🧪 Testing Unity IPC Commands...');

                // Test ping
                try {
                    const pingResult = await unityIPC.ping();
                    console.log(`   📡 Ping: ${pingResult ? '✅ SUCCESS' : '❌ FAILED'}`);
                } catch (error) {
                    console.log(`   📡 Ping: ❌ ERROR - ${error.message}`);
                }

                // Get Unity state
                try {
                    const state = await unityIPC.getUnityState();
                    console.log(`   📊 Unity State: ✅ SUCCESS`);
                    console.log(`      - Unity Version: ${state.unityVersion}`);
                    console.log(`      - Project Name: ${state.projectName}`);
                    console.log(`      - Is Playing: ${state.isPlaying}`);
                    console.log(`      - Is Compiling: ${state.isCompiling}`);
                    console.log(`      - Active Scene: ${state.activeScene}`);
                } catch (error) {
                    console.log(`   📊 Unity State: ❌ ERROR - ${error.message}`);
                }
            }
        } else {
            console.log('\n⚠️  Unity Editor not connected - File-based mode only');
            console.log('   To test Unity IPC:');
            console.log('   1. Ensure Unity Editor is running with the Invariant project');
            console.log('   2. Check that the MCP plugin is installed and compiled');
            console.log('   3. Look for Unity Console logs starting with "[MCP Bridge]"');
        }

        console.log('\n🏁 Connection test completed successfully!');

    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        process.exit(1);
    } finally {
        // Clean up
        await connectionManager.shutdown();
        process.exit(0);
    }
}

// Run the test
testUnityConnection();