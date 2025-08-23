// src/extractors/components/extractor.mts

import type {FigmaNode, FigmaColor, FigmaEffect} from '../../types/figma.mjs';
import type {
    ComponentMetadata,
    LayoutInfo,
    StylingInfo,
    ComponentChild,
    NestedComponentInfo,
    SkippedNodeInfo,
    CategorizedEffects,
    ColorInfo,
    StrokeInfo,
    CornerRadii,
    PaddingInfo,
    TextInfo,
    ComponentExtractionOptions
} from './types.mjs';

/**
 * Extract component metadata
 */
export function extractMetadata(node: FigmaNode, userDefinedAsComponent: boolean): ComponentMetadata {
    const metadata: ComponentMetadata = {
        name: node.name,
        type: node.type as 'COMPONENT' | 'COMPONENT_SET' | 'FRAME',
        nodeId: node.id,
        isUserDefinedComponent: userDefinedAsComponent
    };

    // Add component-specific metadata
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        metadata.componentKey = (node as any).componentKey;
    }

    if (node.type === 'COMPONENT_SET') {
        metadata.variantCount = node.children?.length || 0;
    }

    return metadata;
}

/**
 * Extract layout information
 */
export function extractLayoutInfo(node: FigmaNode): LayoutInfo {
    const layout: LayoutInfo = {
        type: determineLayoutType(node),
        dimensions: {
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0
        }
    };

    // Auto-layout specific properties
    if (node.layoutMode) {
        layout.direction = node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
        layout.spacing = node.itemSpacing || 0;

        // Extract padding
        if (hasPadding(node)) {
            layout.padding = extractPadding(node);
        }

        // Alignment properties
        layout.alignItems = (node as any).primaryAxisAlignItems;
        layout.justifyContent = (node as any).counterAxisAlignItems;
    }

    // Constraints
    if (node.constraints) {
        layout.constraints = node.constraints;
    }

    return layout;
}

/**
 * Extract styling information
 */
export function extractStylingInfo(node: FigmaNode): StylingInfo {
    const styling: StylingInfo = {};

    // Fills (background colors/gradients)
    if (node.fills && node.fills.length > 0) {
        styling.fills = node.fills.map(convertFillToColorInfo);
    }

    // Strokes (borders)
    if (node.strokes && node.strokes.length > 0) {
        styling.strokes = node.strokes.map(convertStrokeInfo);
    }

    // Effects (shadows, blurs)
    if (node.effects && node.effects.length > 0) {
        styling.effects = categorizeEffects(node.effects);
    }

    // Corner radius
    const cornerRadius = extractCornerRadius(node);
    if (cornerRadius) {
        styling.cornerRadius = cornerRadius;
    }

    // Opacity
    if ((node as any).opacity !== undefined && (node as any).opacity !== 1) {
        styling.opacity = (node as any).opacity;
    }

    return styling;
}

/**
 * Analyze child nodes with prioritization and limits
 */
export function analyzeChildren(
    node: FigmaNode,
    options: Required<ComponentExtractionOptions>
): {
    children: ComponentChild[];
    nestedComponents: NestedComponentInfo[];
    skippedNodes: SkippedNodeInfo[];
} {
    const children: ComponentChild[] = [];
    const nestedComponents: NestedComponentInfo[] = [];
    const skippedNodes: SkippedNodeInfo[] = [];

    if (!node.children || node.children.length === 0) {
        return {children, nestedComponents, skippedNodes};
    }

    // Filter visible nodes unless includeHiddenNodes is true
    let visibleChildren = node.children;
    if (!options.includeHiddenNodes) {
        visibleChildren = node.children.filter(child => child.visible !== false);
    }

    // Calculate visual importance for all children
    const childrenWithImportance = visibleChildren.map(child => ({
        node: child,
        importance: calculateVisualImportance(child),
        isComponent: isComponentNode(child)
    }));

    // Sort by importance (components first if prioritized, then by visual importance)
    childrenWithImportance.sort((a, b) => {
        if (options.prioritizeComponents) {
            if (a.isComponent && !b.isComponent) return -1;
            if (!a.isComponent && b.isComponent) return 1;
        }
        return b.importance - a.importance;
    });

    // Process up to maxChildNodes
    const processedCount = Math.min(childrenWithImportance.length, options.maxChildNodes);

    for (let i = 0; i < childrenWithImportance.length; i++) {
        const {node: child, importance, isComponent} = childrenWithImportance[i];

        if (i < processedCount) {
            // Check if this is a nested component
            if (isComponent) {
                nestedComponents.push(createNestedComponentInfo(child));
            }

            children.push(createComponentChild(child, importance, isComponent, options));
        } else {
            // Track skipped nodes
            skippedNodes.push({
                nodeId: child.id,
                name: child.name,
                type: child.type,
                reason: 'max_nodes'
            });
        }
    }

    return {children, nestedComponents, skippedNodes};
}

/**
 * Create nested component information
 */
export function createNestedComponentInfo(node: FigmaNode): NestedComponentInfo {
    return {
        nodeId: node.id,
        name: node.name,
        componentKey: (node as any).componentKey,
        masterComponent: (node as any).masterComponent?.key,
        isComponentInstance: node.type === 'INSTANCE',
        needsSeparateAnalysis: true,
        instanceType: node.type === 'INSTANCE' ? 'COMPONENT' : node.type as 'COMPONENT' | 'COMPONENT_SET'
    };
}

/**
 * Create component child information
 */
export function createComponentChild(
    node: FigmaNode,
    importance: number,
    isNestedComponent: boolean,
    options: Required<ComponentExtractionOptions>
): ComponentChild {
    const child: ComponentChild = {
        nodeId: node.id,
        name: node.name,
        type: node.type,
        isNestedComponent,
        visualImportance: importance
    };

    // Extract basic info for non-component children
    if (!isNestedComponent) {
        child.basicInfo = {
            layout: extractBasicLayout(node),
            styling: extractBasicStyling(node)
        };

        // Extract text info for text nodes
        if (node.type === 'TEXT' && options.extractTextContent) {
            child.basicInfo.text = extractTextInfo(node);
        }
    }

    return child;
}

/**
 * Calculate visual importance score (1-10)
 */
export function calculateVisualImportance(node: FigmaNode): number {
    let score = 0;

    // Size importance (0-4 points)
    const area = (node.absoluteBoundingBox?.width || 0) * (node.absoluteBoundingBox?.height || 0);
    if (area > 10000) score += 4;
    else if (area > 5000) score += 3;
    else if (area > 1000) score += 2;
    else if (area > 100) score += 1;

    // Type importance (0-3 points)
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') score += 3;
    else if (node.type === 'FRAME') score += 2;
    else if (node.type === 'TEXT') score += 2;
    else if (node.type === 'VECTOR') score += 1;

    // Styling importance (0-2 points)
    if (node.fills && node.fills.length > 0) score += 1;
    if (node.effects && node.effects.length > 0) score += 1;

    // Has children importance (0-1 point)
    if (node.children && node.children.length > 0) score += 1;

    return Math.min(score, 10);
}

/**
 * Check if node is a component
 */
export function isComponentNode(node: FigmaNode): boolean {
    return node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'COMPONENT_SET';
}

/**
 * Determine layout type from node properties
 */
export function determineLayoutType(node: FigmaNode): 'auto-layout' | 'absolute' | 'frame' {
    if (node.layoutMode) {
        return 'auto-layout';
    }
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        return 'frame';
    }
    return 'absolute';
}

/**
 * Check if node has padding
 */
export function hasPadding(node: FigmaNode): boolean {
    return !!(node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft);
}

/**
 * Extract padding information
 */
export function extractPadding(node: FigmaNode): PaddingInfo {
    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;

    return {
        top,
        right,
        bottom,
        left,
        isUniform: top === right && right === bottom && bottom === left
    };
}

/**
 * Convert fill to color info
 */
export function convertFillToColorInfo(fill: any): ColorInfo {
    const colorInfo: ColorInfo = {
        type: fill.type,
        opacity: fill.opacity
    };

    if (fill.color) {
        colorInfo.color = fill.color;
        colorInfo.hex = rgbaToHex(fill.color);
    }

    if (fill.gradientStops) {
        colorInfo.gradientStops = fill.gradientStops;
    }

    return colorInfo;
}

/**
 * Convert stroke to stroke info
 */
export function convertStrokeInfo(stroke: any): StrokeInfo {
    return {
        type: stroke.type,
        color: stroke.color,
        hex: rgbaToHex(stroke.color),
        weight: (stroke as any).strokeWeight || 1,
        align: (stroke as any).strokeAlign
    };
}

/**
 * Categorize effects for Flutter mapping
 */
export function categorizeEffects(effects: FigmaEffect[]): CategorizedEffects {
    const categorized: CategorizedEffects = {
        dropShadows: [],
        innerShadows: [],
        blurs: []
    };

    effects.forEach(effect => {
        if (effect.type === 'DROP_SHADOW' && effect.visible !== false) {
            categorized.dropShadows.push({
                color: effect.color!,
                hex: rgbaToHex(effect.color!),
                offset: effect.offset || {x: 0, y: 0},
                radius: effect.radius,
                spread: effect.spread,
                opacity: effect.color?.a || 1
            });
        } else if (effect.type === 'INNER_SHADOW' && effect.visible !== false) {
            categorized.innerShadows.push({
                color: effect.color!,
                hex: rgbaToHex(effect.color!),
                offset: effect.offset || {x: 0, y: 0},
                radius: effect.radius,
                spread: effect.spread,
                opacity: effect.color?.a || 1
            });
        } else if ((effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') && effect.visible !== false) {
            categorized.blurs.push({
                type: effect.type,
                radius: effect.radius
            });
        }
    });

    return categorized;
}

/**
 * Extract corner radius
 */
export function extractCornerRadius(node: FigmaNode): number | CornerRadii | undefined {
    const nodeAny = node as any;

    if (nodeAny.cornerRadius !== undefined) {
        return nodeAny.cornerRadius;
    }

    // Check for individual corner radii
    if (nodeAny.rectangleCornerRadii && Array.isArray(nodeAny.rectangleCornerRadii)) {
        const [topLeft, topRight, bottomRight, bottomLeft] = nodeAny.rectangleCornerRadii;
        const isUniform = topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft;

        if (isUniform) {
            return topLeft;
        }

        return {
            topLeft,
            topRight,
            bottomLeft,
            bottomRight,
            isUniform: false
        };
    }

    return undefined;
}

/**
 * Extract basic layout info for non-component children
 */
export function extractBasicLayout(node: FigmaNode): Partial<LayoutInfo> {
    return {
        type: determineLayoutType(node),
        dimensions: {
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0
        }
    };
}

/**
 * Extract basic styling info for non-component children
 */
export function extractBasicStyling(node: FigmaNode): Partial<StylingInfo> {
    const styling: Partial<StylingInfo> = {};

    if (node.fills && node.fills.length > 0) {
        styling.fills = node.fills.slice(0, 1).map(convertFillToColorInfo); // Limit to primary fill
    }

    const cornerRadius = extractCornerRadius(node);
    if (cornerRadius) {
        styling.cornerRadius = cornerRadius;
    }

    return styling;
}

/**
 * Extract text information
 */
export function extractTextInfo(node: FigmaNode): TextInfo | undefined {
    if (!node.style) return undefined;

    return {
        content: node.name, // Figma doesn't provide text content in API, use name as fallback
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        textAlign: node.style.textAlignHorizontal
    };
}

/**
 * Convert RGBA color to hex string
 */
export function rgbaToHex(color: FigmaColor): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}
