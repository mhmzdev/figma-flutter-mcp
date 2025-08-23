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

import {
    createAssetsDirectory,
    generateAssetFilename,
    downloadImage,
    getFileStats,
    updatePubspecAssets,
    generateAssetConstants,
    groupAssetsByBaseName,
    type AssetInfo
} from "../assets/asset-manager.mjs";
import {join} from 'path';

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
                variantSelection: z.array(z.string()).optional().describe("Specific variant names to analyze (if >3 variants)"),
                projectPath: z.string().optional().describe("Path to Flutter project for asset export (defaults to current directory)"),
                exportAssets: z.boolean().optional().describe("Automatically export image assets found in component (default: true)")
            }
        },
        async ({input, nodeId, userDefinedComponent = false, maxChildNodes = 10, includeVariants = true, variantSelection, projectPath = process.cwd(), exportAssets = true}) => {
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

                // Detect and export image assets if enabled
                let assetExportInfo = '';
                if (exportAssets) {
                    try {
                        // Use the existing filterImageNodes logic from assets.mts
                        const imageNodes = await filterImageNodesInComponent(parsedInput.fileId, [parsedInput.nodeId], figmaService);
                        if (imageNodes.length > 0) {
                            const exportedAssets = await exportComponentAssets(
                                imageNodes,
                                parsedInput.fileId,
                                figmaService,
                                projectPath
                            );
                            assetExportInfo = generateAssetExportReport(exportedAssets);
                        }
                    } catch (assetError) {
                        assetExportInfo = `\nAsset Export Warning: ${assetError instanceof Error ? assetError.message : String(assetError)}\n`;
                    }
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
                        text: analysisReport + assetExportInfo
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

/**
 * Filter image nodes within a component - reuses logic from assets.mts
 */
async function filterImageNodesInComponent(fileId: string, targetNodeIds: string[], figmaService: FigmaService): Promise<Array<{id: string, name: string, node: any}>> {
    // Get the full file to access all nodes
    const file = await figmaService.getFile(fileId);

    // Get the target nodes for boundary checking
    const targetNodes = await figmaService.getNodes(fileId, targetNodeIds);

    const allNodesWithImages: Array<{id: string, name: string, node: any}> = [];

    function extractImageNodes(node: any, nodeId: string = node.id): void {
        // Check if this node has image fills
        if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE' && fill.visible !== false)) {
            allNodesWithImages.push({
                id: nodeId,
                name: node.name,
                node: node
            });
        }

        // Check if this is a vector/illustration that should be exported
        if (node.type === 'VECTOR' && node.name) {
            const name = node.name.toLowerCase();
            if ((name.includes('image') || name.includes('illustration') || name.includes('graphic')) &&
                !name.includes('icon') && !name.includes('button')) {
                allNodesWithImages.push({
                    id: nodeId,
                    name: node.name,
                    node: node
                });
            }
        }

        // Recursively check children
        if (node.children) {
            node.children.forEach((child: any) => {
                extractImageNodes(child, child.id);
            });
        }
    }

    // Extract from entire file
    file.document.children?.forEach((page: any) => {
        extractImageNodes(page);
    });

    // Filter to only those within our target nodes
    const imageNodes = allNodesWithImages.filter(imageNode => {
        return targetNodeIds.some(targetId => {
            const targetNode = targetNodes[targetId];
            return targetNode && isNodeWithinTarget(imageNode.node, targetNode);
        });
    });

    return imageNodes;
}

function isNodeWithinTarget(imageNode: any, targetNode: any): boolean {
    if (!imageNode.absoluteBoundingBox || !targetNode.absoluteBoundingBox) {
        return false;
    }

    const imageBounds = imageNode.absoluteBoundingBox;
    const targetBounds = targetNode.absoluteBoundingBox;

    // Check if image node is within target node bounds
    return (
        imageBounds.x >= targetBounds.x &&
        imageBounds.y >= targetBounds.y &&
        imageBounds.x + imageBounds.width <= targetBounds.x + targetBounds.width &&
        imageBounds.y + imageBounds.height <= targetBounds.y + targetBounds.height
    );
}

/**
 * Export component assets to Flutter project
 */
async function exportComponentAssets(
    imageNodes: Array<{id: string, name: string, node: any}>,
    fileId: string,
    figmaService: FigmaService,
    projectPath: string
): Promise<AssetInfo[]> {
    if (imageNodes.length === 0) {
        return [];
    }

    // Create assets directory structure
    const assetsDir = await createAssetsDirectory(projectPath);
    const downloadedAssets: AssetInfo[] = [];

    // Export images at 2x scale (standard for Flutter)
    const imageUrls = await figmaService.getImageExportUrls(fileId, imageNodes.map(n => n.id), {
        format: 'png',
        scale: 2
    });

    for (const imageNode of imageNodes) {
        const imageUrl = imageUrls[imageNode.id];
        if (!imageUrl) continue;

        const filename = generateAssetFilename(imageNode.name, 'png', 2, false);
        const filepath = join(assetsDir, filename);

        try {
            // Download the image
            await downloadImage(imageUrl, filepath);

            // Get file size for reporting
            const stats = await getFileStats(filepath);

            downloadedAssets.push({
                nodeId: imageNode.id,
                nodeName: imageNode.name,
                filename,
                path: `assets/images/${filename}`,
                size: stats.size
            });
        } catch (downloadError) {
            console.warn(`Failed to download image ${imageNode.name}:`, downloadError);
        }
    }

    if (downloadedAssets.length > 0) {
        // Update pubspec.yaml
        const pubspecPath = join(projectPath, 'pubspec.yaml');
        await updatePubspecAssets(pubspecPath, downloadedAssets);

        // Generate asset constants file
        await generateAssetConstants(downloadedAssets, projectPath);
    }

    return downloadedAssets;
}

/**
 * Generate asset export report
 */
function generateAssetExportReport(exportedAssets: AssetInfo[]): string {
    if (exportedAssets.length === 0) {
        return '';
    }

    let report = `\n${'='.repeat(50)}\n`;
    report += `🖼️  AUTOMATIC ASSET EXPORT\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    report += `Found and exported ${exportedAssets.length} image asset(s) from the component:\n\n`;

    // Group by base name for cleaner output
    const groupedAssets = groupAssetsByBaseName(exportedAssets);
    Object.entries(groupedAssets).forEach(([baseName, assets]) => {
        report += `📁 ${baseName}:\n`;
        assets.forEach(asset => {
            report += `   • ${asset.filename} (${asset.size})\n`;
        });
    });

    report += `\n✅ Assets Configuration:\n`;
    report += `   • Images saved to: assets/images/\n`;
    report += `   • pubspec.yaml updated with asset declarations\n`;
    report += `   • Asset constants generated in: lib/constants/assets.dart\n\n`;

    report += `🚀 Usage in Flutter:\n`;
    report += `   import 'package:your_app/constants/assets.dart';\n\n`;
    
    exportedAssets.forEach(asset => {
        const constantName = asset.filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
            .replace(/_+/g, '_') // Replace multiple underscores with single
            .replace(/^_|_$/g, '') // Remove leading/trailing underscores
            .toLowerCase();
        
        report += `   Image.asset(Assets.${constantName}) // ${asset.nodeName}\n`;
    });

    report += `\n${'='.repeat(50)}\n`;

    return report;
}
