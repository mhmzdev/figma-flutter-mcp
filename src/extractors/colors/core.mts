// src/extractors/colors/core.mts

import type {FigmaNode} from '../../types/figma.mjs';
import type {
    ThemeColor,
    ColorDefinition,
    ColorExtractionContext,
    ColorExtractorFn,
} from './types.mjs';
import {
    extractColorsFromThemeFrame,
} from './extractor.mjs';

/**
 * Main color extraction orchestrator
 */
export class ColorExtractor {
    private colorLibrary: ColorDefinition[] = [];
    private colorMap = new Map<string, string>(); // color value -> ID

    /**
     * Extract theme colors from a specific frame
     */
    extractThemeFromFrame(frameNode: FigmaNode): ThemeColor[] {
        return extractColorsFromThemeFrame(frameNode);
    }

    /**
     * Extract colors from a single node recursively
     */
    private extractFromNode(
        node: FigmaNode,
        extractors: ColorExtractorFn[],
        context: ColorExtractionContext
    ): void {
        if (context.currentDepth > context.maxDepth) {
            return;
        }

        // Apply all color extractors to this node
        extractors.forEach(extractor => {
            extractor(node, context, this.colorLibrary);
        });

        // Process children
        if (node.children && node.children.length > 0) {
            const childContext = {...context, currentDepth: context.currentDepth + 1};

            node.children.forEach(child => {
                this.extractFromNode(child, extractors, childContext);
            });
        }
    }

    /**
     * Add or get existing color from library
     */
    addColor(colorValue: string, nodeName: string): string {
        // Check if color already exists
        const existingId = this.colorMap.get(colorValue);
        if (existingId) {
            // Increment usage count
            const color = this.colorLibrary.find(c => c.id === existingId);
            if (color) {
                color.usageCount++;
            }
            return existingId;
        }

        // Create new color definition
        const colorId = `color_${this.colorLibrary.length + 1}`;
        const colorDef: ColorDefinition = {
            id: colorId,
            name: this.generateColorName(colorValue, nodeName),
            value: colorValue,
            usage: this.categorizeColorUsage(nodeName),
            usageCount: 1
        };

        this.colorLibrary.push(colorDef);
        this.colorMap.set(colorValue, colorId);

        return colorId;
    }

    /**
     * Get current color library
     */
    getColorLibrary(): ColorDefinition[] {
        return [...this.colorLibrary];
    }

    /**
     * Get colors by usage category
     */
    getColorsByUsage(usage: ColorDefinition['usage']): ColorDefinition[] {
        return this.colorLibrary.filter(color => color.usage === usage);
    }

    /**
     * Get most used colors
     */
    getMostUsedColors(limit: number = 10): ColorDefinition[] {
        return [...this.colorLibrary]
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }

    /**
     * Reset all libraries for new extraction
     */
    private resetLibraries(): void {
        this.colorLibrary = [];
        this.colorMap.clear();
    }

    /**
     * Generate meaningful color name from hex value and context
     */
    private generateColorName(colorValue: string, nodeName: string): string {
        // Try to infer name from node context
        const name = nodeName.toLowerCase();

        if (name.includes('primary')) return 'Primary';
        if (name.includes('secondary')) return 'Secondary';
        if (name.includes('background')) return 'Background';
        if (name.includes('text')) return 'Text';
        if (name.includes('accent')) return 'Accent';

        // Generate name based on color value
        const colorNames: Record<string, string> = {
            '#ffffff': 'White',
            '#000000': 'Black',
            '#ff0000': 'Red',
            '#00ff00': 'Green',
            '#0000ff': 'Blue',
        };

        return colorNames[colorValue.toLowerCase()] || `Color${this.colorLibrary.length + 1}`;
    }

    /**
     * Categorize color usage
     */
    private categorizeColorUsage(nodeName: string): ColorDefinition['usage'] {
        const name = nodeName.toLowerCase();

        if (name.includes('primary')) return 'primary';
        if (name.includes('secondary')) return 'secondary';
        if (name.includes('background') || name.includes('bg')) return 'background';
        if (name.includes('text') || name.includes('label')) return 'text';
        if (name.includes('accent') || name.includes('highlight')) return 'accent';

        return 'other';
    }
}

/**
 * Convenience function to extract theme colors from a frame
 */
export function extractThemeColors(frameNode: FigmaNode): ThemeColor[] {
    const extractor = new ColorExtractor();
    return extractor.extractThemeFromFrame(frameNode);
}
