// src/extractors/typography/index.mts

// Core functionality
export { TypographyExtractor, extractThemeTypography, extractDesignSystemTypography } from './core.mjs';

// Extractor functions
export {
    extractTypographyFromThemeFrame,
    textStyleExtractor,
    isTypographyDemoNode
} from './extractor.mjs';

// Types
export type {
    TypographyStyle,
    TypographyDefinition,
    TypographyExtractionContext,
    TypographyExtractorFn,
    TypographyExtractionResult,
    TypographyExtractionOptions,
    TypographyGenerationOptions,
    FontWeightMapping,
    TextStyleHash
} from './types.mjs';
