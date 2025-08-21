// utils/validation.mts
import {FigmaError} from '../types/errors.mjs';

/**
 * Utility class for validating Figma-related inputs
 */
export class FigmaValidator {
    /**
     * Validate Figma file ID
     * @param fileId The file ID to validate
     * @param fieldName Optional field name for error messages
     */
    static validateFileId(fileId: unknown, fieldName = 'fileId'): string {
        if (typeof fileId !== 'string') {
            throw new FigmaError(`${fieldName} must be a string`, 'VALIDATION_ERROR');
        }

        const trimmed = fileId.trim();

        if (trimmed.length === 0) {
            throw new FigmaError(`${fieldName} cannot be empty`, 'VALIDATION_ERROR');
        }

        if (trimmed.length < 10 || trimmed.length > 50) {
            throw new FigmaError(
                `${fieldName} length must be between 10-50 characters, got ${trimmed.length}`,
                'VALIDATION_ERROR'
            );
        }

        const validPattern = /^[a-zA-Z0-9\-_]+$/;
        if (!validPattern.test(trimmed)) {
            throw new FigmaError(
                `${fieldName} contains invalid characters. Only alphanumeric, hyphens, and underscores allowed`,
                'VALIDATION_ERROR'
            );
        }

        return trimmed;
    }

    /**
     * Validate Figma node ID
     * @param nodeId The node ID to validate
     * @param fieldName Optional field name for error messages
     */
    static validateNodeId(nodeId: unknown, fieldName = 'nodeId'): string {
        if (typeof nodeId !== 'string') {
            throw new FigmaError(`${fieldName} must be a string`, 'VALIDATION_ERROR');
        }

        const trimmed = nodeId.trim();

        if (trimmed.length === 0) {
            throw new FigmaError(`${fieldName} cannot be empty`, 'VALIDATION_ERROR');
        }

        // Figma node IDs are typically in format "number:number"
        const nodePattern = /^\d+:\d+$/;
        if (!nodePattern.test(trimmed)) {
            throw new FigmaError(
                `${fieldName} must be in format "123:456", got "${trimmed}"`,
                'VALIDATION_ERROR'
            );
        }

        return trimmed;
    }

    /**
     * Validate depth parameter
     * @param depth The depth to validate
     * @param fieldName Optional field name for error messages
     */
    static validateDepth(depth: unknown, fieldName = 'depth'): number {
        if (depth === undefined || depth === null) {
            return 3; // Default depth
        }

        if (typeof depth !== 'number' || !Number.isInteger(depth)) {
            throw new FigmaError(`${fieldName} must be an integer`, 'VALIDATION_ERROR');
        }

        if (depth < 1 || depth > 10) {
            throw new FigmaError(
                `${fieldName} must be between 1-10, got ${depth}`,
                'VALIDATION_ERROR'
            );
        }

        return depth;
    }

    /**
     * Validate max components parameter
     * @param maxComponents The max components to validate
     * @param fieldName Optional field name for error messages
     */
    static validateMaxComponents(maxComponents: unknown, fieldName = 'maxComponents'): number {
        if (maxComponents === undefined || maxComponents === null) {
            return 10; // Default max components
        }

        if (typeof maxComponents !== 'number' || !Number.isInteger(maxComponents)) {
            throw new FigmaError(`${fieldName} must be an integer`, 'VALIDATION_ERROR');
        }

        if (maxComponents < 1 || maxComponents > 100) {
            throw new FigmaError(
                `${fieldName} must be between 1-100, got ${maxComponents}`,
                'VALIDATION_ERROR'
            );
        }

        return maxComponents;
    }

    /**
     * Validate and sanitize widget name for Flutter
     * @param name The widget name to validate
     * @param fieldName Optional field name for error messages
     */
    static validateWidgetName(name: unknown, fieldName = 'widgetName'): string {
        if (typeof name !== 'string') {
            throw new FigmaError(`${fieldName} must be a string`, 'VALIDATION_ERROR');
        }

        const trimmed = name.trim();

        if (trimmed.length === 0) {
            throw new FigmaError(`${fieldName} cannot be empty`, 'VALIDATION_ERROR');
        }

        // Check for valid Dart/Flutter class name
        const validDartName = /^[A-Z][a-zA-Z0-9_]*$/;
        if (!validDartName.test(trimmed)) {
            throw new FigmaError(
                `${fieldName} "${trimmed}" is not a valid Flutter class name. Must start with uppercase letter and contain only letters, numbers, and underscores`,
                'VALIDATION_ERROR'
            );
        }

        return trimmed;
    }

    /**
     * Comprehensive validation for tool inputs
     * @param inputs Object containing inputs to validate
     */
    static validateToolInputs(inputs: {
        fileId?: unknown;
        nodeId?: unknown;
        depth?: unknown;
        maxComponents?: unknown;
        widgetName?: unknown;
    }): {
        fileId?: string;
        nodeId?: string;
        depth?: number;
        maxComponents?: number;
        widgetName?: string;
    } {
        const result: any = {};

        if (inputs.fileId !== undefined) {
            result.fileId = this.validateFileId(inputs.fileId);
        }

        if (inputs.nodeId !== undefined) {
            result.nodeId = this.validateNodeId(inputs.nodeId);
        }

        if (inputs.depth !== undefined) {
            result.depth = this.validateDepth(inputs.depth);
        }

        if (inputs.maxComponents !== undefined) {
            result.maxComponents = this.validateMaxComponents(inputs.maxComponents);
        }

        if (inputs.widgetName !== undefined) {
            result.widgetName = this.validateWidgetName(inputs.widgetName);
        }

        return result;
    }
}