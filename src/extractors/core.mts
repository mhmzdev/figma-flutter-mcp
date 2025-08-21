// src/extractors/core.mts

import type {FigmaNode} from '../types/figma.mjs';
import type {
    ExtractedDesign,
    ExtractedNode,
    ColorDefinition,
    TextStyleDefinition,
    ComponentDefinition,
    ExtractionContext,
    ExtractorFn
} from './types.mjs';

/**
 * Main extraction orchestrator
 */
export class DesignExtractor {
    private colorLibrary: ColorDefinition[] = [];
    private textStyleLibrary: TextStyleDefinition[] = [];
    private componentLibrary: ComponentDefinition[] = [];

    private colorMap = new Map<string, string>(); // color value -> ID
    private textStyleMap = new Map<string, string>(); // style hash -> ID
    private componentMap = new Map<string, string>(); // component name -> ID

    /**
     * Extract design data from Figma file with deduplication
     */
    extractFromFile(file: {document: FigmaNode}, extractors: ExtractorFn[]): ExtractedDesign {
        // Reset state
        this.resetLibraries();

        const context: ExtractionContext = {
            colorMap: this.colorMap,
            textStyleMap: this.textStyleMap,
            componentMap: this.componentMap,
            currentDepth: 0,
            maxDepth: 5
        };

        const nodes = file.document.children?.map(page =>
            this.extractNode(page, extractors, context)
        ).filter(node => node !== null) as ExtractedNode[] || [];

        return {
            nodes,
            colorLibrary: this.colorLibrary,
            textStyleLibrary: this.textStyleLibrary,
            componentLibrary: this.componentLibrary
        };
    }

    /**
     * Extract a single node recursively
     */
    private extractNode(
        node: FigmaNode,
        extractors: ExtractorFn[],
        context: ExtractionContext
    ): ExtractedNode | null {
        if (context.currentDepth > context.maxDepth) {
            return null;
        }

        // Create base extracted node
        const extracted: ExtractedNode = {
            id: node.id,
            name: node.name,
            type: node.type
        };

        // Apply all extractors
        extractors.forEach(extractor => {
            extractor(node, extracted, context, {
                colors: this.colorLibrary,
                textStyles: this.textStyleLibrary,
                components: this.componentLibrary
            });
        });

        // Process children
        if (node.children && node.children.length > 0) {
            const childContext = {...context, currentDepth: context.currentDepth + 1};

            const children = node.children
                .map(child => this.extractNode(child, extractors, childContext))
                .filter(child => child !== null) as ExtractedNode[];

            if (children.length > 0) {
                extracted.children = children;
            }
        }

        return extracted;
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
     * Add or get existing text style from library
     */
    addTextStyle(styleProperties: any, nodeName: string): string {
        // Create a hash of the style properties
        const styleHash = this.hashTextStyle(styleProperties);

        // Check if style already exists
        const existingId = this.textStyleMap.get(styleHash);
        if (existingId) {
            // Increment usage count
            const style = this.textStyleLibrary.find(s => s.id === existingId);
            if (style) {
                style.usageCount++;
            }
            return existingId;
        }

        // Create new text style definition
        const styleId = `text_style_${this.textStyleLibrary.length + 1}`;
        const styleDef: TextStyleDefinition = {
            id: styleId,
            name: this.generateTextStyleName(styleProperties, nodeName),
            properties: {
                fontSize: styleProperties.fontSize,
                fontFamily: styleProperties.fontFamily,
                fontWeight: styleProperties.fontWeight,
                lineHeight: styleProperties.lineHeightPx,
                letterSpacing: styleProperties.letterSpacing
            },
            usageCount: 1
        };

        this.textStyleLibrary.push(styleDef);
        this.textStyleMap.set(styleHash, styleId);

        return styleId;
    }

    /**
     * Add or get existing component from library
     */
    addComponent(node: FigmaNode): string {
        // Check if component already exists
        const existingId = this.componentMap.get(node.name);
        if (existingId) {
            // Increment usage count
            const component = this.componentLibrary.find(c => c.id === existingId);
            if (component) {
                component.usageCount++;
            }
            return existingId;
        }

        // Create new component definition
        const componentId = `component_${this.componentLibrary.length + 1}`;
        const componentDef: ComponentDefinition = {
            id: componentId,
            name: node.name,
            nodeId: node.id,
            flutterType: this.categorizeForFlutter(node.name),
            usageCount: 1
        };

        this.componentLibrary.push(componentDef);
        this.componentMap.set(node.name, componentId);

        return componentId;
    }

    /**
     * Reset all libraries for new extraction
     */
    private resetLibraries(): void {
        this.colorLibrary = [];
        this.textStyleLibrary = [];
        this.componentLibrary = [];
        this.colorMap.clear();
        this.textStyleMap.clear();
        this.componentMap.clear();
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
     * Generate meaningful text style name
     */
    private generateTextStyleName(styleProperties: any, nodeName: string): string {
        const fontSize = styleProperties.fontSize || 16;
        const fontWeight = styleProperties.fontWeight || 400;

        if (fontSize >= 24) return 'Heading';
        if (fontSize >= 18) return 'Subheading';
        if (fontWeight >= 600) return 'Bold Text';

        return 'Body Text';
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

    /**
     * Categorize component for Flutter
     */
    private categorizeForFlutter(name: string): ComponentDefinition['flutterType'] {
        const lowerName = name.toLowerCase();

        if (lowerName.includes('button')) return 'button';
        if (lowerName.includes('card')) return 'card';
        if (lowerName.includes('input') || lowerName.includes('field')) return 'input';
        if (lowerName.includes('screen') || lowerName.includes('page')) return 'screen';
        if (lowerName.includes('icon')) return 'icon';

        return 'widget';
    }

    /**
     * Create hash for text style properties
     */
    private hashTextStyle(properties: any): string {
        const key = `${properties.fontSize || 16}_${properties.fontFamily || 'default'}_${properties.fontWeight || 400}`;
        return key;
    }
}