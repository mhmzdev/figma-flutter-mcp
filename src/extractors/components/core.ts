// src/extractors/components/core.mts

import type {FigmaNode} from '../../types/figma.js';
import type {
    ComponentAnalysis,
    ComponentExtractionOptions,
    ComponentVariant
} from './types.js';
import {
    extractMetadata,
    extractLayoutInfo,
    extractStylingInfo,
    analyzeChildren,
} from './extractor.js';

/**
 * Component extraction and analysis class
 */
export class ComponentExtractor {
    private options: Required<ComponentExtractionOptions>;

    constructor(options: ComponentExtractionOptions = {}) {
        this.options = {
            maxChildNodes: options.maxChildNodes ?? 10,
            maxDepth: options.maxDepth ?? 3,
            includeHiddenNodes: options.includeHiddenNodes ?? false,
            prioritizeComponents: options.prioritizeComponents ?? true,
            extractTextContent: options.extractTextContent ?? true
        };
    }

    /**
     * Main component analysis method
     */
    async analyzeComponent(node: FigmaNode, userDefinedAsComponent: boolean = false): Promise<ComponentAnalysis> {
        const metadata = extractMetadata(node, userDefinedAsComponent);
        const layout = extractLayoutInfo(node);
        const styling = extractStylingInfo(node);

        const {children, nestedComponents, skippedNodes} = analyzeChildren(node, this.options);

        return {
            metadata,
            layout,
            styling,
            children,
            nestedComponents,
            skippedNodes: skippedNodes.length > 0 ? skippedNodes : undefined
        };
    }

    /**
     * Get extractor options
     */
    getOptions(): Required<ComponentExtractionOptions> {
        return this.options;
    }
}

/**
 * Convenience function to analyze a single component
 */
export async function analyzeComponent(
    node: FigmaNode,
    options: ComponentExtractionOptions = {},
    userDefinedAsComponent: boolean = false
): Promise<ComponentAnalysis> {
    const extractor = new ComponentExtractor(options);
    return extractor.analyzeComponent(node, userDefinedAsComponent);
}

/**
 * Convenience function to analyze component with variants
 */
export async function analyzeComponentWithVariants(
    componentSetNode: FigmaNode,
    options: ComponentExtractionOptions = {}
): Promise<{
    variants: ComponentVariant[];
    defaultAnalysis?: ComponentAnalysis;
}> {
    if (componentSetNode.type !== 'COMPONENT_SET') {
        throw new Error('Node is not a COMPONENT_SET');
    }

    const {VariantAnalyzer} = await import('./variant-analyzer.js');
    const variantAnalyzer = new VariantAnalyzer();
    const variants = await variantAnalyzer.analyzeComponentSet(componentSetNode);

    // Find and analyze the default variant
    const defaultVariant = variants.find(v => v.isDefault);
    let defaultAnalysis: ComponentAnalysis | undefined;

    if (defaultVariant && componentSetNode.children) {
        const defaultVariantNode = componentSetNode.children.find(child => child.id === defaultVariant.nodeId);
        if (defaultVariantNode) {
            const extractor = new ComponentExtractor(options);
            defaultAnalysis = await extractor.analyzeComponent(defaultVariantNode, false);
        }
    }

    return {
        variants,
        defaultAnalysis
    };
}
