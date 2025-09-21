// src/tools/flutter/assets/node-filter.ts
import type { FigmaService } from '../../../services/figma.js';

/**
 * Filters nodes to find those that represent images.
 */
export async function filterImageNodes(fileId: string, targetNodeIds: string[], figmaService: FigmaService): Promise<Array<{id: string, name: string, node: any}>> {
    const targetNodes = await figmaService.getNodes(fileId, targetNodeIds);
    const allNodesWithImages: Array<{id: string, name: string, node: any}> = [];

    function extractImageNodes(node: any, nodeId: string = node.id): void {
        if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE' && fill.visible !== false)) {
            allNodesWithImages.push({ id: nodeId, name: node.name, node: node });
        }

        if (node.type === 'VECTOR' && node.name) {
            const name = node.name.toLowerCase();
            if ((name.includes('image') || name.includes('illustration') || name.includes('graphic')) && !name.includes('icon') && !name.includes('button')) {
                allNodesWithImages.push({ id: nodeId, name: node.name, node: node });
            }
        }

        if ((node.type === 'RECTANGLE' || node.type === 'FRAME') && node.name) {
            const name = node.name.toLowerCase();
            const hasImageKeywords = name.includes('image') || name.includes('photo') || name.includes('picture') || name.includes('banner') || name.includes('hero') || name.includes('thumbnail') || name.includes('background') || name.includes('cover');
            const hasImageFills = node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE');
            const isLargeEnough = node.absoluteBoundingBox && (node.absoluteBoundingBox.width > 80 && node.absoluteBoundingBox.height > 80);
            
            if (hasImageKeywords && (hasImageFills || isLargeEnough)) {
                allNodesWithImages.push({ id: nodeId, name: node.name, node: node });
            }
        }

        if (node.children) {
            node.children.forEach((child: any) => {
                extractImageNodes(child, child.id);
            });
        }
    }

    Object.values(targetNodes).forEach((node: any) => {
        extractImageNodes(node);
    });

    return allNodesWithImages;
}
