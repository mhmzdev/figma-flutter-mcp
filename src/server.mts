import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {registerAllTools} from "./tools/index.mjs";

export function createServer(figmaApiKey: string) {
    const server = new McpServer({
        name: "figma-flutter-mcp",
        version: process.env.npm_package_version || "0.0.1"
    });

    registerAllTools(server, figmaApiKey);
    return server;
}

export async function startMcpServer(figmaApiKey: string): Promise<void> {
    try {
        const server = createServer(figmaApiKey);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Figma-to-Flutter MCP Server connected via stdio");
    } catch (error) {
        console.error("Failed to start MCP server:", error);
        process.exit(1);
    }
}