// src/tools/figma.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../services/figma.mjs";
import {getFigmaToken} from "./config.mjs";

export function registerFigmaTools(server: McpServer) {
    // Tool: Theme & Design Tokens Extraction
    server.registerTool(
        "extract_design_tokens",
        {
            title: "Extract Design Tokens",
            description: "Extract colors, text styles, and tokens from a Figma file for Flutter theming",
            inputSchema: {
                fileId: z.string().describe("Figma file ID")
            }
        },
        async ({fileId}) => {
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
                const analysis = analyzeFileBasic(file, 'all', 3);

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

    // Tool: Export Images
    server.registerTool(
        "typescriptexport_node_images",
        {
            title: "Asset Export",
            description: "Export node images (png/jpg/svg/pdf) for Flutter assets",
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