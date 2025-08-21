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

// Parse CLI arguments for --figma-api-key and optional --stdio
const args = process.argv.slice(2);
for (const arg of args) {
    if (arg.startsWith('--figma-api-key=')) {
        const key = arg.split('=')[1];
        if (key && key.trim().length > 0) {
            process.env.FIGMA_FLUTTER_MCP = key;
            console.log('🔑 Figma API key loaded from CLI flag.');
        }
    }
}

// Register all tools
registerAllTools(server);

// Connect transport layer
const transport = new StdioServerTransport();

async function main() {
    try {
        await server.connect(transport);
        console.log("🚀 Figma-to-Flutter MCP Server is running!");
        console.log("📋 Available tools:");
        console.log("  - fetch_figma_file: Retrieve Figma file structure");
        console.log("  - extract_design_data: Extract design data for Flutter");
        console.log("  - get_node_details: Get detailed node information");
        console.log("  - export_node_images: Get image export URLs for nodes");
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

main();