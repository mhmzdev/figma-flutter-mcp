// src/tools/figma.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../services/figma.mjs";
import {getFigmaToken} from "./config.mjs";
import {writeFile, mkdir, readFile} from 'fs/promises';
import {join, dirname} from 'path';

export function registerFigmaTools(server: McpServer) {
    // Tool: Export Flutter Assets
    server.registerTool(
        "export_flutter_assets",
        {
            title: "Export Flutter Assets",
            description: "Export images from Figma nodes and set up Flutter assets directory with pubspec.yaml",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeIds: z.array(z.string()).describe("Array of node IDs to export as images"),
                projectPath: z.string().optional().describe("Path to Flutter project (defaults to current directory)"),
                format: z.enum(['png', 'jpg', 'svg']).default('png').describe("Export format"),
                scale: z.number().optional().default(2).describe("Export scale (1x, 2x, 3x, 4x)"),
                includeMultipleResolutions: z.boolean().optional().default(false).describe("Generate @2x, @3x variants for different screen densities")
            }
        },
        async ({fileId, nodeIds, projectPath = process.cwd(), format = 'png', scale = 2, includeMultipleResolutions = true}) => {
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
                const figmaService = new FigmaService(token);

                // First, get node details to filter for actual images/illustrations
                const imageNodes = await filterImageNodes(fileId, nodeIds, figmaService);

                if (imageNodes.length === 0) {
                    return {
                        content: [{
                            type: "text",
                            text: "No image assets found in the specified nodes. Only custom illustrations, photos, and non-icon graphics are exported."
                        }]
                    };
                }

                // Create assets directory structure
                const assetsDir = join(projectPath, 'assets', 'images');
                await mkdir(assetsDir, {recursive: true});

                let downloadedAssets: Array<{
                    nodeId: string;
                    nodeName: string;
                    filename: string;
                    path: string;
                    size: string;
                }> = [];

                // Process each resolution if multi-resolution is enabled
                const scales = includeMultipleResolutions ? [1, 2, 3] : [scale];

                for (const currentScale of scales) {
                    const imageUrls = await figmaService.getImageExportUrls(fileId, imageNodes.map(n => n.id), {
                        format,
                        scale: currentScale
                    });

                    for (const node of imageNodes) {
                        const imageUrl = imageUrls[node.id];
                        if (!imageUrl) continue;

                        const filename = generateAssetFilename(node.name, format, currentScale, includeMultipleResolutions);
                        const filepath = join(assetsDir, filename);

                        // Download the image
                        await downloadImage(imageUrl, filepath);

                        // Get file size for reporting
                        const stats = await getFileStats(filepath);

                        downloadedAssets.push({
                            nodeId: node.id,
                            nodeName: node.name,
                            filename,
                            path: `assets/images/${filename}`,
                            size: stats.size
                        });
                    }
                }

                // Update pubspec.yaml
                const pubspecPath = join(projectPath, 'pubspec.yaml');
                await updatePubspecAssets(pubspecPath, downloadedAssets);

                // Generate asset constants file
                const constantsFile = await generateAssetConstants(downloadedAssets, projectPath);

                let output = `Successfully exported ${imageNodes.length} image assets to Flutter project!\n\n`;
                output += `Assets Directory: ${assetsDir}\n\n`;
                output += `Downloaded Assets:\n`;

                // Group by base name for cleaner output
                const groupedAssets = groupAssetsByBaseName(downloadedAssets);
                Object.entries(groupedAssets).forEach(([baseName, assets]) => {
                    output += `- ${baseName}:\n`;
                    assets.forEach(asset => {
                        output += `  • ${asset.filename} (${asset.size})\n`;
                    });
                });

                output += `\nPubspec Configuration:\n`;
                output += `- Updated pubspec.yaml with asset declarations\n`;
                output += `- Assets available under: assets/images/\n\n`;

                output += `Generated Code:\n`;
                output += `- Asset constants file: ${constantsFile}\n`;
                output += `- Import in your Flutter code: import 'package:your_app/constants/assets.dart';\n\n`;

                output += `Usage Example:\n`;
                output += "```dart\n";
                output += `Image.asset(Assets.${toCamelCase(imageNodes[0].name)})\n`;
                output += "```";

                return {
                    content: [{type: "text", text: output}]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error exporting assets: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );

    // Helper functions

    async function filterImageNodes(fileId: string, targetNodeIds: string[], figmaService: any): Promise<Array<{id: string, name: string, node: any}>> {
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

    function generateAssetFilename(nodeName: string, format: string, scale: number, multiRes: boolean): string {
        // Clean the node name for filename
        const cleanName = nodeName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        if (multiRes && scale > 1) {
            return `${cleanName}@${scale}x.${format}`;
        }

        return `${cleanName}.${format}`;
    }

    async function downloadImage(url: string, filepath: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        await mkdir(dirname(filepath), {recursive: true});
        await writeFile(filepath, Buffer.from(buffer));
    }

    async function getFileStats(filepath: string): Promise<{size: string}> {
        try {
            const {size} = await import('fs').then(fs => fs.promises.stat(filepath));
            return {
                size: size > 1024 * 1024
                    ? `${(size / 1024 / 1024).toFixed(1)}MB`
                    : `${Math.round(size / 1024)}KB`
            };
        } catch {
            return {size: 'Unknown'};
        }
    }

    async function updatePubspecAssets(pubspecPath: string, assets: Array<{path: string}>): Promise<void> {
        let pubspecContent: string;

        try {
            pubspecContent = await readFile(pubspecPath, 'utf-8');
        } catch {
            // If pubspec doesn't exist, create a basic one
            pubspecContent = `name: flutter_app
description: A Flutter application

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true
`;
        }

        // Parse and update assets section
        const assetPaths = [...new Set(assets.map(a => `    - ${a.path}`))];

        if (pubspecContent.includes('assets:')) {
            // Replace existing assets section
            pubspecContent = pubspecContent.replace(
                /assets:\s*\n(?:    - .*\n)*/,
                `assets:\n${assetPaths.join('\n')}\n`
            );
        } else if (pubspecContent.includes('flutter:')) {
            // Add assets to existing flutter section
            pubspecContent = pubspecContent.replace(
                'flutter:',
                `flutter:\n  assets:\n${assetPaths.join('\n')}`
            );
        } else {
            // Add flutter section with assets
            pubspecContent += `\nflutter:\n  assets:\n${assetPaths.join('\n')}\n`;
        }

        await writeFile(pubspecPath, pubspecContent);
    }

    async function generateAssetConstants(assets: Array<{filename: string, nodeName: string}>, projectPath: string): Promise<string> {
        const constantsDir = join(projectPath, 'lib', 'constants');
        await mkdir(constantsDir, {recursive: true});

        const constantsPath = join(constantsDir, 'assets.dart');

        // Generate unique asset names
        const uniqueAssets = assets.reduce((acc, asset) => {
            const baseName = asset.filename.replace(/@\d+x/, '').replace(/\.[^.]+$/, '');
            if (!acc[baseName]) {
                acc[baseName] = asset;
            }
            return acc;
        }, {} as Record<string, any>);

        let constantsContent = `// Generated asset constants\n// Do not edit manually\n\nclass Assets {\n`;

        Object.entries(uniqueAssets).forEach(([baseName, asset]) => {
            const constantName = toCamelCase(asset.nodeName);
            const assetPath = `assets/images/${baseName}.png`; // Use base resolution
            constantsContent += `  static const String ${constantName} = '${assetPath}';\n`;
        });

        constantsContent += `}\n`;

        await writeFile(constantsPath, constantsContent);
        return constantsPath;
    }

    function groupAssetsByBaseName(assets: Array<{filename: string, nodeName: string, size: string}>): Record<string, Array<{filename: string, size: string}>> {
        return assets.reduce((acc, asset) => {
            const baseName = asset.filename.replace(/@\d+x/, '').replace(/\.[^.]+$/, '');
            if (!acc[baseName]) {
                acc[baseName] = [];
            }
            acc[baseName].push({
                filename: asset.filename,
                size: asset.size
            });
            return acc;
        }, {} as Record<string, Array<{filename: string, size: string}>>);
    }

    function toCamelCase(str: string): string {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .replace(/_(.)/g, (_, char) => char.toUpperCase());
    }

    // Categorize component names into Flutter-friendly categories
    function categorizeForFlutter(name: string): 'screen' | 'global_widget' | 'private_widget' {
        const lower = name.toLowerCase();
        if (/(screen|page|view|login|register|feed|profile|chat|home|settings)/.test(lower)) {
            return 'screen';
        }
        if (/(button|component|card|input|header|footer|navbar|dialog|modal|avatar|chip|badge)/.test(lower)) {
            return 'global_widget';
        }
        return 'private_widget';
    }
}