// src/tools/flutter/component/component-tool.mts

import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../../services/figma.mjs";
import {
    ComponentExtractor,
    VariantAnalyzer,
    parseComponentInput,
    type ComponentAnalysis,
    type ComponentVariant,
    DeduplicatedComponentExtractor,
    type DeduplicatedComponentAnalysis
} from "../../../extractors/components/index.mjs";
import {FlutterStyleLibrary} from "../../../extractors/flutter/style-library.mjs";

import {
    generateVariantSelectionPrompt,
    generateComponentAnalysisReport,
    generateStructureInspectionReport
} from "./helpers.mjs";
import {
    generateDeduplicatedReport,
    generateFlutterImplementation,
    generateComprehensiveDeduplicatedReport,
    generateStyleLibraryReport
} from "./deduplicated-helpers.mjs";

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

export function registerComponentTools(server: McpServer, figmaApiKey: string) {

    // Main component analysis tool
    server.registerTool(
        "analyze_figma_component",
        {
            title: "Analyze Figma Component",
            description: "Analyze a Figma component or component set to extract layout, styling, and structure information for Flutter widget creation. Use analyze_full_screen for complete screen layouts.",
            inputSchema: {
                input: z.string().describe("Figma component URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)"),
                userDefinedComponent: z.boolean().optional().describe("Treat a FRAME as a component (when designer hasn't converted to actual component yet) (default: false)"),
                maxChildNodes: z.number().optional().describe("Maximum child nodes to analyze (default: 10)"),
                includeVariants: z.boolean().optional().describe("Include variant analysis for component sets (default: true)"),
                variantSelection: z.array(z.string()).optional().describe("Specific variant names to analyze (if >3 variants)"),
                projectPath: z.string().optional().describe("Path to Flutter project for asset export (defaults to current directory)"),
                exportAssets: z.boolean().optional().describe("Automatically export image assets found in component (default: true)"),
                useDeduplication: z.boolean().optional().describe("Use style deduplication for token efficiency (default: true)"),
                generateFlutterCode: z.boolean().optional().describe("Generate full Flutter implementation code (default: false)"),
                resetStyleLibrary: z.boolean().optional().describe("Reset style library before analysis (default: false)")
            }
        },
        async ({input, nodeId, userDefinedComponent = false, maxChildNodes = 10, includeVariants = true, variantSelection, projectPath = process.cwd(), exportAssets = true, useDeduplication = true, generateFlutterCode = false, resetStyleLibrary = false}) => {
            const token = figmaApiKey;
            if (!token) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Figma access token not configured. Please set FIGMA_API_KEY environment variable."
                    }]
                };
            }

            try {
                // Reset style library if requested
                if (resetStyleLibrary) {
                    FlutterStyleLibrary.getInstance().reset();
                }

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

                // Validate that this is a component or user-defined component
                const isActualComponent = componentNode.type === 'COMPONENT' || componentNode.type === 'COMPONENT_SET' || componentNode.type === 'INSTANCE';
                const isUserDefinedFrame = componentNode.type === 'FRAME' && userDefinedComponent;
                
                if (!isActualComponent && !isUserDefinedFrame) {
                    if (componentNode.type === 'FRAME') {
                        return {
                            content: [{
                                type: "text",
                                text: `Node "${componentNode.name}" is a FRAME. If this should be treated as a component, set userDefinedComponent: true. For analyzing complete screens, use the analyze_full_screen tool instead.`
                            }]
                        };
                    } else {
                        return {
                            content: [{
                                type: "text",
                                text: `Node "${componentNode.name}" is not a component (type: ${componentNode.type}). For analyzing full screens, use the analyze_full_screen tool instead.`
                            }]
                        };
                    }
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
                let analysisReport: string;

                if (useDeduplication) {
                    // Use deduplicated extractor
                    const deduplicatedExtractor = new DeduplicatedComponentExtractor();
                    let deduplicatedAnalysis: DeduplicatedComponentAnalysis;

                    if (componentNode.type === 'COMPONENT_SET') {
                        // For component sets, analyze the default variant or first selected variant
                        const targetVariant = selectedVariants.find(v => v.isDefault) || selectedVariants[0];
                        if (targetVariant) {
                            const variantNode = await figmaService.getNode(parsedInput.fileId, targetVariant.nodeId);
                            deduplicatedAnalysis = await deduplicatedExtractor.analyzeComponent(variantNode, true);
                        } else {
                            // Fallback to analyzing the component set itself
                            deduplicatedAnalysis = await deduplicatedExtractor.analyzeComponent(componentNode, true);
                        }
                    } else {
                        // Regular component, instance, or user-defined frame
                        deduplicatedAnalysis = await deduplicatedExtractor.analyzeComponent(componentNode, true);
                    }

                    analysisReport = generateComprehensiveDeduplicatedReport(deduplicatedAnalysis, true);
                    
                    if (generateFlutterCode) {
                        analysisReport += "\n\n" + generateFlutterImplementation(deduplicatedAnalysis);
                    }
                } else {
                    // Use original extractor
                    const componentExtractor = new ComponentExtractor({
                        maxChildNodes,
                        extractTextContent: true,
                        prioritizeComponents: true
                    });
                    
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
                        // Regular component, instance, or user-defined frame
                        componentAnalysis = await componentExtractor.analyzeComponent(componentNode, userDefinedComponent);
                    }

                    analysisReport = generateComponentAnalysisReport(
                        componentAnalysis,
                        variantAnalysis,
                        selectedVariants,
                        parsedInput
                    );
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
            description: "Get a quick overview of component structure, children, and nested components. Use inspect_screen_structure for full screens.",
            inputSchema: {
                input: z.string().describe("Figma component URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)"),
                userDefinedComponent: z.boolean().optional().describe("Treat a FRAME as a component (when designer hasn't converted to actual component yet) (default: false)"),
                showAllChildren: z.boolean().optional().describe("Show all children regardless of limits (default: false)")
            }
        },
        async ({input, nodeId, userDefinedComponent = false, showAllChildren = false}) => {
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

                // Validate that this is a component or user-defined component
                const isActualComponent = componentNode.type === 'COMPONENT' || componentNode.type === 'COMPONENT_SET' || componentNode.type === 'INSTANCE';
                const isUserDefinedFrame = componentNode.type === 'FRAME' && userDefinedComponent;
                
                if (!isActualComponent && !isUserDefinedFrame) {
                    if (componentNode.type === 'FRAME') {
                        return {
                            content: [{
                                type: "text",
                                text: `Node "${componentNode.name}" is a FRAME. If this should be treated as a component, set userDefinedComponent: true. For inspecting complete screens, use the inspect_screen_structure tool instead.`
                            }]
                        };
                    } else {
                        return {
                            content: [{
                                type: "text",
                                text: `Node "${componentNode.name}" is not a component (type: ${componentNode.type}). For inspecting full screens, use the inspect_screen_structure tool instead.`
                            }]
                        };
                    }
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

    // Dedicated Flutter code generation tool
    server.registerTool(
        "generate_flutter_implementation",
        {
            title: "Generate Flutter Implementation",
            description: "Generate complete Flutter widget code using cached style definitions",
            inputSchema: {
                componentNodeId: z.string().describe("Node ID of the analyzed component"),
                includeStyleDefinitions: z.boolean().optional().describe("Include style definitions in output (default: true)"),
                widgetName: z.string().optional().describe("Custom widget class name")
            }
        },
        async ({ componentNodeId, includeStyleDefinitions = true, widgetName }) => {
            try {
                const styleLibrary = FlutterStyleLibrary.getInstance();
                const styles = styleLibrary.getAllStyles();
                
                let output = "🏗️  Flutter Implementation\n";
                output += `${'='.repeat(50)}\n\n`;
                
                if (includeStyleDefinitions && styles.length > 0) {
                    output += "📋 Style Definitions:\n";
                    output += `${'─'.repeat(30)}\n`;
                    styles.forEach(style => {
                        output += `// ${style.id} (${style.category}, used ${style.usageCount} times)\n`;
                        output += `final ${style.id} = ${style.flutterCode};\n\n`;
                    });
                    output += "\n";
                } else if (styles.length === 0) {
                    output += "⚠️  No cached styles found. Please analyze a component first.\n\n";
                }
                
                output += generateWidgetClass(componentNodeId, widgetName || 'CustomWidget', styles);
                
                // Add usage summary
                if (styles.length > 0) {
                    output += "\n\n📊 Style Library Summary:\n";
                    output += `${'─'.repeat(30)}\n`;
                    output += `• Total unique styles: ${styles.length}\n`;
                    
                    const categoryStats = styles.reduce((acc, style) => {
                        acc[style.category] = (acc[style.category] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    
                    Object.entries(categoryStats).forEach(([category, count]) => {
                        output += `• ${category}: ${count} style(s)\n`;
                    });
                    
                    const totalUsage = styles.reduce((sum, style) => sum + style.usageCount, 0);
                    output += `• Total style usage: ${totalUsage}\n`;
                    const efficiency = styles.length > 0 ? ((totalUsage - styles.length) / totalUsage * 100).toFixed(1) : '0.0';
                    output += `• Deduplication efficiency: ${efficiency}% reduction\n`;
                }
                
                return {
                    content: [{ type: "text", text: output }]
                };
                
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating Flutter implementation: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Style library status tool
    server.registerTool(
        "style_library_status",
        {
            title: "Style Library Status",
            description: "Get comprehensive status report of the cached style library",
            inputSchema: {}
        },
        async () => {
            try {
                const report = generateStyleLibraryReport();
                
                return {
                    content: [{ type: "text", text: report }]
                };
                
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating style library report: ${error instanceof Error ? error.message : String(error)}`
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
            .replace(/[^a-zA-Z0-9]/g, ' ') // Replace special chars with space
            .replace(/\s+/g, ' ') // Replace multiple spaces with single
            .trim()
            .split(' ')
            .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        report += `   Image.asset(Assets.${constantName}) // ${asset.nodeName}\n`;
    });

    report += `\n${'='.repeat(50)}\n`;

    return report;
}


/**
 * Generate widget class implementation
 */
function generateWidgetClass(componentNodeId: string, widgetName: string, styles: Array<any>): string {
    let output = `🎯 Widget Implementation:\n`;
    output += `${'─'.repeat(30)}\n`;
    output += `class ${widgetName} extends StatelessWidget {\n`;
    output += `  const ${widgetName}({Key? key}) : super(key: key);\n\n`;
    output += `  @override\n`;
    output += `  Widget build(BuildContext context) {\n`;

    // Find relevant styles for this component
    const decorationStyles = styles.filter(s => s.category === 'decoration');
    const paddingStyles = styles.filter(s => s.category === 'padding');
    const textStyles = styles.filter(s => s.category === 'text');

    if (decorationStyles.length > 0 || paddingStyles.length > 0) {
        output += `    return Container(\n`;
        
        // Add decoration if available
        if (decorationStyles.length > 0) {
            const decorationStyle = decorationStyles[0]; // Use first decoration style
            output += `      decoration: ${decorationStyle.id},\n`;
        }
        
        // Add padding if available
        if (paddingStyles.length > 0) {
            const paddingStyle = paddingStyles[0]; // Use first padding style
            output += `      padding: ${paddingStyle.id},\n`;
        }
        
        // Add child content
        if (textStyles.length > 0) {
            const textStyle = textStyles[0]; // Use first text style
            output += `      child: Text(\n`;
            output += `        'Sample Text', // TODO: Replace with actual content\n`;
            output += `        style: ${textStyle.id},\n`;
            output += `      ),\n`;
        } else {
            output += `      child: Column(\n`;
            output += `        children: [\n`;
            output += `          // TODO: Add your widget content here\n`;
            output += `          Text('Component Content'),\n`;
            output += `        ],\n`;
            output += `      ),\n`;
        }
        
        output += `    );\n`;
    } else if (textStyles.length > 0) {
        // Just a text widget if only text styles are available
        const textStyle = textStyles[0];
        output += `    return Text(\n`;
        output += `      'Sample Text', // TODO: Replace with actual content\n`;
        output += `      style: ${textStyle.id},\n`;
        output += `    );\n`;
    } else {
        // Fallback for when no cached styles are available
        output += `    return Container(\n`;
        output += `      // TODO: Implement widget using component node ID: ${componentNodeId}\n`;
        output += `      // No cached styles found - please analyze a component first\n`;
        output += `      child: Text('Widget Placeholder'),\n`;
        output += `    );\n`;
    }

    output += `  }\n`;
    output += `}\n`;

    // Add usage instructions
    output += `\n💡 Usage Instructions:\n`;
    output += `${'─'.repeat(30)}\n`;
    output += `1. Import this widget in your Flutter app\n`;
    output += `2. Replace 'Sample Text' with actual content\n`;
    output += `3. Customize the widget structure as needed\n`;
    output += `4. Add any missing properties or methods\n\n`;

    if (styles.length > 0) {
        output += `📦 Available Style References:\n`;
        output += `${'─'.repeat(30)}\n`;
        styles.forEach(style => {
            output += `• ${style.id} (${style.category})\n`;
        });
    }

    return output;
}
