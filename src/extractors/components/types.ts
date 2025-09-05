// src/extractors/components/types.mts

import type {FigmaNode, FigmaColor, FigmaEffect} from '../../types/figma.js';

/**
 * Main component analysis result
 */
export interface ComponentAnalysis {
    metadata: ComponentMetadata;
    layout: LayoutInfo;
    styling: StylingInfo;
    children: ComponentChild[];
    nestedComponents: NestedComponentInfo[];
    variants?: ComponentVariant[];
    skippedNodes?: SkippedNodeInfo[];
}

/**
 * Component metadata information
 */
export interface ComponentMetadata {
    name: string;
    type: 'COMPONENT' | 'COMPONENT_SET' | 'FRAME';
    nodeId: string;
    description?: string;
    variantCount?: number;
    isUserDefinedComponent?: boolean; // When user treats FRAME as component
    componentKey?: string; // For actual Figma components
}

/**
 * Layout structure information
 */
export interface LayoutInfo {
    type: 'auto-layout' | 'absolute' | 'frame';
    direction?: 'horizontal' | 'vertical';
    spacing?: number;
    padding?: PaddingInfo;
    constraints?: any;
    dimensions: {
        width: number;
        height: number;
    };
    alignItems?: string;
    justifyContent?: string;
}

/**
 * Padding information
 */
export interface PaddingInfo {
    top: number;
    right: number;
    bottom: number;
    left: number;
    isUniform: boolean;
}

/**
 * Visual styling information
 */
export interface StylingInfo {
    fills?: ColorInfo[];
    strokes?: StrokeInfo[];
    effects?: CategorizedEffects;
    cornerRadius?: number | CornerRadii;
    opacity?: number;
}

/**
 * Color information extracted from fills
 */
export interface ColorInfo {
    type: string;
    color?: FigmaColor;
    hex?: string;
    opacity?: number;
    gradientStops?: Array<{
        color: FigmaColor;
        position: number;
    }>;
}

/**
 * Stroke information
 */
export interface StrokeInfo {
    type: string;
    color: FigmaColor;
    hex: string;
    weight: number;
    align?: string;
}

/**
 * Corner radius information
 */
export interface CornerRadii {
    topLeft: number;
    topRight: number;
    bottomLeft: number;
    bottomRight: number;
    isUniform: boolean;
}

/**
 * Categorized effects for Flutter mapping
 */
export interface CategorizedEffects {
    dropShadows: DropShadowEffect[];
    innerShadows: InnerShadowEffect[];
    blurs: BlurEffect[];
}

/**
 * Drop shadow effect
 */
export interface DropShadowEffect {
    color: FigmaColor;
    hex: string;
    offset: {x: number; y: number};
    radius: number;
    spread?: number;
    opacity: number;
}

/**
 * Inner shadow effect
 */
export interface InnerShadowEffect {
    color: FigmaColor;
    hex: string;
    offset: {x: number; y: number};
    radius: number;
    spread?: number;
    opacity: number;
}

/**
 * Blur effect
 */
export interface BlurEffect {
    type: string;
    radius: number;
}

/**
 * Child component information
 */
export interface ComponentChild {
    nodeId: string;
    name: string;
    type: string;
    isNestedComponent: boolean;
    visualImportance: number; // 1-10 score for prioritization
    basicInfo?: {
        layout?: Partial<LayoutInfo>;
        styling?: Partial<StylingInfo>;
        text?: TextInfo;
    };
}

/**
 * Enhanced text-specific information
 */
export interface TextInfo {
    content: string;
    isPlaceholder: boolean;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlign?: string;
    textCase?: 'uppercase' | 'lowercase' | 'capitalize' | 'sentence' | 'mixed';
    semanticType?: 'heading' | 'body' | 'label' | 'button' | 'link' | 'caption' | 'error' | 'success' | 'warning' | 'other';
    placeholder?: boolean; // Flag for Flutter implementation
}

/**
 * Nested component that should be analyzed separately
 */
export interface NestedComponentInfo {
    nodeId: string;
    name: string;
    componentKey?: string;
    masterComponent?: string;
    isComponentInstance: boolean;
    needsSeparateAnalysis: boolean;
    instanceType?: 'COMPONENT' | 'COMPONENT_SET';
}

/**
 * Component variant information
 */
export interface ComponentVariant {
    nodeId: string;
    name: string;
    properties: Record<string, string>;
    isDefault: boolean;
}

/**
 * Information about nodes that were skipped due to limits
 */
export interface SkippedNodeInfo {
    nodeId: string;
    name: string;
    type: string;
    reason: 'depth_limit' | 'visual_importance' | 'max_nodes';
}

/**
 * Component extraction options
 */
export interface ComponentExtractionOptions {
    maxChildNodes?: number;
    maxDepth?: number;
    includeHiddenNodes?: boolean;
    prioritizeComponents?: boolean;
    extractTextContent?: boolean;
}