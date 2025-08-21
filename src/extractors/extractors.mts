// src/extractors/extractors.mts

import type {FigmaNode} from '../types/figma.mjs';
import type {ExtractorFn, ExtractedNode, ExtractionContext, LayoutProperties} from './types.mjs';

/**
 * Extract colors from fills and store in deduplicated library
 */
export const colorExtractor: ExtractorFn = (node, extracted, context, libraries) => {
    if (!node.fills || !Array.isArray(node.fills)) return;

    const colorRefs: string[] = [];

    node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
            const r = Math.round(fill.color.r * 255);
            const g = Math.round(fill.color.g * 255);
            const b = Math.round(fill.color.b * 255);
            const colorValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

            // Add to library and get reference
            const colorId = addColorToLibrary(colorValue, node.name, libraries.colors, context.colorMap);
            colorRefs.push(colorId);
        }
    });

    if (colorRefs.length > 0) {
        extracted.colorRefs = colorRefs;
    }
};

/**
 * Extract text styles and store in deduplicated library
 */
export const textStyleExtractor: ExtractorFn = (node, extracted, context, libraries) => {
    if (node.type !== 'TEXT' || !node.style) return;

    // Create hash for style
    const styleHash = hashTextStyle(node.style);

    let styleId = context.textStyleMap.get(styleHash);
    if (!styleId) {
        // Create new style
        styleId = `text_style_${libraries.textStyles.length + 1}`;

        const styleDef = {
            id: styleId,
            name: generateTextStyleName(node.style, node.name),
            properties: {
                fontSize: node.style.fontSize,
                fontFamily: node.style.fontFamily,
                fontWeight: node.style.fontWeight,
                lineHeight: node.style.lineHeightPx,
                letterSpacing: node.style.letterSpacing
            },
            usageCount: 1
        };

        libraries.textStyles.push(styleDef);
        context.textStyleMap.set(styleHash, styleId);
    } else {
        // Increment usage
        const style = libraries.textStyles.find(s => s.id === styleId);
        if (style) style.usageCount++;
    }

    extracted.textStyleRef = styleId;
};

/**
 * Extract layout properties (not deduplicated as they're usually unique)
 */
export const layoutExtractor: ExtractorFn = (node, extracted, context, libraries) => {
    if (!node.absoluteBoundingBox) return;

    const layout: LayoutProperties = {
        width: Math.round(node.absoluteBoundingBox.width),
        height: Math.round(node.absoluteBoundingBox.height),
        x: Math.round(node.absoluteBoundingBox.x),
        y: Math.round(node.absoluteBoundingBox.y)
    };

    extracted.layout = layout;
};

/**
 * Extract components and store in deduplicated library
 */
export const componentExtractor: ExtractorFn = (node, extracted, context, libraries) => {
    if (node.type !== 'COMPONENT') return;

    let componentId = context.componentMap.get(node.name);
    if (!componentId) {
        // Create new component
        componentId = `component_${libraries.components.length + 1}`;

        const componentDef = {
            id: componentId,
            name: node.name,
            nodeId: node.id,
            flutterType: categorizeForFlutter(node.name),
            usageCount: 1
        };

        libraries.components.push(componentDef);
        context.componentMap.set(node.name, componentId);
    } else {
        // Increment usage
        const component = libraries.components.find(c => c.id === componentId);
        if (component) component.usageCount++;
    }

    extracted.componentRef = componentId;
};

// Helper functions
function addColorToLibrary(
    colorValue: string,
    nodeName: string,
    colorLibrary: any[],
    colorMap: Map<string, string>
): string {
    const existingId = colorMap.get(colorValue);
    if (existingId) {
        const color = colorLibrary.find(c => c.id === existingId);
        if (color) color.usageCount++;
        return existingId;
    }

    const colorId = `color_${colorLibrary.length + 1}`;
    const colorDef = {
        id: colorId,
        name: generateColorName(colorValue, nodeName),
        value: colorValue,
        usage: categorizeColorUsage(nodeName),
        usageCount: 1
    };

    colorLibrary.push(colorDef);
    colorMap.set(colorValue, colorId);

    return colorId;
}

function hashTextStyle(style: any): string {
    return `${style.fontSize || 16}_${style.fontFamily || 'default'}_${style.fontWeight || 400}`;
}

function generateTextStyleName(style: any, nodeName: string): string {
    const fontSize = style.fontSize || 16;

    if (fontSize >= 24) return 'Heading Large';
    if (fontSize >= 20) return 'Heading Medium';
    if (fontSize >= 18) return 'Heading Small';
    if (fontSize >= 16) return 'Body';
    return 'Caption';
}

function generateColorName(colorValue: string, nodeName: string): string {
    const name = nodeName.toLowerCase();

    if (name.includes('primary')) return 'Primary';
    if (name.includes('secondary')) return 'Secondary';
    if (name.includes('background')) return 'Background';
    if (name.includes('text')) return 'Text';

    const colorNames: Record<string, string> = {
        '#ffffff': 'White',
        '#000000': 'Black',
        '#ff0000': 'Red',
        '#00ff00': 'Green',
        '#0000ff': 'Blue',
    };

    return colorNames[colorValue.toLowerCase()] || `Color${Math.random().toString(36).substr(2, 4)}`;
}

function categorizeColorUsage(nodeName: string): string {
    const name = nodeName.toLowerCase();

    if (name.includes('primary')) return 'primary';
    if (name.includes('secondary')) return 'secondary';
    if (name.includes('background')) return 'background';
    if (name.includes('text')) return 'text';

    return 'other';
}

function categorizeForFlutter(name: string): 'button' | 'card' | 'input' | 'screen' | 'icon' | 'widget' {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('button')) return 'button';
    if (lowerName.includes('card')) return 'card';
    if (lowerName.includes('input')) return 'input';
    if (lowerName.includes('screen')) return 'screen';
    if (lowerName.includes('icon')) return 'icon';

    return 'widget';
}