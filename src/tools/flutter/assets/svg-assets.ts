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
            description: "Export SVG assets from Figma nodes. Detects SVG content by analyzing vector percentage - nodes with >30% vector content are considered SVG assets. Handles nested GROUP/FRAME structures with mixed content.",
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
                            text: "No SVG assets found in the specified nodes. SVG detection looks for:\n" +
                                  "- Direct VECTOR or BOOLEAN_OPERATION nodes\n" +
                                  "- GROUP/FRAME/COMPONENT/INSTANCE nodes with ≥30% vector content\n" +
                                  "- Nodes created with pen tool\n\n" +
                                  "Check the console logs for detailed analysis of each node's vector percentage."
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

                downloadedAssets.forEach((asset, index) => {
                    const svgNode = svgNodes.find(n => n.id === asset.nodeId);
                    const vectorInfo = svgNode?.vectorPercentage ? ` | Vector: ${(svgNode.vectorPercentage * 100).toFixed(1)}%` : '';
                    output += `- ${asset.filename} (${asset.size})${vectorInfo}\n`;
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

// Helper function to filter SVG nodes with enhanced detection
async function filterSvgNodes(fileId: string, targetNodeIds: string[], figmaService: any): Promise<Array<{id: string, name: string, node: any, vectorPercentage?: number}>> {
    // Get the target nodes
    const targetNodes = await figmaService.getNodes(fileId, targetNodeIds);
    
    const svgNodes: Array<{id: string, name: string, node: any, vectorPercentage?: number}> = [];
    const analysisResults: Array<{id: string, name: string, type: string, vectorPercentage: number, isSvg: boolean}> = [];

    for (const nodeId of targetNodeIds) {
        const node = targetNodes[nodeId];
        if (!node) continue;

        // Calculate vector percentage for analysis
        let vectorPercentage = 0;
        if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
            vectorPercentage = 1.0; // 100% vector
        } else if (node.type === 'GROUP' || node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            vectorPercentage = calculateVectorPercentage(node);
        }

        const isSvg = isSvgNode(node);
        
        // Store analysis results for debugging
        analysisResults.push({
            id: nodeId,
            name: node.name,
            type: node.type,
            vectorPercentage: Math.round(vectorPercentage * 100) / 100, // Round to 2 decimal places
            isSvg
        });

        // Check if this is a potential SVG node
        if (isSvg) {
            svgNodes.push({
                id: nodeId,
                name: node.name,
                node: node,
                vectorPercentage
            });
        }
    }

    // Log analysis results for debugging (this will help users understand why nodes were/weren't selected)
    console.log('SVG Node Analysis Results:');
    analysisResults.forEach(result => {
        const status = result.isSvg ? '✓ SVG' : '✗ Not SVG';
        console.log(` 🎨 ${status} | ${result.name} (${result.type}) | Vector: ${(result.vectorPercentage * 100).toFixed(1)}%`);
    });

    return svgNodes;
}

function isSvgNode(node: any): boolean {
    // Direct vector nodes are always SVG
    if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
        return true;
    }

    // Check if the node itself is created with pen tool
    if (isPenToolNode(node)) {
        return true;
    }

    // For container nodes (GROUP, FRAME, COMPONENT, INSTANCE), calculate vector percentage
    if (node.type === 'GROUP' || node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        const vectorPercentage = calculateVectorPercentage(node);
        
        // Consider it SVG if more than 25% of the content is vector-based
        return vectorPercentage >= 0.25;
    }

    return false;
}

/**
 * Calculate the percentage of vector content in a node and its descendants
 * @param node The node to analyze
 * @returns A number between 0 and 1 representing the percentage of vector content
 */
function calculateVectorPercentage(node: any): number {
    const nodeStats = analyzeNodeComposition(node);
    
    if (nodeStats.totalNodes === 0) {
        return 0;
    }
    
    return nodeStats.vectorNodes / nodeStats.totalNodes;
}

/**
 * Recursively analyze the composition of a node and its descendants
 * @param node The node to analyze
 * @returns Object with counts of total nodes and vector nodes
 */
function analyzeNodeComposition(node: any): { totalNodes: number; vectorNodes: number } {
    let totalNodes = 1; // Count the current node
    let vectorNodes = 0;
    
    // Check if current node is vector-based
    if (isVectorBasedNode(node)) {
        vectorNodes = 1;
    }
    
    // Recursively analyze children
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            const childStats = analyzeNodeComposition(child);
            totalNodes += childStats.totalNodes;
            vectorNodes += childStats.vectorNodes;
        }
    }
    
    return { totalNodes, vectorNodes };
}

/**
 * Check if a single node is vector-based (without considering children)
 * @param node The node to check
 * @returns True if the node is vector-based
 */
function isVectorBasedNode(node: any): boolean {
    // Direct vector types
    if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
        return true;
    }
    
    // Pen tool created nodes
    if (isPenToolNode(node)) {
        return true;
    }
    
    // Some instances might be vector-based components
    if (node.type === 'INSTANCE') {
        // If an instance has vector-like properties, consider it vector-based
        return hasVectorLikeProperties(node);
    }
    
    return false;
}

/**
 * Check if a node has vector-like properties (for instances and other edge cases)
 * @param node The node to check
 * @returns True if the node has vector-like properties
 */
function hasVectorLikeProperties(node: any): boolean {
    // Check for vector-like fills or strokes
    const hasVectorFills = node.fills && node.fills.some((fill: any) => 
        fill.type === 'SOLID' || fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL'
    );
    
    const hasVectorStrokes = node.strokes && node.strokes.some((stroke: any) => 
        stroke.type === 'SOLID' && stroke.visible !== false
    );
    
    // Check for vector network or path data
    const hasVectorNetwork = node.vectorNetwork && 
        node.vectorNetwork.vertices && 
        node.vectorNetwork.segments;
    
    return hasVectorNetwork || (hasVectorFills && hasVectorStrokes);
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
