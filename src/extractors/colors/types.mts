// src/extractors/colors/types.mts

import type {FigmaNode} from '../../types/figma.mjs';

/**
 * Color definition from theme extraction
 */
export interface ThemeColor {
    name: string;
    hex: string;
    nodeId: string;
}

/**
 * Deduplicated color definition for design system
 */
export interface ColorDefinition {
    id: string;
    name: string;
    value: string; // hex color
    usage: 'primary' | 'secondary' | 'background' | 'text' | 'accent' | 'other';
    usageCount: number;
}

/**
 * Color extraction context
 */
export interface ColorExtractionContext {
    colorMap: Map<string, string>; // color value -> color ID
    currentDepth: number;
    maxDepth: number;
}

/**
 * Color extractor function type
 */
export type ColorExtractorFn = (
    node: FigmaNode,
    context: ColorExtractionContext,
    colorLibrary: ColorDefinition[]
) => string[] | null; // Returns color IDs

/**
 * Color extraction result
 */
export interface ColorExtractionResult {
    themeColors: ThemeColor[];
    colorLibrary: ColorDefinition[];
    totalColors: number;
}

/**
 * Color extraction options
 */
export interface ColorExtractionOptions {
    maxDepth?: number;
    includeTransparent?: boolean;
    minUsageCount?: number;
}
