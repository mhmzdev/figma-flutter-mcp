// src/extractors/typography/types.mts

import type {FigmaNode} from '../../types/figma.js';

/**
 * Typography style definition from theme extraction
 */
export interface TypographyStyle {
    name: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    nodeId: string;
    // Optional properties for enhanced text styles
    textAlign?: string;
    textDecoration?: string;
}

/**
 * Deduplicated typography definition for design system
 */
export interface TypographyDefinition {
    id: string;
    name: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    usage: 'heading' | 'body' | 'caption' | 'button' | 'label' | 'other';
    usageCount: number;
    // Additional Flutter-specific properties
    dartName?: string; // Dart-safe property name
}

/**
 * Typography extraction context
 */
export interface TypographyExtractionContext {
    typographyMap: Map<string, string>; // style hash -> typography ID
    currentDepth: number;
    maxDepth: number;
}

/**
 * Typography extractor function type
 */
export type TypographyExtractorFn = (
    node: FigmaNode,
    context: TypographyExtractionContext,
    typographyLibrary: TypographyDefinition[]
) => string[] | null; // Returns typography IDs

/**
 * Typography extraction options
 */
export interface TypographyExtractionOptions {
    maxDepth?: number;
    includeHiddenText?: boolean;
    minUsageCount?: number;
    excludeEmptyText?: boolean;
}

/**
 * Flutter typography generation options
 */
export interface TypographyGenerationOptions {
    generateAppText?: boolean;
    generateTextTheme?: boolean;
    familyVariableName?: string; // Name for shared font family variable
    includeLineHeight?: boolean;
    includeLetterSpacing?: boolean;
}

/**
 * Font weight mapping for Flutter
 */
export interface FontWeightMapping {
    [key: number]: string; // Figma weight -> Flutter FontWeight
}

/**
 * Text style hash components for deduplication
 */
export interface TextStyleHash {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
}
