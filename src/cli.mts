#!/usr/bin/env node

import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {resolve} from 'path';
import {program} from 'commander';

// Parse CLI arguments
program
    .name('figma-flutter-mcp')
    .description('Figma to Flutter MCP Server')
    .option('--figma-api-key <key>', 'Figma API key')
    .option('--stdio', 'Run in stdio mode for MCP client communication')
    .parse();

const options = program.opts();

// Set environment variables from CLI args
if (options.figmaApiKey) {
    process.env.FIGMA_API_KEY = options.figmaApiKey;
}

// Check if running in stdio mode (same pattern as working MCP)
const isStdioMode = process.env.NODE_ENV === "cli" || process.argv.includes("--stdio");

async function startServer(): Promise<void> {
    if (isStdioMode) {
        // Import and start MCP server in stdio mode
        const {startMcpServer} = await import('./server.mjs');
        await startMcpServer();
    } else {
        console.log('Starting Figma Flutter MCP Server...');
        console.log('Use --stdio flag for MCP client communication');
        console.log('Example: figma-flutter-mcp --figma-api-key=YOUR_KEY --stdio');
    }
}

// If we're being executed directly (not imported), start the server
if (process.argv[1]) {
    startServer().catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });
}