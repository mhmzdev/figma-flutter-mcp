// src/tools/flutter/typography-tool.mts

import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../../../services/figma.mjs";
import {extractThemeTypography} from "../../../../extractors/typography/index.mjs";
import {TypographyGenerator} from "./typography-generator.mjs";
import {join} from 'path';

export function registerTypographyTools(server: McpServer, figmaApiKey: string) {
    server.registerTool(
        "extract_theme_typography",
        {
            title: "Extract Theme Typography from Frame",
            description: "Extract typography styles from a Figma theme frame containing text samples with different styles",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeId: z.string().describe("Theme frame node ID containing text style samples"),
                projectPath: z.string().optional().describe("Path to Flutter project (defaults to current directory)"),
                generateTextTheme: z.boolean().optional().describe("Generate Flutter TextTheme class (defaults to false)"),
                familyVariableName: z.string().optional().describe("Name for shared font family variable (defaults to 'fontFamily')")
            }
        },
        async ({fileId, nodeId, projectPath = process.cwd(), generateTextTheme = false, familyVariableName = 'fontFamily'}) => {
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
                const generator = new TypographyGenerator();

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

                // Extract typography from the theme frame
                const themeTypography = extractThemeTypography(themeFrame);

                if (themeTypography.length === 0) {
                    return {
                        content: [{
                            type: "text",
                            text: `No typography styles found in theme frame "${themeFrame.name}". Make sure the frame contains text nodes with different styles.`
                        }]
                    };
                }

                // Generate AppText class
                const outputPath = join(projectPath, 'lib', 'theme');
                const generatedFilePath = await generator.generateAppText(themeTypography, outputPath, {
                    generateTextTheme,
                    familyVariableName,
                    includeLineHeight: true,
                    includeLetterSpacing: true
                });

                // Determine primary font family
                const fontFamilies = new Set(themeTypography.map(t => t.fontFamily));
                const primaryFontFamily = themeTypography.length > 0 ? 
                    [...fontFamilies].reduce((a, b) => 
                        themeTypography.filter(t => t.fontFamily === a).length > 
                        themeTypography.filter(t => t.fontFamily === b).length ? a : b
                    ) : 'Roboto';

                // Create success report
                let output = `Successfully extracted theme typography!\n\n`;
                output += `Theme Frame: ${themeFrame.name}\n`;
                output += `Node ID: ${nodeId}\n`;
                output += `Typography styles found: ${themeTypography.length}\n`;
                output += `Primary font family: ${primaryFontFamily}\n`;
                output += `Generated: ${generatedFilePath}\n`;
                if (generateTextTheme) {
                    output += `Text Theme: ${join(outputPath, 'text_theme.dart')}\n`;
                }
                output += `\n`;

                output += `Extracted Typography Styles:\n`;
                themeTypography.forEach((style, index) => {
                    output += `${index + 1}. ${style.name}:\n`;
                    output += `   Font: ${style.fontFamily}\n`;
                    output += `   Size: ${style.fontSize}px\n`;
                    output += `   Weight: ${style.fontWeight}\n`;
                    output += `   Line Height: ${style.lineHeight}px\n`;
                    if (style.letterSpacing) {
                        output += `   Letter Spacing: ${style.letterSpacing}px\n`;
                    }
                    output += `\n`;
                });

                output += `Generated Files:\n`;
                output += `• app_text.dart - Typography style constants\n`;
                if (generateTextTheme) {
                    output += `• text_theme.dart - Material Design TextTheme\n`;
                }

                output += `\nUsage Examples:\n`;
                output += `// Typography:\n`;
                const firstStyle = themeTypography[0];
                const dartName = firstStyle.name.charAt(0).toLowerCase() + firstStyle.name.slice(1).replace(/[^a-zA-Z0-9]/g, '');
                output += `Text('Hello World', style: AppText.${dartName})\n`;
                
                if (generateTextTheme) {
                    output += `\n// Material Design Theme:\n`;
                    output += `MaterialApp(\n`;
                    output += `  theme: ThemeData(\n`;
                    output += `    textTheme: AppTextTheme.textTheme,\n`;
                    output += `  ),\n`;
                    output += `  // ... your app\n`;
                    output += `)\n`;
                }

                output += `\n// Font Family Variable:\n`;
                output += `Container(\n`;
                output += `  child: Text(\n`;
                output += `    'Custom Text',\n`;
                output += `    style: TextStyle(\n`;
                output += `      fontFamily: AppText.${familyVariableName},\n`;
                output += `      fontSize: 16,\n`;
                output += `    ),\n`;
                output += `  ),\n`;
                output += `)\n`;

                return {
                    content: [{type: "text", text: output}]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error extracting theme typography: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Helper tool to inspect a frame structure for typography
    server.registerTool(
        "inspect_typography_frame",
        {
            title: "Inspect Typography Frame Structure",
            description: "Inspect the structure of a typography frame to understand its text contents before extraction",
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

                let output = `Typography Frame Inspection Report\n\n`;
                output += `Frame Name: ${frameNode.name}\n`;
                output += `Frame Type: ${frameNode.type}\n`;
                output += `Node ID: ${nodeId}\n`;
                output += `Children: ${frameNode.children?.length || 0}\n\n`;

                if (frameNode.children && frameNode.children.length > 0) {
                    output += `Frame Contents:\n`;
                    let textNodesFound = 0;
                    
                    frameNode.children.forEach((child, index) => {
                        output += `${index + 1}. ${child.name} (${child.type})\n`;

                        // Show text style if it has one
                        if (child.type === 'TEXT' && child.style) {
                            textNodesFound++;
                            output += `   Font: ${child.style.fontFamily || 'default'}\n`;
                            output += `   Size: ${child.style.fontSize || 16}px\n`;
                            output += `   Weight: ${child.style.fontWeight || 400}\n`;
                            if (child.style.lineHeightPx) {
                                output += `   Line Height: ${child.style.lineHeightPx}px\n`;
                            }
                            if (child.style.letterSpacing) {
                                output += `   Letter Spacing: ${child.style.letterSpacing}px\n`;
                            }
                        }

                        // Check for nested text nodes
                        if (child.children) {
                            const nestedTextNodes = findTextNodes(child);
                            if (nestedTextNodes.length > 0) {
                                textNodesFound += nestedTextNodes.length;
                                output += `   Contains ${nestedTextNodes.length} text node(s)\n`;
                            }
                        }
                    });

                    output += `\nText nodes found: ${textNodesFound}\n`;
                } else {
                    output += `Frame is empty or has no children.\n`;
                }

                const canExtract = frameNode.children && frameNode.children.some(child => 
                    child.type === 'TEXT' || (child.children && findTextNodes(child).length > 0)
                );

                output += `\nThis frame ${canExtract ? 'can' : 'cannot'} be used for typography extraction.\n`;

                if (canExtract) {
                    output += `\nRecommendations:\n`;
                    output += `• Make sure text samples represent your design system typography\n`;
                    output += `• Use meaningful names for text layers (e.g., "Heading Large", "Body Text")\n`;
                    output += `• Include different font weights and sizes you want to capture\n`;
                }

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

// Helper method to find text nodes recursively
function findTextNodes(node: any): any[] {
    const textNodes: any[] = [];
    
    if (node.type === 'TEXT') {
        textNodes.push(node);
    }
    
    if (node.children) {
        node.children.forEach((child: any) => {
            textNodes.push(...findTextNodes(child));
        });
    }
    
    return textNodes;
}
