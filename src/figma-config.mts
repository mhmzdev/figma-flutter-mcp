// figma-config.mts (enhanced version)
import {FigmaError} from './types/errors.mjs';

export interface FigmaConfig {
    readonly fileId: string;
    readonly defaultPageName: string;
    readonly maxDepth: number;
    readonly maxComponents: number;
    readonly commonNodes: Record<string, string>;
}

export interface FigmaConfigOptions {
    fileId?: string;
    defaultPageName?: string;
    maxDepth?: number;
    maxComponents?: number;
    commonNodes?: Record<string, string>;
}

// Default configuration
const DEFAULT_CONFIG: Omit<FigmaConfig, 'fileId'> = {
    defaultPageName: 'Design',
    maxDepth: 3,
    maxComponents: 10,
    commonNodes: {}
};

class FigmaConfigManager {
    private config: FigmaConfig;

    constructor(options: FigmaConfigOptions = {}) {
        // Try to get fileId from multiple sources
        const fileId = options.fileId ||
            process.env.FIGMA_FILE_ID ||
            '83dXk35avf0BTHtYPWeyl7'; // fallback to your current ID

        this.validateFileId(fileId);

        this.config = {
            fileId,
            defaultPageName: options.defaultPageName || DEFAULT_CONFIG.defaultPageName,
            maxDepth: options.maxDepth || DEFAULT_CONFIG.maxDepth,
            maxComponents: options.maxComponents || DEFAULT_CONFIG.maxComponents,
            commonNodes: {...DEFAULT_CONFIG.commonNodes, ...(options.commonNodes || {})}
        };
    }

    /**
     * Validate Figma file ID format
     * Figma file IDs are typically 22 characters, alphanumeric
     */
    private validateFileId(fileId: string): void {
        if (!fileId || typeof fileId !== 'string') {
            throw new FigmaError('Figma file ID is required', 'INVALID_CONFIG');
        }

        // Remove any whitespace
        fileId = fileId.trim();

        if (fileId.length === 0) {
            throw new FigmaError('Figma file ID cannot be empty', 'INVALID_CONFIG');
        }

        // Figma file IDs are typically 22 characters, alphanumeric
        if (fileId.length < 10 || fileId.length > 50) {
            throw new FigmaError(
                `Invalid Figma file ID length: ${fileId.length}. Expected 10-50 characters.`,
                'INVALID_CONFIG'
            );
        }

        // Check for valid characters (alphanumeric and some special chars)
        const validPattern = /^[a-zA-Z0-9\-_]+$/;
        if (!validPattern.test(fileId)) {
            throw new FigmaError(
                'Invalid Figma file ID format. Only alphanumeric characters, hyphens, and underscores are allowed.',
                'INVALID_CONFIG'
            );
        }
    }

    /**
     * Validate node ID format
     * Figma node IDs are typically in format "123:456"
     */
    private validateNodeId(nodeId: string): void {
        if (!nodeId || typeof nodeId !== 'string') {
            throw new FigmaError('Node ID is required', 'INVALID_CONFIG');
        }

        // Figma node IDs are typically in format "number:number"
        const nodePattern = /^\d+:\d+$/;
        if (!nodePattern.test(nodeId.trim())) {
            throw new FigmaError(
                `Invalid node ID format: "${nodeId}". Expected format: "123:456"`,
                'INVALID_CONFIG'
            );
        }
    }

    // Getters for config values
    get fileId(): string {
        return this.config.fileId;
    }

    get defaultPageName(): string {
        return this.config.defaultPageName;
    }

    get maxDepth(): number {
        return this.config.maxDepth;
    }

    get maxComponents(): number {
        return this.config.maxComponents;
    }

    get commonNodes(): Record<string, string> {
        return {...this.config.commonNodes}; // Return copy to prevent mutation
    }

    /**
     * Get a specific common node ID with validation
     */
    getCommonNode(name: string): string {
        const nodeId = this.config.commonNodes[name];
        if (!nodeId) {
            const availableNodes = Object.keys(this.config.commonNodes).join(', ');
            throw new FigmaError(
                `Common node "${name}" not found. Available nodes: ${availableNodes || 'none'}`,
                'NODE_NOT_FOUND'
            );
        }
        return nodeId;
    }

    /**
     * Create a new config instance with updated values
     * This maintains immutability
     */
    withUpdates(updates: FigmaConfigOptions): FigmaConfigManager {
        return new FigmaConfigManager({
            fileId: updates.fileId || this.config.fileId,
            defaultPageName: updates.defaultPageName || this.config.defaultPageName,
            maxDepth: updates.maxDepth || this.config.maxDepth,
            maxComponents: updates.maxComponents || this.config.maxComponents,
            commonNodes: {...this.config.commonNodes, ...(updates.commonNodes || {})}
        });
    }

    /**
     * Add or update a common node
     */
    withCommonNode(name: string, nodeId: string): FigmaConfigManager {
        this.validateNodeId(nodeId);
        return this.withUpdates({
            commonNodes: {[name]: nodeId}
        });
    }

    /**
     * Get config summary for debugging
     */
    getSummary(): string {
        return `Figma Config:
  File ID: ${this.fileId}
  Default Page: ${this.defaultPageName}
  Max Depth: ${this.maxDepth}
  Max Components: ${this.maxComponents}
  Common Nodes: ${Object.keys(this.commonNodes).length} defined`;
    }

    /**
     * Export config as plain object
     */
    toObject(): FigmaConfig {
        return {...this.config};
    }
}

// Create default instance
export const figmaConfig = new FigmaConfigManager();

// Helper functions for backward compatibility
export function getFileId(): string {
    return figmaConfig.fileId;
}

export function validateFileId(fileId?: string): boolean {
    try {
        new FigmaConfigManager({fileId: fileId || figmaConfig.fileId});
        return true;
    } catch (error) {
        if (error instanceof FigmaError) {
            throw error;
        }
        throw new FigmaError(`Validation failed: ${error}`, 'VALIDATION_ERROR');
    }
}

// Enhanced helper functions
export function validateNodeId(nodeId: string): boolean {
    const config = new FigmaConfigManager();
    try {
        config['validateNodeId'](nodeId); // Access private method for validation
        return true;
    } catch (error) {
        if (error instanceof FigmaError) {
            throw error;
        }
        throw new FigmaError(`Node ID validation failed: ${error}`, 'VALIDATION_ERROR');
    }
}

export function createConfig(options: FigmaConfigOptions): FigmaConfigManager {
    return new FigmaConfigManager(options);
}

// Environment-based config creation
export function createConfigFromEnv(): FigmaConfigManager {
    return new FigmaConfigManager({
        fileId: process.env.FIGMA_FILE_ID,
        maxDepth: process.env.FIGMA_MAX_DEPTH ? parseInt(process.env.FIGMA_MAX_DEPTH, 10) : undefined,
        maxComponents: process.env.FIGMA_MAX_COMPONENTS ? parseInt(process.env.FIGMA_MAX_COMPONENTS, 10) : undefined
    });
}