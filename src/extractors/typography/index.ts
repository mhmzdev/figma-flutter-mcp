// src/extractors/typography/index.mts

// Core functionality
export { TypographyExtractor, extractThemeTypography } from './core.js';

// Extractor functions
export {
    extractTypographyFromThemeFrame,
    isTypographyDemoNode
} from './extractor.js';

// Types
export type {
    TypographyStyle,
    TypographyDefinition,
    TypographyExtractionContext,
    TypographyExtractorFn,
    TypographyExtractionOptions,
    TypographyGenerationOptions,
    FontWeightMapping,
    TextStyleHash
} from './types.js';
