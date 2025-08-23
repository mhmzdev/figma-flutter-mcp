// src/extractors/screens/index.mts

// Core functionality
export {
    ScreenExtractor,
    analyzeScreen
} from './core.mjs';

export {
    extractScreenMetadata,
    extractScreenLayoutInfo,
    analyzeScreenSections,
    extractNavigationInfo,
    extractScreenAssets
} from './extractor.mjs';

// Types
export type {
    ScreenAnalysis,
    ScreenMetadata,
    ScreenLayoutInfo,
    ScreenSection,
    NavigationInfo,
    NavigationElement,
    ScreenAssetInfo,
    SkippedNodeInfo,
    ScreenExtractionOptions
} from './types.mjs';

// Convenience functions
export {
    parseComponentInput,
    isValidNodeIdFormat,
    extractIds,
    generateFigmaUrl,
    isFigmaUrl
} from '../../utils/figma-url-parser.mjs';

// Re-export commonly used types from figma types
export type {FigmaNode, FigmaColor, FigmaEffect} from '../../types/figma.mjs';
