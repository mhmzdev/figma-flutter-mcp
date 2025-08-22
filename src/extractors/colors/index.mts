// src/extractors/colors/index.mts

// Core functionality
export { ColorExtractor, extractThemeColors, extractDesignSystemColors } from './core.mjs';

// Extractor functions
export {
    extractColorsFromThemeFrame,
    fillColorExtractor,
    strokeColorExtractor,
    isTypographyNode
} from './extractor.mjs';

// Types
export type {
    ThemeColor,
    ColorDefinition,
    ColorExtractionContext,
    ColorExtractorFn,
    ColorExtractionResult,
    ColorExtractionOptions,
    ThemeGenerationOptions
} from './types.mjs';
