// src/services/figma.mts
import fetch from 'node-fetch';
import type {FigmaFile, FigmaNode, FigmaFileInfo, FigmaPageInfo} from '../types/figma.mjs';

export class FigmaService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Fetch a complete Figma file
     */
    async getFile(fileId: string): Promise<FigmaFile> {
        const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
            headers: {
                'X-Figma-Token': this.accessToken
            }
        });

        if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }

        return await response.json() as FigmaFile;
    }

    /**
     * Get basic file information
     */
    async getFileInfo(fileId: string): Promise<FigmaFileInfo> {
        const file = await this.getFile(fileId);

        return {
            name: file.name,
            lastModified: file.lastModified,
            version: file.version,
            role: file.role,
            editorType: file.editorType,
            componentCount: Object.keys(file.components || {}).length,
            styleCount: Object.keys(file.styles || {}).length,
            pageCount: file.document?.children?.length || 0
        };
    }

    /**
     * Get all pages in a file
     */
    async getPages(fileId: string): Promise<FigmaPageInfo[]> {
        const file = await this.getFile(fileId);

        return file.document?.children?.map((page) => ({
            id: page.id,
            name: page.name,
            type: page.type
        })) || [];
    }

    /**
     * Get a specific page by ID
     */
    async getPage(fileId: string, pageId?: string): Promise<FigmaNode> {
        const file = await this.getFile(fileId);

        if (!pageId) {
            // Return first page if no pageId specified
            const firstPage = file.document.children?.[0];
            if (!firstPage) {
                throw new Error('No pages found in the file');
            }
            return firstPage;
        }

        const page = file.document.children?.find(page => page.id === pageId);
        if (!page) {
            const availablePages = file.document.children?.map(p => `${p.name} (${p.id})`).join(', ') || 'none';
            throw new Error(`Page not found. Available pages: ${availablePages}`);
        }

        return page;
    }

    /**
     * Get a specific node by ID
     */
    async getNode(fileId: string, nodeId: string): Promise<FigmaNode> {
        const response = await fetch(`https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`, {
            headers: {
                'X-Figma-Token': this.accessToken
            }
        });

        if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        const node = data.nodes[nodeId]?.document;

        if (!node) {
            throw new Error(`Node not found: ${nodeId}`);
        }

        return node;
    }

    /**
     * Recursively explore node structure with depth limit
     */
    exploreNodeStructure(node: FigmaNode, maxDepth = 3, currentDepth = 0): string {
        const indent = '  '.repeat(currentDepth);
        let result = `${indent}📦 ${node.name} (${node.type})\n`;
        result += `${indent}   ID: ${node.id}\n`;

        if (node.visible === false) {
            result += `${indent}   ⚠️ Hidden\n`;
        }

        if (node.children && node.children.length > 0 && currentDepth < maxDepth) {
            result += `${indent}   Children (${node.children.length}):\n`;

            // Show first 10 children to avoid overwhelming output
            const childrenToShow = node.children.slice(0, 10);

            for (const child of childrenToShow) {
                result += this.exploreNodeStructure(child, maxDepth, currentDepth + 1);
            }

            if (node.children.length > 10) {
                result += `${indent}     ... and ${node.children.length - 10} more children\n`;
            }
        } else if (node.children && node.children.length > 0) {
            result += `${indent}   📁 ${node.children.length} children (max depth reached)\n`;
        }

        return result;
    }
}