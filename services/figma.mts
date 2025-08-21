// services/figma.mts (enhanced version)
import fetch from 'node-fetch';
import type {FigmaFile, FigmaNode, FigmaFileInfo, FigmaPageInfo} from '../types/figma.mjs';
import {
    FigmaError,
    FigmaAuthError,
    FigmaNotFoundError,
    FigmaNetworkError,
    FigmaParseError,
    createFigmaError
} from '../types/errors.mjs';
import {withRetry} from '../utils/retry.mjs';

export class FigmaService {
    private accessToken: string;
    private baseUrl = 'https://api.figma.com/v1';

    constructor(accessToken: string) {
        if (!accessToken || accessToken.trim().length === 0) {
            throw new FigmaAuthError('Figma access token is required');
        }
        this.accessToken = accessToken;
    }

    /**
     * Make a request to the Figma API with retry logic and proper error handling
     */
    private async makeRequest<T>(endpoint: string): Promise<T> {
        return withRetry(async () => {
            const url = `${this.baseUrl}${endpoint}`;

            try {
                console.log(`🔄 Making Figma API request: ${endpoint}`);

                const response = await fetch(url, {
                    headers: {
                        'X-Figma-Token': this.accessToken,
                        'Content-Type': 'application/json'
                    }
                });

                // Handle non-200 responses
                if (!response.ok) {
                    // Try to get error details from response body
                    let errorDetails = '';
                    try {
                        const errorBody = await response.text();
                        if (errorBody) {
                            const parsedError = JSON.parse(errorBody);
                            errorDetails = parsedError.message || parsedError.error || errorBody;
                        }
                    } catch {
                        // Ignore parse errors for error body
                    }

                    const error = createFigmaError(response, errorDetails);

                    // Add more context for specific errors
                    if (response.status === 404) {
                        throw new FigmaNotFoundError('API endpoint', endpoint);
                    }

                    throw error;
                }

                // Parse response
                const data = await response.json() as T;
                console.log(`✅ Successfully fetched: ${endpoint}`);
                return data;

            } catch (error) {
                // Convert fetch errors to our error types
                if (error instanceof FigmaError) {
                    throw error; // Re-throw our custom errors
                }

                if (error instanceof Error) {
                    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                        throw new FigmaNetworkError('Unable to connect to Figma API', error);
                    }

                    if (error.name === 'SyntaxError') {
                        throw new FigmaParseError('Invalid JSON response from Figma API', error);
                    }
                }

                throw new FigmaNetworkError(`Unexpected error: ${error}`, error as Error);
            }
        }, {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000
        });
    }

    /**
     * Fetch a complete Figma file with enhanced error handling
     */
    async getFile(fileId: string): Promise<FigmaFile> {
        if (!fileId || fileId.trim().length === 0) {
            throw new FigmaError('File ID is required', 'INVALID_INPUT');
        }

        try {
            const data = await this.makeRequest<FigmaFile>(`/files/${fileId}`);

            // Validate response structure
            if (!data.document || !data.name) {
                throw new FigmaParseError('Invalid file structure received from Figma API', data);
            }

            return data;
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to fetch file ${fileId}: ${error}`, 'FETCH_ERROR');
        }
    }

    /**
     * Get basic file information with validation
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
     * Get all pages in a file with validation
     */
    async getPages(fileId: string): Promise<FigmaPageInfo[]> {
        const file = await this.getFile(fileId);

        if (!file.document?.children) {
            throw new FigmaParseError('File has no pages or invalid structure');
        }

        return file.document.children.map((page) => ({
            id: page.id,
            name: page.name,
            type: page.type
        }));
    }

    /**
     * Get a specific page by ID with better error messages
     */
    async getPage(fileId: string, pageId?: string): Promise<FigmaNode> {
        const file = await this.getFile(fileId);

        if (!file.document?.children || file.document.children.length === 0) {
            throw new FigmaNotFoundError('pages', fileId);
        }

        if (!pageId) {
            // Return first page if no pageId specified
            return file.document.children[0];
        }

        const page = file.document.children.find(page => page.id === pageId);
        if (!page) {
            const availablePages = file.document.children
                .map(p => `${p.name} (${p.id})`)
                .join(', ');
            throw new FigmaNotFoundError(
                'page',
                `${pageId}. Available pages: ${availablePages}`
            );
        }

        return page;
    }

    /**
     * Get a specific node by ID with enhanced error handling
     */
    async getNode(fileId: string, nodeId: string): Promise<FigmaNode> {
        if (!nodeId || nodeId.trim().length === 0) {
            throw new FigmaError('Node ID is required', 'INVALID_INPUT');
        }

        try {
            const data = await this.makeRequest<any>(`/files/${fileId}/nodes?ids=${nodeId}`);

            if (!data.nodes || !data.nodes[nodeId]) {
                throw new FigmaNotFoundError('node', nodeId);
            }

            const node = data.nodes[nodeId]?.document;
            if (!node) {
                throw new FigmaParseError(`Node ${nodeId} exists but has no document data`);
            }

            return node;
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to fetch node ${nodeId}: ${error}`, 'FETCH_ERROR');
        }
    }

    /**
     * Explore node structure with depth limit and error handling
     */
    exploreNodeStructure(node: FigmaNode, maxDepth = 3, currentDepth = 0): string {
        try {
            const indent = '  '.repeat(currentDepth);
            let result = `${indent}📦 ${node.name || 'Unnamed'} (${node.type})\n`;
            result += `${indent}   ID: ${node.id}\n`;

            if (node.visible === false) {
                result += `${indent}   ⚠️ Hidden\n`;
            }

            if (node.children && node.children.length > 0 && currentDepth < maxDepth) {
                result += `${indent}   Children (${node.children.length}):\n`;

                // Show first 10 children to avoid overwhelming output
                const childrenToShow = node.children.slice(0, 10);

                for (const child of childrenToShow) {
                    try {
                        result += this.exploreNodeStructure(child, maxDepth, currentDepth + 1);
                    } catch (error) {
                        result += `${indent}     ❌ Error exploring child: ${error}\n`;
                    }
                }

                if (node.children.length > 10) {
                    result += `${indent}     ... and ${node.children.length - 10} more children\n`;
                }
            } else if (node.children && node.children.length > 0) {
                result += `${indent}   📁 ${node.children.length} children (max depth reached)\n`;
            }

            return result;
        } catch (error) {
            return `❌ Error exploring node ${node.id}: ${error}\n`;
        }
    }
}