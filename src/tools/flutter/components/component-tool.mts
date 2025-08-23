// src/tools/flutter/component/component-tool.mts

import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../../services/figma.mjs";
import {getFigmaToken} from "../../config.mjs";
import {
    ComponentExtractor,
    VariantAnalyzer,
    parseComponentInput,
    type ComponentAnalysis,
    type ComponentVariant
} from "../../../extractors/components/index.mjs";

import {
    generateVariantSelectionPrompt,
    generateComponentAnalysisReport,
    generateStructureInspectionReport
} from "./helpers.mjs";

export function registerComponentTools(server: McpServer) {

    // Main component analysis tool
    server.registerTool(
        "analyze_figma_component",
        {
            title: "Analyze Figma Component",
            description: "Analyze a Figma component or component set to extract layout, styling, and structure information for Flutter widget creation",
            inputSchema: {
                input: z.string().describe("Figma component URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)"),
                userDefinedComponent: z.boolean().optional().describe("Treat as component even if it's a FRAME (default: false)"),
                maxChildNodes: z.number().optional().describe("Maximum child nodes to analyze (default: 10)"),
                includeVariants: z.boolean().optional().describe("Include variant analysis for component sets (default: true)"),
                variantSelection: z.array(z.string()).optional().describe("Specific variant names to analyze (if >3 variants)")
            }
        },
        async ({input, nodeId, userDefinedComponent = false, maxChildNodes = 10, includeVariants = true, variantSelection}) => {
            const token = getFigmaToken();
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Figma access token not configured. Please set FIGMA_FLUTTER_MCP environment variable."
                    }]
                };
            }

            try {
                // Parse input to get file ID and node ID
                const parsedInput = parseComponentInput(input, nodeId);

                if (!parsedInput.isValid) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error parsing input: ${parsedInput.error || 'Invalid input format'}`
                        }]
                    };
                }

                const figmaService = new FigmaService(token);
                const componentExtractor = new ComponentExtractor({
                    maxChildNodes,
                    extractTextContent: true,
                    prioritizeComponents: true
                });

                // Get the component node
                const componentNode = await figmaService.getNode(parsedInput.fileId, parsedInput.nodeId);

                if (!componentNode) {
                    return {
                        content: [{
                            type: "text",
                            text: `Component with node ID "${parsedInput.nodeId}" not found in file.`
                        }]
                    };
                }

                // Check if this is a component set and handle variants
                let variantAnalysis: ComponentVariant[] | undefined;
                let selectedVariants: ComponentVariant[] = [];

                if (componentNode.type === 'COMPONENT_SET' && includeVariants) {
                    const variantAnalyzer = new VariantAnalyzer();
                    variantAnalysis = await variantAnalyzer.analyzeComponentSet(componentNode);

                    if (variantAnalyzer.shouldPromptForVariantSelection(variantAnalysis)) {
                        // More than 3 variants - check if user provided selection
                        if (!variantSelection || variantSelection.length === 0) {
                            const selectionInfo = variantAnalyzer.getVariantSelectionInfo(variantAnalysis);

                            return {
                                content: [{
                                    type: "text",
                                    text: generateVariantSelectionPrompt(componentNode.name, selectionInfo, variantAnalysis)
                                }]
                            };
                        } else {
                            // Filter variants based on user selection
                            selectedVariants = variantAnalyzer.filterVariantsBySelection(variantAnalysis, {
                                variantNames: variantSelection,
                                includeDefault: true
                            });

                            if (selectedVariants.length === 0) {
                                return {
                                    content: [{
                                        type: "text",
                                        text: `No variants found matching selection: ${variantSelection.join(', ')}`
                                    }]
                                };
                            }
                        }
                    } else {
                        // 3 or fewer variants - analyze all
                        selectedVariants = variantAnalysis;
                    }
                }

                // Analyze the main component
                let componentAnalysis: ComponentAnalysis;

                if (componentNode.type === 'COMPONENT_SET') {
                    // For component sets, analyze the default variant or first selected variant
                    const targetVariant = selectedVariants.find(v => v.isDefault) || selectedVariants[0];
                    if (targetVariant) {
                        const variantNode = await figmaService.getNode(parsedInput.fileId, targetVariant.nodeId);
                        componentAnalysis = await componentExtractor.analyzeComponent(variantNode, userDefinedComponent);
                    } else {
                        // Fallback to analyzing the component set itself
                        componentAnalysis = await componentExtractor.analyzeComponent(componentNode, userDefinedComponent);
                    }
                } else {
                    // Regular component or frame
                    componentAnalysis = await componentExtractor.analyzeComponent(componentNode, userDefinedComponent);
                }

                // Generate analysis report
                const analysisReport = generateComponentAnalysisReport(
                    componentAnalysis,
                    variantAnalysis,
                    selectedVariants,
                    parsedInput
                );

                return {
                    content: [{
                        type: "text",
                        text: analysisReport
                    }]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error analyzing component: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Helper tool to list component variants
    server.registerTool(
        "list_component_variants",
        {
            title: "List Component Variants",
            description: "List all variants in a Figma component set to help with variant selection",
            inputSchema: {
                input: z.string().describe("Figma component set URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)")
            }
        },
        async ({input, nodeId}) => {
            const token = getFigmaToken();
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Figma access token not configured."
                    }]
                };
            }

            try {
                const parsedInput = parseComponentInput(input, nodeId);

                if (!parsedInput.isValid) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error parsing input: ${parsedInput.error}`
                        }]
                    };
                }

                const figmaService = new FigmaService(token);
                const componentNode = await figmaService.getNode(parsedInput.fileId, parsedInput.nodeId);

                if (!componentNode) {
                    return {
                        content: [{
                            type: "text",
                            text: `Component set with node ID "${parsedInput.nodeId}" not found.`
                        }]
                    };
                }

                if (componentNode.type !== 'COMPONENT_SET') {
                    return {
                        content: [{
                            type: "text",
                            text: `Node "${componentNode.name}" is not a component set (type: ${componentNode.type}). This tool is only for component sets with variants.`
                        }]
                    };
                }

                const variantAnalyzer = new VariantAnalyzer();
                const variants = await variantAnalyzer.analyzeComponentSet(componentNode);
                const summary = variantAnalyzer.generateVariantSummary(variants);
                const selectionInfo = variantAnalyzer.getVariantSelectionInfo(variants);

                let output = `Component Set: ${componentNode.name}\n\n${summary}\n`;

                if (variants.length > 3) {
                    output += `\nTo analyze specific variants, use the analyze_figma_component tool with variantSelection parameter.\n`;
                    output += `Example variant names you can select:\n`;
                    selectionInfo.variantNames.slice(0, 5).forEach(name => {
                        output += `- "${name}"\n`;
                    });
                }

                return {
                    content: [{type: "text", text: output}]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing variants: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Helper tool to inspect component structure
    server.registerTool(
        "inspect_component_structure",
        {
            title: "Inspect Component Structure",
            description: "Get a quick overview of component structure, children, and nested components",
            inputSchema: {
                input: z.string().describe("Figma component URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)"),
                showAllChildren: z.boolean().optional().describe("Show all children regardless of limits (default: false)")
            }
        },
        async ({input, nodeId, showAllChildren = false}) => {
            const token = getFigmaToken();
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Figma access token not configured."
                    }]
                };
            }

            try {
                const parsedInput = parseComponentInput(input, nodeId);

                if (!parsedInput.isValid) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error parsing input: ${parsedInput.error}`
                        }]
                    };
                }

                const figmaService = new FigmaService(token);
                const componentNode = await figmaService.getNode(parsedInput.fileId, parsedInput.nodeId);

                if (!componentNode) {
                    return {
                        content: [{
                            type: "text",
                            text: `Component with node ID "${parsedInput.nodeId}" not found.`
                        }]
                    };
                }

                const output = generateStructureInspectionReport(componentNode, showAllChildren);

                return {
                    content: [{type: "text", text: output}]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inspecting structure: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );
}
