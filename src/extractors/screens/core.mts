// src/extractors/screens/core.mts

import type {FigmaNode} from '../../types/figma.mjs';
import type {
    ScreenAnalysis,
    ScreenExtractionOptions
} from './types.mjs';
import {
    extractScreenMetadata,
    extractScreenLayoutInfo,
    analyzeScreenSections,
    extractNavigationInfo,
    extractScreenAssets
} from './extractor.mjs';

/**
 * Screen extraction and analysis class
 */
export class ScreenExtractor {
    private options: Required<ScreenExtractionOptions>;

    constructor(options: ScreenExtractionOptions = {}) {
        this.options = {
            maxSections: options.maxSections ?? 15,
            maxDepth: options.maxDepth ?? 4,
            includeHiddenNodes: options.includeHiddenNodes ?? false,
            extractNavigation: options.extractNavigation ?? true,
            extractAssets: options.extractAssets ?? true,
            deviceTypeDetection: options.deviceTypeDetection ?? true
        };
    }

    /**
     * Main screen analysis method
     */
    async analyzeScreen(node: FigmaNode): Promise<ScreenAnalysis> {
        const metadata = extractScreenMetadata(node);
        const layout = extractScreenLayoutInfo(node);
        
        const {sections, components, skippedNodes} = analyzeScreenSections(node, this.options);
        
        const navigation = this.options.extractNavigation 
            ? extractNavigationInfo(node)
            : { navigationElements: [] };
            
        const assets = this.options.extractAssets 
            ? extractScreenAssets(node)
            : [];

        return {
            metadata,
            layout,
            sections,
            components,
            navigation,
            assets,
            skippedNodes: skippedNodes.length > 0 ? skippedNodes : undefined
        };
    }

    /**
     * Get extractor options
     */
    getOptions(): Required<ScreenExtractionOptions> {
        return this.options;
    }
}

/**
 * Convenience function to analyze a screen
 */
export async function analyzeScreen(
    node: FigmaNode,
    options: ScreenExtractionOptions = {}
): Promise<ScreenAnalysis> {
    const extractor = new ScreenExtractor(options);
    return extractor.analyzeScreen(node);
}
