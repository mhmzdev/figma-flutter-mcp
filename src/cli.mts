#!/usr/bin/env node
import {getServerConfig} from './config.mjs';
import {startMcpServer, startHttpServer} from './server.mjs';

async function startServer(): Promise<void> {
    const config = getServerConfig();

    if (config.isStdioMode) {
        await startMcpServer(config.figmaApiKey);
    } else if (config.isHttpMode) {
        console.log('Starting Figma Flutter MCP Server in HTTP mode...');
        await startHttpServer(config.httpPort, config.figmaApiKey);
    } else {
        console.log('Starting Figma Flutter MCP Server...');
        console.log('Use --stdio flag for MCP client communication');
        console.log('Use --http flag for local testing via HTTP');
        console.log('Use --help for more options');
    }
}

startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});