// src/tools/figma.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../services/figma.mjs";
import {getFigmaToken} from "./config.mjs";

export function registerFigmaTools(server: McpServer) {
    // Tool: Fetch Figma File Structure
    server.registerTool(
        "fetch_figma_file",
        {
            title: "Fetch Figma File Structure",
            description: "Retrieve basic information about a Figma file",
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
                        text: "❌ Error: Figma access token not configured. Provide --figma-api-key=YOUR_KEY on startup or set FIGMA_FLUTTER_MCP in your environment (.env)."
                    }]
                };
            }

            try {
                const figmaService = new FigmaService(token);
                const file = await figmaService.getFile(fileId);

                const fileInfo = {
                    name: file.name,
                    lastModified: file.lastModified,
                    version: file.version,
                    pageCount: file.document?.children?.length || 0,
                    pages: file.document?.children?.map(page => ({
                        id: page.id,
                        name: page.name,
                        type: page.type
                    })) || []
                };

                return {
                    content: [{
                        type: "text",
                        text: `✅ Successfully fetched Figma file!\n\n📄 File Info:\n${JSON.stringify(fileInfo, null, 2)}\n\nUse 'get_node_details' to inspect specific nodes or 'extract_design_data' to prepare Flutter-ready data.`
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

    // Tool: Extract Design Data (the main tool for Flutter generation)
    server.registerTool(
        "extract_design_data",
        {
            title: "Extract Design Data for Flutter",
            description: "Extract colors, components, and styles from Figma with deduplication for Flutter code generation",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                extractionType: z.enum(['colors', 'components', 'styles', 'all']).default('all').describe("What to extract"),
                maxDepth: z.number().optional().default(3).describe("Maximum depth to traverse")
            }
        },
        async ({fileId, extractionType = 'all', maxDepth = 3}) => {
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
                const file = await figmaService.getFile(fileId);

                // For now, return basic analysis until we implement the extractor
                // This will be replaced with your extractor system
                const analysis = analyzeFileBasic(file, extractionType, maxDepth);

                return {
                    content: [{
                        type: "text",
                        text: `✅ Design data extracted from ${file.name}\n\n${analysis}\n\nThis data is ready for Flutter code generation.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Error extracting design data: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Tool: Get Node Details  
    server.registerTool(
        "get_node_details",
        {
            title: "Get Node Details",
            description: "Get detailed information about specific Figma nodes",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeIds: z.array(z.string()).describe("Array of node IDs to inspect")
            }
        },
        async ({fileId, nodeIds}) => {
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
                const nodes = await figmaService.getNodes(fileId, nodeIds);

                const nodeDetails = Object.entries(nodes).map(([nodeId, node]) => ({
                    id: nodeId,
                    name: node.name,
                    type: node.type,
                    visible: node.visible !== false,
                    bounds: node.absoluteBoundingBox,
                    hasChildren: node.children && node.children.length > 0,
                    childCount: node.children?.length || 0
                }));

                return {
                    content: [{
                        type: "text",
                        text: `✅ Node Details:\n\n${JSON.stringify(nodeDetails, null, 2)}\n\nThese nodes can be used to generate Flutter widgets.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Error getting nodes: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Tool: Export Images
    server.registerTool(
        "export_node_images",
        {
            title: "Export Node Images",
            description: "Get image export URLs for Figma nodes",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeIds: z.array(z.string()).describe("Array of node IDs to export as images"),
                format: z.enum(['png', 'jpg', 'svg', 'pdf']).default('png').describe("Export format"),
                scale: z.number().optional().default(2).describe("Export scale (1x, 2x, 3x, 4x)")
            }
        },
        async ({fileId, nodeIds, format = 'png', scale = 2}) => {
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
                const imageUrls = await figmaService.getImageExportUrls(fileId, nodeIds, {
                    format,
                    scale: format === 'png' || format === 'jpg' ? scale : undefined
                });

                const results = Object.entries(imageUrls).map(([nodeId, url]) =>
                    `${nodeId}: ${url}`
                ).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `✅ Generated ${Object.keys(imageUrls).length} image export URLs:\n\n${results}\n\nThese URLs can be used to download images for Flutter assets.`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Error exporting images: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );
}

// Temporary basic analysis function (will be replaced with extractor system)
function analyzeFileBasic(file: any, extractionType: string, maxDepth: number): string {
    const pageCount = file.document?.children?.length || 0;

    let analysis = `📊 Basic Analysis:\n`;
    analysis += `Pages: ${pageCount}\n`;
    analysis += `Extraction type: ${extractionType}\n`;
    analysis += `Max depth: ${maxDepth}\n\n`;

    if (file.document?.children) {
        analysis += `Pages found:\n`;
        file.document.children.forEach((page: any, index: number) => {
            analysis += `${index + 1}. ${page.name} (${page.id})\n`;
        });
    }

    analysis += `\nNote: This is basic analysis. Full extraction with deduplication will be implemented next.`;

    return analysis;
}