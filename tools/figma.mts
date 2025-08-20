// src/tools/figma.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../services/figma.mjs";
import {getFigmaToken} from "./config.mjs";

export function registerFigmaTools(server: McpServer) {
    // Tool: Fetch Figma File
    server.registerTool(
        "fetch_figma_file",
        {
            title: "Fetch Figma File",
            description: "Retrieve and explore a Figma file structure",
            inputSchema: {
                fileId: z.string().describe("Figma file ID (from the URL)")
            }
        },
        async ({fileId}) => {
            const token = getFigmaToken();
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ Error: Figma access token not configured. Use set_figma_token first."
                    }]
                };
            }

            try {
                const figmaService = new FigmaService(token);
                const fileInfo = await figmaService.getFileInfo(fileId);
                const pages = await figmaService.getPages(fileId);

                return {
                    content: [{
                        type: "text",
                        text: `✅ Successfully fetched Figma file!\n\n📄 File Info:\n${JSON.stringify(fileInfo, null, 2)}\n\n📑 Pages:\n${JSON.stringify(pages, null, 2)}\n\nUse 'explore_figma_page' to dive deeper into specific pages.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Error fetching Figma file: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Tool: Explore Figma Page
    server.registerTool(
        "explore_figma_page",
        {
            title: "Explore Figma Page",
            description: "Explore the structure and components of a specific Figma page",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                pageId: z.string().optional().describe("Page ID (if not provided, explores first page)"),
                maxDepth: z.number().optional().default(3).describe("Maximum depth to explore (default: 3)")
            }
        },
        async ({fileId, pageId, maxDepth = 3}) => {
            const token = getFigmaToken();
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ Error: Figma access token not configured."
                    }]
                };
            }

            try {
                const figmaService = new FigmaService(token);
                const page = await figmaService.getPage(fileId, pageId);
                const pageStructure = figmaService.exploreNodeStructure(page, maxDepth);

                return {
                    content: [{
                        type: "text",
                        text: `✅ Exploring page: ${page.name}\n\n🌳 Page Structure:\n${pageStructure}\n\nUse specific node IDs with future tools to generate Flutter code.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Error exploring page: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Tool: Get Specific Node
    server.registerTool(
        "get_figma_node",
        {
            title: "Get Figma Node",
            description: "Get detailed information about a specific Figma node/component",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeId: z.string().describe("Node ID to inspect")
            }
        },
        async ({fileId, nodeId}) => {
            const token = getFigmaToken();
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ Error: Figma access token not configured."
                    }]
                };
            }

            try {
                const figmaService = new FigmaService(token);
                const node = await figmaService.getNode(fileId, nodeId);

                // Create a detailed view of the node
                const nodeDetails = {
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    visible: node.visible !== false,
                    bounds: node.absoluteBoundingBox,
                    fills: node.fills,
                    strokes: node.strokes,
                    effects: node.effects,
                    style: node.style,
                    constraints: node.constraints,
                    childCount: node.children?.length || 0
                };

                return {
                    content: [{
                        type: "text",
                        text: `✅ Node Details:\n\n${JSON.stringify(nodeDetails, null, 2)}\n\nThis node can be used to generate Flutter widgets.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Error getting node: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );
}