// src/extractors/flutter/index.mts

export { 
  FlutterStyleLibrary, 
  FlutterCodeGenerator,
  type FlutterStyleDefinition,
  type StyleRelationship,
  type OptimizationReport
} from './style-library.js';

export {
  GlobalStyleManager,
  type GlobalVars
} from './global-vars.js';

export {
  StyleMerger,
  type MergeCandidate
} from './style-merger.js';
