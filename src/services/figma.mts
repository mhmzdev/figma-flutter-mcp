// services/figma.mts
import fetch from 'node-fetch';
import type {FigmaFile, FigmaNode, FigmaFileInfo, FigmaPageInfo, NodeResponse, PageResponse} from '../types/figma.mjs';
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
     * Core API request method with retry logic
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

                if (!response.ok) {
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

                    if (response.status === 404) {
                        throw new FigmaNotFoundError('API endpoint', endpoint);
                    }

                    throw error;
                }

                const data = await response.json() as T;
                console.log(`✅ Successfully fetched: ${endpoint}`);
                return data;

            } catch (error) {
                if (error instanceof FigmaError) {
                    throw error;
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
     * Get complete Figma file data
     */
    async getFile(fileId: string): Promise<FigmaFile> {
        if (!fileId || fileId.trim().length === 0) {
            throw new FigmaError('File ID is required', 'INVALID_INPUT');
        }

        try {
            const data = await this.makeRequest<FigmaFile>(`/files/${fileId}`);

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
     * Get specific nodes by IDs
     */
    async getNodes(fileId: string, nodeIds: string[]): Promise<Record<string, FigmaNode>> {
        if (!nodeIds || nodeIds.length === 0) {
            throw new FigmaError('At least one node ID is required', 'INVALID_INPUT');
        }

        try {
            const data = await this.makeRequest<any>(`/files/${fileId}/nodes?ids=${nodeIds.join(',')}`);

            const nodes: Record<string, FigmaNode> = {};
            Object.entries(data.nodes || {}).forEach(([nodeId, nodeData]: [string, any]) => {
                if (nodeData?.document) {
                    nodes[nodeId] = nodeData.document;
                }
            });

            return nodes;
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to fetch nodes: ${error}`, 'FETCH_ERROR');
        }
    }

    /**
     * Get a single node by ID
     */
    async getNode(fileId: string, nodeId: string): Promise<FigmaNode> {
        if (!nodeId || nodeId.trim().length === 0) {
            throw new FigmaError('Node ID is required', 'INVALID_INPUT');
        }

        try {
            const data = await this.makeRequest<NodeResponse>(`/files/${fileId}/nodes?ids=${nodeId}`);

            if (!data.nodes || !data.nodes[nodeId]) {
                throw new FigmaNotFoundError('Node', nodeId);
            }

            const nodeData = data.nodes[nodeId];
            if (!nodeData.document) {
                throw new FigmaParseError('Invalid node structure received from Figma API', nodeData);
            }

            return nodeData.document;
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to fetch node ${nodeId}: ${error}`, 'FETCH_ERROR');
        }
    }

    /**
     * Get a specific page by ID from a file
     */
    async getPage(fileId: string, pageId: string): Promise<FigmaNode> {
        if (!pageId || pageId.trim().length === 0) {
            throw new FigmaError('Page ID is required', 'INVALID_INPUT');
        }

        try {
            // Pages are retrieved using the same nodes endpoint since pages are nodes
            const data = await this.makeRequest<NodeResponse>(`/files/${fileId}/nodes?ids=${pageId}`);

            if (!data.nodes || !data.nodes[pageId]) {
                throw new FigmaNotFoundError('Page', pageId);
            }

            const pageData = data.nodes[pageId];
            if (!pageData.document) {
                throw new FigmaParseError('Invalid page structure received from Figma API', pageData);
            }

            // Verify this is actually a page node
            if (pageData.document.type !== 'CANVAS') {
                throw new FigmaError(`Node ${pageId} is not a page (type: ${pageData.document.type})`, 'INVALID_NODE_TYPE');
            }

            return pageData.document;
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to fetch page ${pageId}: ${error}`, 'FETCH_ERROR');
        }
    }

    /**
     * Get image export URLs
     */
    async getImageExportUrls(
        fileId: string,
        nodeIds: string[],
        options: {
            format?: 'png' | 'jpg' | 'svg' | 'pdf';
            scale?: number;
            svgIncludeId?: boolean;
            svgSimplifyStroke?: boolean;
            svgOutlineText?: boolean;
        } = {}
    ): Promise<Record<string, string>> {
        if (!nodeIds || nodeIds.length === 0) {
            return {};
        }

        const params = new URLSearchParams({
            ids: nodeIds.join(','),
            format: options.format || 'png'
        });

        if (options.scale && ['png', 'jpg'].includes(options.format || 'png')) {
            params.append('scale', options.scale.toString());
        }

        if (options.format === 'svg') {
            if (options.svgIncludeId !== undefined) {
                params.append('svg_include_id', options.svgIncludeId.toString());
            }
            if (options.svgSimplifyStroke !== undefined) {
                params.append('svg_simplify_stroke', options.svgSimplifyStroke.toString());
            }
            if (options.svgOutlineText !== undefined) {
                params.append('svg_outline_text', options.svgOutlineText.toString());
            }
        }

        try {
            const response = await this.makeRequest<any>(`/images/${fileId}?${params}`);

            if (response.err) {
                throw new FigmaError(`Image export failed: ${response.err}`, 'EXPORT_ERROR');
            }

            // Filter out null values
            const validImages: Record<string, string> = {};
            Object.entries(response.images || {}).forEach(([nodeId, url]) => {
                if (url && typeof url === 'string') {
                    validImages[nodeId] = url;
                }
            });

            return validImages;
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to export images: ${error}`, 'EXPORT_ERROR');
        }
    }

    /**
     * Get image fills used in the file
     */
    async getImageFillUrls(fileId: string): Promise<Record<string, string>> {
        try {
            const response = await this.makeRequest<any>(`/files/${fileId}/images`);
            return response.meta?.images || {};
        } catch (error) {
            if (error instanceof FigmaError) {
                throw error;
            }
            throw new FigmaError(`Failed to fetch image fills: ${error}`, 'FETCH_ERROR');
        }
    }
}