#!/usr/bin/env node
import {getServerConfig} from './config.mjs';
import {startMcpServer} from './server.mjs';

async function startServer(): Promise<void> {
    const config = getServerConfig();

    if (config.isStdioMode) {
        await startMcpServer(config.figmaApiKey);
    } else {
        console.log('Starting Figma Flutter MCP Server...');
        console.log('Use --stdio flag for MCP client communication');
    }
}

startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});