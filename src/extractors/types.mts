// src/extractors/types.mts

import type {FigmaNode} from '../types/figma.mjs';

/**
 * Extracted design data structure
 */
export interface ExtractedDesign {
    nodes: ExtractedNode[];
    colorLibrary: ColorDefinition[];
    textStyleLibrary: TextStyleDefinition[];
    componentLibrary: ComponentDefinition[];
}

/**
 * Individual extracted node
 */
export interface ExtractedNode {
    id: string;
    name: string;
    type: string;
    // References to library items instead of inline styles
    colorRefs?: string[];
    textStyleRef?: string;
    componentRef?: string;
    // Direct properties that don't need deduplication
    layout?: LayoutProperties;
    children?: ExtractedNode[];
}

/**
 * Deduplicated color definition
 */
export interface ColorDefinition {
    id: string;
    name: string;
    value: string; // hex color
    usage: 'primary' | 'secondary' | 'background' | 'text' | 'accent' | 'other';
    usageCount: number;
}

/**
 * Deduplicated text style definition
 */
export interface TextStyleDefinition {
    id: string;
    name: string;
    properties: {
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: number;
        lineHeight?: number;
        letterSpacing?: number;
    };
    usageCount: number;
}

/**
 * Deduplicated component definition
 */
export interface ComponentDefinition {
    id: string;
    name: string;
    nodeId: string;
    flutterType: 'button' | 'card' | 'input' | 'screen' | 'icon' | 'widget';
    usageCount: number;
    variants?: ComponentDefinition[];
}

/**
 * Layout properties (not deduplicated as they're usually unique)
 */
export interface LayoutProperties {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    // Add more layout properties as needed
}

/**
 * Extraction context for tracking state during traversal
 */
export interface ExtractionContext {
    colorMap: Map<string, string>; // color value -> color ID
    textStyleMap: Map<string, string>; // style hash -> style ID
    componentMap: Map<string, string>; // component name -> component ID
    currentDepth: number;
    maxDepth: number;
}

/**
 * Extractor function type
 */
export type ExtractorFn = (
    node: FigmaNode,
    extracted: ExtractedNode,
    context: ExtractionContext,
    libraries: {
        colors: ColorDefinition[];
        textStyles: TextStyleDefinition[];
        components: ComponentDefinition[];
    }
) => void;