// src/tools/flutter/screens/screen-tool.mts

import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../../services/figma.js";
import {
    ScreenExtractor,
    parseComponentInput,
    type ScreenAnalysis
} from "../../../extractors/screens/index.js";

import {
    generateScreenAnalysisReport,
    generateScreenStructureReport
} from "./helpers.js";

import {
    createAssetsDirectory,
    generateAssetFilename,
    downloadImage,
    getFileStats,
    updatePubspecAssets,
    generateAssetConstants,
    groupAssetsByBaseName,
    type AssetInfo
} from "../assets/asset-manager.js";
import {join} from 'path';

export function registerScreenTools(server: McpServer, figmaApiKey: string) {

    // Main screen analysis tool
    server.registerTool(
        "analyze_full_screen",
        {
            title: "Analyze Full Screen",
            description: "Analyze a complete Figma screen/frame to extract layout, sections, navigation, and structure information for Flutter screen implementation",
            inputSchema: {
                input: z.string().describe("Figma screen URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)"),
                maxSections: z.number().optional().describe("Maximum sections to analyze (default: 15)"),
                extractNavigation: z.boolean().optional().describe("Extract navigation elements (default: true)"),
                extractAssets: z.boolean().optional().describe("Extract and export screen assets (default: true)"),
                projectPath: z.string().optional().describe("Path to Flutter project for asset export (defaults to current directory)"),
                deviceTypeDetection: z.boolean().optional().describe("Detect device type and orientation (default: true)")
            }
        },
        async ({input, nodeId, maxSections = 15, extractNavigation = true, extractAssets = true, projectPath = process.cwd(), deviceTypeDetection = true}) => {
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
                const screenExtractor = new ScreenExtractor({
                    maxSections,
                    extractNavigation,
                    extractAssets: false, // We'll handle asset export separately
                    deviceTypeDetection
                });

                // Get the screen node
                const screenNode = await figmaService.getNode(parsedInput.fileId, parsedInput.nodeId);

                if (!screenNode) {
                    return {
                        content: [{
                            type: "text",
                            text: `Screen with node ID "${parsedInput.nodeId}" not found in file.`
                        }]
                    };
                }

                // Analyze the screen
                const screenAnalysis = await screenExtractor.analyzeScreen(screenNode);

                // Detect and export screen assets if enabled
                let assetExportInfo = '';
                if (extractAssets) {
                    try {
                        const imageNodes = await filterImageNodesInScreen(parsedInput.fileId, [parsedInput.nodeId], figmaService);
                        if (imageNodes.length > 0) {
                            const exportedAssets = await exportScreenAssets(
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
                const analysisReport = generateScreenAnalysisReport(screenAnalysis, parsedInput);

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
                        text: `Error analyzing screen: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Screen structure inspection tool
    server.registerTool(
        "inspect_screen_structure",
        {
            title: "Inspect Screen Structure",
            description: "Get a quick overview of screen structure, sections, and navigation elements",
            inputSchema: {
                input: z.string().describe("Figma screen URL or file ID"),
                nodeId: z.string().optional().describe("Node ID (if providing file ID separately)"),
                showAllSections: z.boolean().optional().describe("Show all sections regardless of limits (default: false)")
            }
        },
        async ({input, nodeId, showAllSections = false}) => {
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
                const screenNode = await figmaService.getNode(parsedInput.fileId, parsedInput.nodeId);

                if (!screenNode) {
                    return {
                        content: [{
                            type: "text",
                            text: `Screen with node ID "${parsedInput.nodeId}" not found.`
                        }]
                    };
                }

                const output = generateScreenStructureReport(screenNode, showAllSections);

                return {
                    content: [{type: "text", text: output}]
                };

            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inspecting screen structure: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );
}

/**
 * Filter image nodes within a screen - similar to component logic but optimized for screens
 */
async function filterImageNodesInScreen(fileId: string, targetNodeIds: string[], figmaService: FigmaService): Promise<Array<{id: string, name: string, node: any}>> {
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
            if ((name.includes('image') || name.includes('illustration') || name.includes('graphic') ||
                 name.includes('photo') || name.includes('picture') || name.includes('asset') ||
                 name.includes('logo') || name.includes('icon')) &&
                !name.includes('button')) {
                allNodesWithImages.push({
                    id: nodeId,
                    name: node.name,
                    node: node
                });
            }
        }

        // Check for large frames that might be image placeholders
        if ((node.type === 'RECTANGLE' || node.type === 'FRAME') && node.name) {
            const name = node.name.toLowerCase();
            const hasImageKeywords = name.includes('image') || name.includes('photo') || 
                                   name.includes('picture') || name.includes('banner') ||
                                   name.includes('hero') || name.includes('thumbnail') ||
                                   name.includes('background') || name.includes('cover');
            
            // Check if it has image fills or is large enough to be an image placeholder
            const hasImageFills = node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE');
            const isLargeEnough = node.absoluteBoundingBox && 
                                (node.absoluteBoundingBox.width > 80 && node.absoluteBoundingBox.height > 80);
            
            if (hasImageKeywords && (hasImageFills || isLargeEnough)) {
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
 * Export screen assets to Flutter project
 */
async function exportScreenAssets(
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
 * Generate asset export report for screens
 */
function generateAssetExportReport(exportedAssets: AssetInfo[]): string {
    if (exportedAssets.length === 0) {
        return '';
    }

    let report = `\n${'='.repeat(50)}\n`;
    report += `🖼️  SCREEN ASSET EXPORT\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    report += `Found and exported ${exportedAssets.length} screen asset(s):\n\n`;

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

    report += `🚀 Usage in Flutter Screen:\n`;
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
