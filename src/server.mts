import 'dotenv/config';
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {registerAllTools} from "./tools/index.mjs";

// Create MCP server
const server = new McpServer({
    name: "figma-flutter-mcp",
    version: "0.1.0"
});

// Parse CLI arguments for figma key
const args = process.argv.slice(2);
for (const arg of args) {
    const lower = arg.toLowerCase();
    const isKeyArg = lower.startsWith('--figma-api-key=');
    if (isKeyArg) {
        const key = arg.split('=')[1];
        if (key && key.trim().length > 0) {
            process.env.FIGMA_API_KEY = key;
        }
    }
}

// Register all tools
registerAllTools(server);

export async function startMcpServer(): Promise<void> {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Figma-to-Flutter MCP Server connected via stdio");
    } catch (error) {
        console.error("Failed to start MCP server:", error);
        process.exit(1);
    }
}

// Auto-start if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    await startMcpServer();
}