// src/extractors/colors/index.mts

// Core functionality
export { ColorExtractor, extractThemeColors } from './core.mjs';

// Extractor functions
export {
    extractColorsFromThemeFrame,
    isTypographyNode
} from './extractor.mjs';

// Types
export type {
    ThemeColor,
    ColorDefinition,
    ColorExtractionContext,
    ColorExtractorFn,
    ThemeGenerationOptions
} from './types.mjs';
