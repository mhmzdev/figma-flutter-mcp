// tools/flutter/svg-assets.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../../services/figma.js";
import {join} from 'path';
import {
    createSvgAssetsDirectory,
    generateSvgFilename,
    downloadImage,
    getFileStats,
    updatePubspecAssets,
    type AssetInfo,
    generateSvgAssetConstants
} from "./asset-manager.js";

export function registerSvgAssetTools(server: McpServer, figmaApiKey: string) {
    // Tool: Export SVG Flutter Assets
    server.registerTool(
        "export_svg_flutter_assets",
        {
            title: "Export SVG Flutter Assets",
            description: "Export SVG assets from Figma nodes (groups with vector children) and set up Flutter SVG assets directory",
            inputSchema: {
                fileId: z.string().describe("Figma file ID"),
                nodeIds: z.array(z.string()).describe("Array of node IDs to export as SVG assets"),
                projectPath: z.string().optional().describe("Path to Flutter project (defaults to current directory)")
            }
        },
        async ({fileId, nodeIds, projectPath = process.cwd()}) => {
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

                // Filter for SVG nodes (groups with vector children)
                const svgNodes = await filterSvgNodes(fileId, nodeIds, figmaService);

                if (svgNodes.length === 0) {
                    return {
                        content: [{
                            type: "text",
                            text: "No SVG assets found in the specified nodes. Looking for groups or frames containing vector graphics."
                        }]
                    };
                }

                // Create SVG assets directory structure
                const assetsDir = await createSvgAssetsDirectory(projectPath);

                let downloadedAssets: AssetInfo[] = [];

                // Export each SVG node
                const imageUrls = await figmaService.getImageExportUrls(fileId, svgNodes.map(n => n.id), {
                    format: 'svg',
                    scale: 1 // SVGs don't need multiple scales
                });

                for (const node of svgNodes) {
                    const imageUrl = imageUrls[node.id];
                    if (!imageUrl) continue;

                    const filename = generateSvgFilename(node.name);
                    const filepath = join(assetsDir, filename);

                    // Download the SVG
                    await downloadImage(imageUrl, filepath);

                    // Get file size for reporting
                    const stats = await getFileStats(filepath);

                    downloadedAssets.push({
                        nodeId: node.id,
                        nodeName: node.name,
                        filename,
                        path: `assets/svgs/${filename}`,
                        size: stats.size
                    });
                }

                // Update pubspec.yaml with SVG assets
                const pubspecPath = join(projectPath, 'pubspec.yaml');
                await updatePubspecAssets(pubspecPath, downloadedAssets);

                // Generate SVG asset constants file
                const constantsFile = await generateSvgAssetConstants(downloadedAssets, projectPath);

                let output = `Successfully exported ${svgNodes.length} SVG assets to Flutter project!\n\n`;
                output += `SVG Assets Directory: ${assetsDir}\n\n`;
                output += `Downloaded SVG Assets:\n`;

                downloadedAssets.forEach(asset => {
                    output += `- ${asset.filename} (${asset.size})\n`;
                });

                output += `\nPubspec Configuration:\n`;
                output += `- Merged SVG asset declarations into pubspec.yaml\n`;
                output += `- SVG assets available under: assets/svgs/\n\n`;

                output += `Generated Code:\n`;
                output += `- Merged SVG asset constants into: ${constantsFile}\n`;
                output += `- Import in your Flutter code: import 'package:your_app/constants/svg_assets.dart';\n\n`;

                output += `Usage Note:\n`;
                output += `- Use flutter_svg package to display SVG assets\n`;
                output += `- Add 'flutter_svg: ^2.0.0' to your pubspec.yaml dependencies if not already added\n`;

                return {
                    content: [{type: "text", text: output}]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error exporting SVG assets: ${error instanceof Error ? error.message : String(error)}`
                    }]
                };
            }
        }
    );
}

// Helper function to filter SVG nodes (groups/frames with vector children)
async function filterSvgNodes(fileId: string, targetNodeIds: string[], figmaService: any): Promise<Array<{id: string, name: string, node: any}>> {
    // Get the target nodes
    const targetNodes = await figmaService.getNodes(fileId, targetNodeIds);
    
    const svgNodes: Array<{id: string, name: string, node: any}> = [];

    for (const nodeId of targetNodeIds) {
        const node = targetNodes[nodeId];
        if (!node) continue;

        // Check if this is a potential SVG node
        if (isSvgNode(node)) {
            svgNodes.push({
                id: nodeId,
                name: node.name,
                node: node
            });
        }
    }

    return svgNodes;
}

function isSvgNode(node: any): boolean {
    // SVG nodes are typically:
    // 1. Groups or Frames that contain vector children
    // 2. Single vector nodes
    // 3. Components that are primarily vector-based
    // 4. Component instances that contain vector children
    // 5. Nodes created with pen tool (have vector paths)
    
    if (node.type === 'VECTOR') {
        return true;
    }

    if (node.type === 'BOOLEAN_OPERATION') {
        return true;
    }

    if (node.type === 'GROUP' || node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        // Check if it has vector children or is primarily vector-based
        if (node.children && node.children.length > 0) {
            const vectorChildren = node.children.filter((child: any) => 
                child.type === 'VECTOR' || 
                child.type === 'BOOLEAN_OPERATION' ||
                (child.type === 'GROUP' && hasVectorDescendants(child)) ||
                (child.type === 'INSTANCE' && hasVectorDescendants(child)) ||
                isPenToolNode(child)
            );
            
            // Also check for pen tool usage in the node itself or its children
            const hasPenToolElements = hasPenToolDescendants(node);
            
            // For INSTANCE nodes, be more lenient - if it has any vector children, consider it SVG
            if (node.type === 'INSTANCE' && vectorChildren.length > 0) {
                return true;
            }
            
            // Consider it an SVG if:
            // - It has vector children, OR
            // - It contains pen tool elements, OR  
            // - Most children are vectors
            return (vectorChildren.length > 0 && (
                vectorChildren.length === node.children.length || // All children are vectors
                vectorChildren.length / node.children.length >= 0.5 // At least 50% are vectors
            )) || hasPenToolElements;
        }
    }

    // Check if the node itself is created with pen tool
    if (isPenToolNode(node)) {
        return true;
    }

    return false;
}

function hasVectorDescendants(node: any): boolean {
    if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
        return true;
    }
    
    // INSTANCE nodes can contain vector children
    if (node.type === 'INSTANCE' && node.children) {
        return node.children.some((child: any) => 
            child.type === 'VECTOR' || 
            child.type === 'BOOLEAN_OPERATION' ||
            hasVectorDescendants(child)
        );
    }
    
    if (node.children) {
        return node.children.some((child: any) => hasVectorDescendants(child));
    }
    
    return false;
}

function isPenToolNode(node: any): boolean {
    // Check if this node was created with the pen tool
    // Pen tool nodes are typically VECTOR nodes with specific characteristics:
    
    if (node.type !== 'VECTOR') {
        return false;
    }
    
    // Check for vector network (pen tool creates vector paths)
    if (node.vectorNetwork && node.vectorNetwork.vertices && node.vectorNetwork.segments) {
        const vertices = node.vectorNetwork.vertices;
        const segments = node.vectorNetwork.segments;
        
        // Pen tool creates paths with multiple vertices and segments
        if (vertices.length > 2 && segments.length > 0) {
            // Check if segments have bezier curves (common in pen tool usage)
            const hasBezierCurves = segments.some((segment: any) => 
                segment.tangentStart || segment.tangentEnd
            );
            
            // Check if vertices have handle positions (pen tool characteristic)
            const hasHandles = vertices.some((vertex: any) => 
                vertex.tangentStart || vertex.tangentEnd
            );
            
            return hasBezierCurves || hasHandles || vertices.length > 3;
        }
    }
    
    // Check for fills that indicate custom drawn paths
    if (node.fills && node.fills.length > 0) {
        const hasCustomFill = node.fills.some((fill: any) => 
            fill.type === 'SOLID' || fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL'
        );
        
        // If it has custom fills and no strokes, likely a pen tool shape
        const hasStrokes = node.strokes && node.strokes.length > 0;
        if (hasCustomFill && !hasStrokes && node.vectorNetwork) {
            return true;
        }
    }
    
    // Check for custom strokes (pen tool often used for line art)
    if (node.strokes && node.strokes.length > 0 && node.vectorNetwork) {
        const hasCustomStroke = node.strokes.some((stroke: any) => 
            stroke.type === 'SOLID' && stroke.visible !== false
        );
        
        if (hasCustomStroke && node.vectorNetwork.vertices && node.vectorNetwork.vertices.length > 1) {
            return true;
        }
    }
    
    return false;
}

function hasPenToolDescendants(node: any): boolean {
    // Check if this node or any of its descendants were created with pen tool
    if (isPenToolNode(node)) {
        return true;
    }
    
    if (node.children) {
        return node.children.some((child: any) => hasPenToolDescendants(child));
    }
    
    return false;
}
