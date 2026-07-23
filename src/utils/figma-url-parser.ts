// src/utils/figma-url-parser.mts

import {FigmaError} from '../types/errors.js';

/**
 * Component input parsing result
 */
export interface ComponentInput {
    fileId: string;
    nodeId: string;
    source: 'url' | 'direct';
    isValid: boolean;
    error?: string;
}

/**
 * Parse Figma component input from URL or direct parameters
 * Supports:
 * - https://www.figma.com/file/{fileId}/...?node-id={nodeId}
 * - https://www.figma.com/design/{fileId}/...?node-id={nodeId}
 * - Figma URL + separate nodeId (explicit nodeId wins over URL node-id)
 * - Direct fileId and nodeId parameters
 */
export function parseComponentInput(input: string, nodeId?: string): ComponentInput {
    try {
        const trimmedInput = input.trim();
        const explicitNodeId = nodeId?.trim();

        // URL input: always extract fileId from the URL first.
        // When a separate nodeId is also provided, it overrides the URL node-id.
        if (trimmedInput.includes('figma.com')) {
            const {fileId, nodeIdFromUrl} = extractIdsFromUrl(trimmedInput);
            const resolvedNodeId = explicitNodeId || nodeIdFromUrl;
            if (!resolvedNodeId) {
                throw new FigmaError('Node ID not found in URL parameters', 'INVALID_URL');
            }

            return {
                fileId,
                nodeId: validateAndConvertNodeId(resolvedNodeId),
                source: 'url',
                isValid: true
            };
        }

        // Plain fileId + separate nodeId
        if (explicitNodeId) {
            return {
                fileId: validateFileId(trimmedInput),
                nodeId: validateAndConvertNodeId(explicitNodeId),
                source: 'direct',
                isValid: true
            };
        }

        // fileId:nodeId shorthand
        if (trimmedInput.includes(':') && trimmedInput.split(':').length === 2) {
            const [fileIdPart, nodeIdPart] = trimmedInput.split(':');
            const validatedFileId = validateFileId(fileIdPart.trim());
            const validatedNodeId = validateAndConvertNodeId(`${fileIdPart.trim()}:${nodeIdPart.trim()}`);

            return {
                fileId: validatedFileId,
                nodeId: validatedNodeId,
                source: 'direct',
                isValid: true
            };
        }

        throw new FigmaError('Invalid input format. Expected Figma URL or fileId:nodeId format', 'INVALID_INPUT');

    } catch (error) {
        return {
            fileId: '',
            nodeId: '',
            source: 'direct',
            isValid: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Extract file ID and optional node ID from a Figma URL.
 */
function extractIdsFromUrl(url: string): {fileId: string; nodeIdFromUrl?: string} {
    try {
        const urlObj = new URL(url.trim());

        if (!urlObj.hostname.includes('figma.com')) {
            throw new FigmaError('Not a valid Figma URL', 'INVALID_URL');
        }

        // Paths can be: /file/{fileId}/... or /design/{fileId}/...
        const pathMatch = urlObj.pathname.match(/\/(file|design)\/([a-zA-Z0-9\-_]+)/);
        if (!pathMatch || !pathMatch[2]) {
            throw new FigmaError('Could not extract file ID from URL', 'INVALID_URL');
        }

        const fileId = validateFileId(pathMatch[2]);
        const nodeIdParam = urlObj.searchParams.get('node-id') || urlObj.searchParams.get('node_id') || undefined;

        return {
            fileId,
            nodeIdFromUrl: nodeIdParam || undefined
        };
    } catch (error) {
        throw new FigmaError(
            `Failed to parse Figma URL: ${error instanceof Error ? error.message : String(error)}`,
            'URL_PARSE_ERROR'
        );
    }
}

/**
 * Validate Figma file ID format
 */
function validateFileId(fileId: string): string {
    if (!fileId || typeof fileId !== 'string') {
        throw new FigmaError('File ID is required', 'INVALID_FILE_ID');
    }

    const trimmed = fileId.trim();

    if (trimmed.length === 0) {
        throw new FigmaError('File ID cannot be empty', 'INVALID_FILE_ID');
    }

    if (trimmed.length < 10 || trimmed.length > 50) {
        throw new FigmaError(
            `Invalid file ID length: ${trimmed.length}. Expected 10-50 characters.`,
            'INVALID_FILE_ID'
        );
    }

    // File IDs contain alphanumeric characters, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(trimmed)) {
        throw new FigmaError(
            'Invalid file ID format. Only alphanumeric characters, hyphens, and underscores allowed.',
            'INVALID_FILE_ID'
        );
    }

    return trimmed;
}

/**
 * Validate and convert node ID to correct format
 * Handles both "123-456" (URL format) and "123:456" (API format)
 */
function validateAndConvertNodeId(nodeId: string): string {
    if (!nodeId || typeof nodeId !== 'string') {
        throw new FigmaError('Node ID is required', 'INVALID_NODE_ID');
    }

    const trimmed = nodeId.trim();

    if (trimmed.length === 0) {
        throw new FigmaError('Node ID cannot be empty', 'INVALID_NODE_ID');
    }

    // Convert URL format (123-456) to API format (123:456) if needed
    let apiFormat = trimmed;
    if (trimmed.includes('-') && !trimmed.includes(':')) {
        // Replace first hyphen with colon (handle cases like "123-456-789")
        const parts = trimmed.split('-');
        if (parts.length >= 2) {
            apiFormat = `${parts[0]}:${parts.slice(1).join('-')}`;
        }
    }

    // Validate API format
    const nodePattern = /^\d+:\d+$/;
    if (!nodePattern.test(apiFormat)) {
        throw new FigmaError(
            `Invalid node ID format: "${trimmed}". Expected format: "123:456" or "123-456"`,
            'INVALID_NODE_ID'
        );
    }

    return apiFormat;
}

/**
 * Check if a string is a valid node ID format
 */
export function isValidNodeIdFormat(nodeId: string): boolean {
    try {
        validateAndConvertNodeId(nodeId);
        return true;
    } catch {
        return false;
    }
}

/**
 * Extract file ID and node ID from various input formats
 * Used for batch operations or validation
 */
export function extractIds(input: string): {fileId?: string; nodeId?: string} {
    try {
        const parsed = parseComponentInput(input);
        if (parsed.isValid) {
            return {
                fileId: parsed.fileId,
                nodeId: parsed.nodeId
            };
        }
    } catch {
        // Ignore errors for this helper function
    }

    return {};
}

/**
 * Generate Figma URL from file ID and node ID
 */
export function generateFigmaUrl(fileId: string, nodeId: string): string {
    const validatedFileId = validateFileId(fileId);
    const validatedNodeId = validateAndConvertNodeId(nodeId);

    // Convert API format back to URL format (123:456 -> 123-456)
    const urlNodeId = validatedNodeId.replace(':', '-');

    return `https://www.figma.com/file/${validatedFileId}?node-id=${urlNodeId}`;
}

/**
 * Check if input looks like a Figma URL
 */
export function isFigmaUrl(input: string): boolean {
    try {
        const url = new URL(input.trim());
        return url.hostname.includes('figma.com') &&
            (url.pathname.includes('/file/') || url.pathname.includes('/design/'));
    } catch {
        return false;
    }
}