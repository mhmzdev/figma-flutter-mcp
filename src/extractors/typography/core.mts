// src/extractors/typography/core.mts

import type {FigmaNode} from '../../types/figma.mjs';
import type {
    TypographyStyle,
    TypographyDefinition,
    TypographyExtractionContext,
    TypographyExtractorFn,
    TypographyExtractionResult,
    TypographyExtractionOptions
} from './types.mjs';
import {
    extractTypographyFromThemeFrame,
    textStyleExtractor
} from './extractor.mjs';

/**
 * Main typography extraction orchestrator
 */
export class TypographyExtractor {
    private typographyLibrary: TypographyDefinition[] = [];
    private typographyMap = new Map<string, string>(); // style hash -> ID
    private fontFamilies = new Set<string>();

    /**
     * Extract theme typography from a specific frame
     */
    extractThemeFromFrame(frameNode: FigmaNode): TypographyStyle[] {
        return extractTypographyFromThemeFrame(frameNode);
    }

    /**
     * Extract typography from entire Figma file with deduplication
     */
    extractFromFile(
        file: {document: FigmaNode},
        extractors: TypographyExtractorFn[] = [textStyleExtractor],
        options: TypographyExtractionOptions = {}
    ): TypographyExtractionResult {
        // Reset state
        this.resetLibraries();

        const context: TypographyExtractionContext = {
            typographyMap: this.typographyMap,
            currentDepth: 0,
            maxDepth: options.maxDepth || 5
        };

        // Extract typography from all pages
        if (file.document.children) {
            file.document.children.forEach(page => {
                this.extractFromNode(page, extractors, context, options);
            });
        }

        // Filter by minimum usage count if specified
        let filteredLibrary = this.typographyLibrary;
        if (options.minUsageCount && options.minUsageCount > 1) {
            filteredLibrary = this.typographyLibrary.filter(typography => 
                typography.usageCount >= options.minUsageCount!
            );
        }

        // Collect all font families
        this.typographyLibrary.forEach(typography => {
            this.fontFamilies.add(typography.fontFamily);
        });

        return {
            themeTypography: [], // Theme typography comes from frame extraction
            typographyLibrary: filteredLibrary,
            totalStyles: this.typographyLibrary.length,
            fontFamilies: new Set(this.fontFamilies)
        };
    }

    /**
     * Extract typography from a single node recursively
     */
    private extractFromNode(
        node: FigmaNode,
        extractors: TypographyExtractorFn[],
        context: TypographyExtractionContext,
        options: TypographyExtractionOptions
    ): void {
        if (context.currentDepth > context.maxDepth) {
            return;
        }

        // Skip hidden nodes unless explicitly included
        if (!options.includeHiddenText && node.visible === false) {
            return;
        }

        // Apply all typography extractors to this node
        extractors.forEach(extractor => {
            extractor(node, context, this.typographyLibrary);
        });

        // Process children
        if (node.children && node.children.length > 0) {
            const childContext = {...context, currentDepth: context.currentDepth + 1};

            node.children.forEach(child => {
                this.extractFromNode(child, extractors, childContext, options);
            });
        }
    }

    /**
     * Add or get existing typography from library
     */
    addTypography(
        fontFamily: string,
        fontSize: number,
        fontWeight: number,
        lineHeight: number,
        letterSpacing: number,
        nodeName: string
    ): string {
        // Create style hash for deduplication
        const styleHash = JSON.stringify({
            fontFamily,
            fontSize,
            fontWeight,
            lineHeight,
            letterSpacing
        });

        // Check if typography already exists
        const existingId = this.typographyMap.get(styleHash);
        if (existingId) {
            // Increment usage count
            const typography = this.typographyLibrary.find(t => t.id === existingId);
            if (typography) {
                typography.usageCount++;
            }
            return existingId;
        }

        // Create new typography definition
        const typographyId = `typography_${this.typographyLibrary.length + 1}`;
        const typographyDef: TypographyDefinition = {
            id: typographyId,
            name: this.generateTypographyName(fontSize, fontWeight, nodeName),
            fontFamily,
            fontSize,
            fontWeight,
            lineHeight,
            letterSpacing,
            usage: this.categorizeTypographyUsage(fontSize, nodeName),
            usageCount: 1,
            dartName: this.generateDartSafeName(fontSize, fontWeight, nodeName)
        };

        this.typographyLibrary.push(typographyDef);
        this.typographyMap.set(styleHash, typographyId);
        this.fontFamilies.add(fontFamily);

        return typographyId;
    }

    /**
     * Get current typography library
     */
    getTypographyLibrary(): TypographyDefinition[] {
        return [...this.typographyLibrary];
    }

    /**
     * Get typography by usage category
     */
    getTypographyByUsage(usage: TypographyDefinition['usage']): TypographyDefinition[] {
        return this.typographyLibrary.filter(typography => typography.usage === usage);
    }

    /**
     * Get most used typography
     */
    getMostUsedTypography(limit: number = 10): TypographyDefinition[] {
        return [...this.typographyLibrary]
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }

    /**
     * Get all font families used
     */
    getFontFamilies(): Set<string> {
        return new Set(this.fontFamilies);
    }

    /**
     * Get primary font family (most used)
     */
    getPrimaryFontFamily(): string | null {
        if (this.fontFamilies.size === 0) return null;

        // Count usage of each font family
        const familyCount = new Map<string, number>();
        this.typographyLibrary.forEach(typography => {
            const count = familyCount.get(typography.fontFamily) || 0;
            familyCount.set(typography.fontFamily, count + typography.usageCount);
        });

        // Find most used font family
        let maxCount = 0;
        let primaryFamily = null;
        familyCount.forEach((count, family) => {
            if (count > maxCount) {
                maxCount = count;
                primaryFamily = family;
            }
        });

        return primaryFamily;
    }

    /**
     * Reset all libraries for new extraction
     */
    private resetLibraries(): void {
        this.typographyLibrary = [];
        this.typographyMap.clear();
        this.fontFamilies.clear();
    }

    /**
     * Generate meaningful typography name
     */
    private generateTypographyName(fontSize: number, fontWeight: number, nodeName: string): string {
        // Try to infer name from node context
        const name = nodeName.toLowerCase();

        if (name.includes('heading') || name.includes('title')) return 'Heading';
        if (name.includes('subtitle')) return 'Subtitle';
        if (name.includes('body')) return 'Body';
        if (name.includes('caption')) return 'Caption';
        if (name.includes('button')) return 'Button';
        if (name.includes('label')) return 'Label';

        // Generate name based on size and weight
        let sizeName = 'Body';
        if (fontSize >= 32) sizeName = 'DisplayLarge';
        else if (fontSize >= 28) sizeName = 'DisplayMedium';
        else if (fontSize >= 24) sizeName = 'DisplaySmall';
        else if (fontSize >= 22) sizeName = 'HeadlineLarge';
        else if (fontSize >= 20) sizeName = 'HeadlineMedium';
        else if (fontSize >= 18) sizeName = 'HeadlineSmall';
        else if (fontSize >= 16) sizeName = 'BodyLarge';
        else if (fontSize >= 14) sizeName = 'BodyMedium';
        else if (fontSize >= 12) sizeName = 'BodySmall';
        else if (fontSize >= 11) sizeName = 'LabelLarge';
        else if (fontSize >= 10) sizeName = 'LabelMedium';
        else sizeName = 'LabelSmall';

        // Add weight if not regular
        if (fontWeight >= 700) {
            sizeName += 'Bold';
        } else if (fontWeight >= 600) {
            sizeName += 'SemiBold';
        } else if (fontWeight >= 500) {
            sizeName += 'Medium';
        } else if (fontWeight <= 300) {
            sizeName += 'Light';
        }

        return sizeName;
    }

    /**
     * Generate Dart-safe property name
     */
    private generateDartSafeName(fontSize: number, fontWeight: number, nodeName: string): string {
        const baseName = this.generateTypographyName(fontSize, fontWeight, nodeName);
        
        // Convert to camelCase and ensure it's Dart-safe
        return baseName.charAt(0).toLowerCase() + baseName.slice(1)
            .replace(/[^a-zA-Z0-9]/g, '')
            .replace(/^\d/, '_$&'); // Prefix with underscore if starts with number
    }

    /**
     * Categorize typography usage
     */
    private categorizeTypographyUsage(fontSize: number, nodeName: string): TypographyDefinition['usage'] {
        const name = nodeName.toLowerCase();

        // Check name patterns first
        if (name.includes('heading') || name.includes('title') || name.includes('h1') || name.includes('h2') || name.includes('h3')) {
            return 'heading';
        }
        if (name.includes('body') || name.includes('paragraph')) return 'body';
        if (name.includes('caption') || name.includes('small')) return 'caption';
        if (name.includes('button')) return 'button';
        if (name.includes('label')) return 'label';

        // Fallback to size-based categorization
        if (fontSize >= 20) return 'heading';
        if (fontSize >= 14) return 'body';
        if (fontSize >= 12) return 'caption';

        return 'other';
    }
}

/**
 * Convenience function to extract theme typography from a frame
 */
export function extractThemeTypography(frameNode: FigmaNode): TypographyStyle[] {
    const extractor = new TypographyExtractor();
    return extractor.extractThemeFromFrame(frameNode);
}

/**
 * Convenience function to extract design system typography from a file
 */
export function extractDesignSystemTypography(
    file: {document: FigmaNode},
    options?: TypographyExtractionOptions
): TypographyExtractionResult {
    const extractor = new TypographyExtractor();
    return extractor.extractFromFile(file, undefined, options);
}
