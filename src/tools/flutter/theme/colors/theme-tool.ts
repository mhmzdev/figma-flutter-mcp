// src/tools/flutter/simple-theme-tool.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../../../services/figma.js";
import {extractThemeColors} from "../../../../extractors/colors/index.js";
import {SimpleThemeGenerator} from "./theme-generator.js";
import {join} from 'path';

export function registerThemeTools(server: McpServer, figmaApiKey: string) {
    server.registerTool(
        "extract_theme_colors",
        {
            title: "Extract Theme Colors from Frame",
            description: "Extract colors from a Figma theme frame containing color swatches with labels",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeId: z.string().describe("Theme frame node ID containing color swatches"),
                projectPath: z.string().optional().describe("Path to Flutter project (defaults to current directory)"),
                generateThemeData: z.boolean().optional().describe("Generate Flutter ThemeData class (defaults to false)")
            }
        },
        async ({fileId, nodeId, projectPath = process.cwd(), generateThemeData = false}) => {
            const token = figmaApiKey;
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Figma access token not configured."
                    }]
                };
            }

            try {
                // Initialize services
                const figmaService = new FigmaService(token);
                const generator = new SimpleThemeGenerator();

                // Get the specific theme frame node
                const themeFrame = await figmaService.getNode(fileId, nodeId);

                if (!themeFrame) {
                    return {
                        content: [{
                            type: "text",
                            text: `Theme frame with node ID "${nodeId}" not found.`
                        }]
                    };
                }

                // Extract colors from the theme frame
                const themeColors = extractThemeColors(themeFrame);

                if (themeColors.length === 0) {
                    return {
                        content: [{
                            type: "text",
                            text: `No colors found in theme frame "${themeFrame.name}". Make sure the frame contains color swatches with text labels.`
                        }]
                    };
                }

                // Generate AppColors class
                const outputPath = join(projectPath, 'lib', 'theme');
                const generatedFilePath = await generator.generateAppColors(themeColors, outputPath, {
                    generateThemeData,
                    includeColorScheme: true,
                    includeMaterialColors: true
                });

                // Create success report
                let output = `Successfully extracted theme colors!\n\n`;
                output += `Theme Frame: ${themeFrame.name}\n`;
                output += `Node ID: ${nodeId}\n`;
                output += `Colors found: ${themeColors.length}\n`;
                output += `Generated: ${generatedFilePath}\n`;
                if (generateThemeData) {
                    output += `Theme Data: ${join(outputPath, 'app_theme.dart')}\n`;
                }
                output += `\n`;

                output += `Extracted Colors:\n`;
                themeColors.forEach((color, index) => {
                    output += `${index + 1}. ${color.name}: ${color.hex}\n`;
                });

                output += `\nGenerated Files:\n`;
                output += `• app_colors.dart - Color constants\n`;
                if (generateThemeData) {
                    output += `• app_theme.dart - Flutter ThemeData\n`;
                }

                output += `\nUsage Examples:\n`;
                output += `// Colors:\n`;
                output += `Container(color: AppColors.primary)\n`;
                output += `Text('Hello', style: TextStyle(color: AppColors.backgroundDark))\n`;
                
                if (generateThemeData) {
                    output += `\n// Theme:\n`;
                    output += `MaterialApp(\n`;
                    output += `  theme: AppTheme.lightTheme,\n`;
                    output += `  // ... your app\n`;
                    output += `)\n`;
                }

                return {
                    content: [{type: "text", text: output}]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error extracting theme colors: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Helper tool to inspect a frame structure
    server.registerTool(
        "inspect_theme_frame",
        {
            title: "Inspect Theme Frame Structure",
            description: "Inspect the structure of a theme frame to understand its contents before extraction",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeId: z.string().describe("Frame node ID to inspect")
            }
        },
        async ({fileId, nodeId}) => {
            const token = figmaApiKey;
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Figma access token not configured."
                    }]
                };
            }

            try {
                const figmaService = new FigmaService(token);
                const frameNode = await figmaService.getNode(fileId, nodeId);

                if (!frameNode) {
                    return {
                        content: [{
                            type: "text",
                            text: `Frame with node ID "${nodeId}" not found.`
                        }]
                    };
                }

                let output = `Frame Inspection Report\n\n`;
                output += `Frame Name: ${frameNode.name}\n`;
                output += `Frame Type: ${frameNode.type}\n`;
                output += `Node ID: ${nodeId}\n`;
                output += `Children: ${frameNode.children?.length || 0}\n\n`;

                if (frameNode.children && frameNode.children.length > 0) {
                    output += `Frame Contents:\n`;
                    frameNode.children.forEach((child, index) => {
                        output += `${index + 1}. ${child.name} (${child.type})\n`;

                        // Show color if it has one
                        if (child.fills && Array.isArray(child.fills)) {
                            const solidFill = child.fills.find(fill => fill.type === 'SOLID' && fill.color);
                            if (solidFill && solidFill.color) {
                                const hex = rgbaToHex(solidFill.color);
                                output += `   Color: ${hex}\n`;
                            }
                        }

                        // Show text children
                        if (child.children) {
                            const textChildren = child.children.filter(c => c.type === 'TEXT');
                            if (textChildren.length > 0) {
                                output += `   Text: ${textChildren.map(t => t.name).join(', ')}\n`;
                            }
                        }
                    });
                } else {
                    output += `Frame is empty or has no children.\n`;
                }

                output += `\nThis frame ${frameNode.children && frameNode.children.length > 0 ? 'can' : 'cannot'} be used for theme color extraction.\n`;

                return {
                    content: [{type: "text", text: output}]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inspecting frame: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );
}

import { rgbaToHex } from '../../../../utils/helpers.js';