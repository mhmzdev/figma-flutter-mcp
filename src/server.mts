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

// Register all tools
registerAllTools(server);

// Connect transport layer
const transport = new StdioServerTransport();

async function main() {
    try {
        await server.connect(transport);
        console.log("🚀 Figma-to-Flutter MCP Server is running!");
        console.log("📋 Available tools:");
        console.log("  - set_figma_token: Configure Figma access token");
        console.log("  - check_status: Check server configuration status");
        console.log("  - test_connection: Test the MCP connection");
        console.log("  - fetch_figma_file: Retrieve Figma file structure");
        console.log("  - explore_figma_page: Explore specific page structure");
        console.log("  - get_figma_node: Get detailed node information");
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

main();