// server.mts
import 'dotenv/config';
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {registerAllTools} from "./tools/index.mjs";

// Create MCP server
const server = new McpServer({
    name: "figma-to-flutter-server",
    version: "0.1.0"
});

// Parse CLI arguments for figma key (supports multiple aliases) and optional --stdio
const args = process.argv.slice(2);
for (const arg of args) {
    const lower = arg.toLowerCase();
    const isKeyArg = lower.startsWith('--figma-api-key=');
    if (isKeyArg) {
        const key = arg.split('=')[1];
        if (key && key.trim().length > 0) {
            process.env.FIGMA_FLUTTER_MCP = key;
            console.log('🔑 Figma API key loaded from CLI flag.');
        }
    }
}

// Fallback: allow FIGMA_API_KEY env if FIGMA_FLUTTER_MCP not set
if (!process.env.FIGMA_FLUTTER_MCP && process.env.FIGMA_API_KEY) {
    process.env.FIGMA_FLUTTER_MCP = process.env.FIGMA_API_KEY;
    console.log('🔑 Figma API key loaded from FIGMA_API_KEY env.');
}

// Register all tools
registerAllTools(server);

// Connect transport layer
const transport = new StdioServerTransport();

async function main() {
    try {
        await server.connect(transport);
        console.log("🚀 Figma-to-Flutter MCP Server is running!");
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

main();