// src/tools/config.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";

// Global state for configuration
export let figmaAccessToken: string | null = process.env.FIGMA_FLUTTER_MCP || null;

export function registerConfigTools(server: McpServer) {
    // Tool: Set Figma Access Token
    server.registerTool(
        "set_figma_token",
        {
            title: "Set Figma Access Token",
            description: "Configure the Figma API access token for authentication",
            inputSchema: {
                token: z.string().describe("Figma personal access token")
            }
        },
        async ({token}) => {
            figmaAccessToken = token;
            return {
                content: [{
                    type: "text",
                    text: "✅ Figma access token has been configured successfully!"
                }]
            };
        }
    );

    // Tool: Check Configuration Status
    server.registerTool(
        "check_status",
        {
            title: "Check Server Status",
            description: "Check if the server is properly configured",
            inputSchema: {}
        },
        async () => {
            const status = {
                serverName: "figma-to-flutter-server",
                version: "0.1.0",
                figmaTokenConfigured: figmaAccessToken !== null,
                timestamp: new Date().toISOString()
            };

            return {
                content: [{
                    type: "text",
                    text: `📊 Server Status:\n${JSON.stringify(status, null, 2)}`
                }]
            };
        }
    );

    // Tool: Simple Test Tool
    server.registerTool(
        "test_connection",
        {
            title: "Test Connection",
            description: "Test the MCP server connection with a simple response",
            inputSchema: {
                message: z.string().optional().describe("Optional test message")
            }
        },
        async ({message}) => {
            const testMessage = message || "Hello from Figma-to-Flutter MCP Server!";

            return {
                content: [{
                    type: "text",
                    text: `🔗 Connection Test Successful!\n\nEcho: ${testMessage}\nServer Time: ${new Date().toISOString()}`
                }]
            };
        }
    );
}

export function getFigmaToken(): string | null {
    return figmaAccessToken;
}