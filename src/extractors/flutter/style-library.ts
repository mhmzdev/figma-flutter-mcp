// src/extractors/flutter/style-library.mts

import { Logger } from '../../utils/logger.js';

export interface FlutterStyleDefinition {
  id: string;
  category: 'decoration' | 'text' | 'layout' | 'padding';
  properties: Record<string, any>;
  flutterCode: string;
  hash: string;
  semanticHash: string;
  usageCount: number;
  parentId?: string;
  childIds: string[];
  variance?: number; // How different from parent (0-1)
}

export interface StyleRelationship {
  parentId?: string;
  childIds: string[];
  variance: number; // How different from parent (0-1)
}

export interface OptimizationReport {
  totalStyles: number;
  duplicatesRemoved: number;
  variantsCreated: number;
  hierarchyDepth: number;
  memoryReduction: string;
}

export class FlutterStyleLibrary {
  private static instance: FlutterStyleLibrary;
  private styles = new Map<string, FlutterStyleDefinition>();
  private hashToId = new Map<string, string>();
  private semanticHashToId = new Map<string, string>();
  private autoOptimizeEnabled = true;
  private optimizationThreshold = 20; // Auto-optimize after every N styles
  private lastOptimizationCount = 0;
  
  static getInstance(): FlutterStyleLibrary {
    if (!this.instance) {
      this.instance = new FlutterStyleLibrary();
    }
    return this.instance;
  }
  
  addStyle(category: string, properties: any, context?: string): string {
    const hash = this.generateHash(properties);
    const semanticHash = this.generateSemanticHash(properties);
    
    Logger.info(`🎨 Adding ${category} style with properties:`, JSON.stringify(properties, null, 2));
    Logger.info(`📝 Generated hashes - Exact: ${hash.substring(0, 20)}..., Semantic: ${semanticHash.substring(0, 20)}...`);
    
    // Check for exact matches first
    if (this.hashToId.has(hash)) {
      const existingId = this.hashToId.get(hash)!;
      const style = this.styles.get(existingId)!;
      style.usageCount++;
      Logger.info(`✅ Exact match found! Reusing style ${existingId} (usage: ${style.usageCount})`);
      return existingId;
    }
    
    // Check for semantic equivalents
    if (this.semanticHashToId.has(semanticHash)) {
      const existingId = this.semanticHashToId.get(semanticHash)!;
      const style = this.styles.get(existingId)!;
      style.usageCount++;
      Logger.info(`🔍 Semantic match found! Reusing style ${existingId} (usage: ${style.usageCount})`);
      return existingId;
    }
    
    // Check if this should be a variant of existing style
    const parentStyle = this.findPotentialParent(properties);
    
    if (parentStyle) {
      const variance = this.calculateVariance(properties, parentStyle.properties);
      Logger.info(`🌳 Parent style found: ${parentStyle.id} (variance: ${(variance * 100).toFixed(1)}%)`);
    }
    
    const generatedId = this.generateId();
    const styleId = `${category}${generatedId.charAt(0).toUpperCase()}${generatedId.slice(1)}`;
    const definition: FlutterStyleDefinition = {
      id: styleId,
      category: category as any,
      properties,
      flutterCode: this.generateFlutterCode(category, properties),
      hash,
      semanticHash,
      usageCount: 1,
      parentId: parentStyle?.id,
      childIds: [],
      variance: parentStyle ? this.calculateVariance(properties, parentStyle.properties) : undefined
    };
    
    // Update parent-child relationships
    if (parentStyle) {
      parentStyle.childIds.push(styleId);
      Logger.info(`🔗 Updated parent ${parentStyle.id} with child ${styleId}`);
    }
    
    Logger.info(`✨ Created new style: ${styleId} (total styles: ${this.styles.size + 1})`);
    
    this.styles.set(styleId, definition);
    this.hashToId.set(hash, styleId);
    this.semanticHashToId.set(semanticHash, styleId);
    
    // Auto-optimize if threshold is reached
    this.checkAutoOptimization();
    
    return styleId;
  }
  
  getStyle(id: string): FlutterStyleDefinition | undefined {
    return this.styles.get(id);
  }
  
  getAllStyles(): FlutterStyleDefinition[] {
    return Array.from(this.styles.values());
  }
  
  findSimilarStyles(properties: any, threshold: number = 0.8): string[] {
    const similarStyles: string[] = [];
    
    for (const [id, style] of this.styles) {
      const similarity = this.calculateSimilarity(properties, style.properties);
      if (similarity >= threshold && similarity < 1.0) {
        similarStyles.push(id);
      }
    }
    
    return similarStyles;
  }
  
  getStyleHierarchy(): Record<string, StyleRelationship> {
    const hierarchy: Record<string, StyleRelationship> = {};
    
    for (const [id, style] of this.styles) {
      hierarchy[id] = {
        parentId: style.parentId,
        childIds: style.childIds,
        variance: style.variance || 0
      };
    }
    
    return hierarchy;
  }
  
  optimizeLibrary(): OptimizationReport {
    const beforeCount = this.styles.size;
    let duplicatesRemoved = 0;
    let variantsCreated = 0;
    let hierarchyDepth = 0;
    
    // Find and merge exact duplicates (shouldn't happen with current logic, but safety check)
    const hashGroups = new Map<string, string[]>();
    for (const [id, style] of this.styles) {
      const group = hashGroups.get(style.hash) || [];
      group.push(id);
      hashGroups.set(style.hash, group);
    }
    
    // Remove duplicates (keep first, redirect others)
    for (const [hash, ids] of hashGroups) {
      if (ids.length > 1) {
        const keepId = ids[0];
        const keepStyle = this.styles.get(keepId)!;
        
        for (let i = 1; i < ids.length; i++) {
          const removeId = ids[i];
          const removeStyle = this.styles.get(removeId)!;
          
          // Merge usage counts
          keepStyle.usageCount += removeStyle.usageCount;
          
          // Remove duplicate
          this.styles.delete(removeId);
          this.hashToId.delete(removeStyle.hash);
          this.semanticHashToId.delete(removeStyle.semanticHash);
          duplicatesRemoved++;
        }
      }
    }
    
    // Calculate hierarchy depth
    for (const style of this.styles.values()) {
      if (style.childIds.length > 0) {
        variantsCreated += style.childIds.length;
      }
      
      // Calculate depth from this node
      let depth = 0;
      let currentStyle = style;
      while (currentStyle.parentId) {
        depth++;
        currentStyle = this.styles.get(currentStyle.parentId)!;
        if (!currentStyle) break; // Safety check
      }
      hierarchyDepth = Math.max(hierarchyDepth, depth);
    }
    
    const afterCount = this.styles.size;
    const memoryReduction = beforeCount > 0 
      ? `${((beforeCount - afterCount) / beforeCount * 100).toFixed(1)}%`
      : '0%';
    
    return {
      totalStyles: afterCount,
      duplicatesRemoved,
      variantsCreated,
      hierarchyDepth,
      memoryReduction
    };
  }
  
  reset(): void {
    this.styles.clear();
    this.hashToId.clear();
    this.semanticHashToId.clear();
    this.lastOptimizationCount = 0;
  }
  
  setAutoOptimization(enabled: boolean, threshold: number = 20): void {
    this.autoOptimizeEnabled = enabled;
    this.optimizationThreshold = threshold;
    Logger.info(`⚙️  Auto-optimization ${enabled ? 'enabled' : 'disabled'} (threshold: ${threshold})`);
  }
  
  private checkAutoOptimization(): void {
    if (!this.autoOptimizeEnabled) return;
    
    const currentCount = this.styles.size;
    const stylesSinceLastOptimization = currentCount - this.lastOptimizationCount;
    
    if (stylesSinceLastOptimization >= this.optimizationThreshold) {
      Logger.info(`🚀 Auto-optimization triggered! (${stylesSinceLastOptimization} new styles since last optimization)`);
      this.runAutoOptimization();
      this.lastOptimizationCount = currentCount;
    }
  }
  
  private runAutoOptimization(): OptimizationReport {
    Logger.info(`⚡ Running auto-optimization...`);
    const report = this.optimizeLibrary();
    Logger.info(`✅ Auto-optimization complete:`, {
      totalStyles: report.totalStyles,
      duplicatesRemoved: report.duplicatesRemoved,
      variantsCreated: report.variantsCreated,
      hierarchyDepth: report.hierarchyDepth,
      memoryReduction: report.memoryReduction
    });
    return report;
  }
  
  private generateHash(properties: any): string {
    // Use a more robust hash generation that preserves nested object properties
    return JSON.stringify(properties, (key, value) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Sort object keys for consistent hashing
        const sortedObj: any = {};
        Object.keys(value).sort().forEach(k => {
          sortedObj[k] = value[k];
        });
        return sortedObj;
      }
      return value;
    });
  }
  
  private generateSemanticHash(properties: any): string {
    // Normalize property values before hashing
    const normalized = this.normalizeProperties(properties);
    Logger.info(`🔄 Normalized properties:`, JSON.stringify(normalized, null, 2));
    
    // Create semantic fingerprint that catches equivalent styles
    const semanticKey = this.createSemanticKey(normalized);
    Logger.info(`🔑 Semantic key:`, JSON.stringify(semanticKey, null, 2));
    
    return this.hashObject(semanticKey);
  }
  
  private normalizeProperties(properties: any): any {
    const normalized = JSON.parse(JSON.stringify(properties)); // Deep copy
    
    // Normalize color representations
    if (normalized.fills) {
      normalized.fills = normalized.fills.map((fill: any) => {
        if (fill.hex) {
          // Normalize hex colors (e.g., #000000 -> #000000, #000 -> #000000)
          let hex = fill.hex.toLowerCase();
          if (hex === '#000') hex = '#000000';
          if (hex === '#fff') hex = '#ffffff';
          
          const normalizedFill = { ...fill, hex };
          if (hex === '#000000') normalizedFill.normalized = 'black';
          if (hex === '#ffffff') normalizedFill.normalized = 'white';
          
          return normalizedFill;
        }
        return fill;
      });
    }
    
    // Normalize padding representations
    if (normalized.padding) {
      const p = normalized.padding;
      // EdgeInsets.all(8) === EdgeInsets.fromLTRB(8,8,8,8)
      if (p.top === p.right && p.right === p.bottom && p.bottom === p.left) {
        normalized.padding = { uniform: p.top, isUniform: true };
      }
    }
    
    // Normalize border radius
    if (normalized.cornerRadius && typeof normalized.cornerRadius === 'object') {
      const r = normalized.cornerRadius;
      if (r.topLeft === r.topRight && r.topRight === r.bottomLeft && r.bottomLeft === r.bottomRight) {
        normalized.cornerRadius = r.topLeft;
      }
    }
    
    return normalized;
  }
  
  private createSemanticKey(properties: any): any {
    // Create a semantic representation that focuses on visual impact
    const key: any = {};
    
    // Group similar properties - be more specific to avoid false matches
    if (properties.fills && properties.fills.length > 0) {
      // Use the actual hex value to distinguish different colors
      key.color = properties.fills[0].hex?.toLowerCase();
    }
    
    if (properties.cornerRadius !== undefined) {
      key.borderRadius = typeof properties.cornerRadius === 'number' 
        ? properties.cornerRadius 
        : JSON.stringify(properties.cornerRadius);
    }
    
    if (properties.padding) {
      key.padding = properties.padding.isUniform 
        ? properties.padding.uniform 
        : JSON.stringify(properties.padding);
    }
    
    if (properties.effects?.dropShadows?.length > 0) {
      key.hasShadow = true;
      key.shadowIntensity = properties.effects.dropShadows.length;
      // Include shadow details for more specificity
      key.shadowDetails = properties.effects.dropShadows.map((s: any) => ({
        color: s.hex,
        blur: s.radius,
        offset: s.offset
      }));
    }
    
    return key;
  }
  
  private hashObject(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }
  
  private findPotentialParent(properties: any, threshold: number = 0.8): FlutterStyleDefinition | undefined {
    const allStyles = Array.from(this.styles.values());
    
    for (const style of allStyles) {
      const similarity = this.calculateSimilarity(properties, style.properties);
      if (similarity >= threshold && similarity < 1.0) {
        return style;
      }
    }
    
    return undefined;
  }
  
  private calculateSimilarity(props1: any, props2: any): number {
    const keys1 = new Set(Object.keys(props1));
    const keys2 = new Set(Object.keys(props2));
    const allKeys = new Set([...keys1, ...keys2]);
    
    let matches = 0;
    let total = allKeys.size;
    
    for (const key of allKeys) {
      if (keys1.has(key) && keys2.has(key)) {
        // Both have the key, check if values are similar
        if (this.areValuesSimilar(props1[key], props2[key])) {
          matches++;
        }
      }
      // If only one has the key, it's a difference (no match)
    }
    
    return total > 0 ? matches / total : 0;
  }
  
  private areValuesSimilar(val1: any, val2: any): boolean {
    if (val1 === val2) return true;
    
    // Handle arrays (like fills)
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((item, index) => this.areValuesSimilar(item, val2[index]));
    }
    
    // Handle objects
    if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
      const keys1 = Object.keys(val1);
      const keys2 = Object.keys(val2);
      if (keys1.length !== keys2.length) return false;
      return keys1.every(key => this.areValuesSimilar(val1[key], val2[key]));
    }
    
    // Handle numbers with tolerance
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      return Math.abs(val1 - val2) < 0.01;
    }
    
    return false;
  }
  
  private calculateVariance(childProps: any, parentProps: any): number {
    const similarity = this.calculateSimilarity(childProps, parentProps);
    return 1 - similarity; // Variance is inverse of similarity
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  }
  
  private generateFlutterCode(category: string, properties: any): string {
    switch (category) {
      case 'decoration':
        return FlutterCodeGenerator.generateDecoration(properties);
      case 'text':
        return FlutterCodeGenerator.generateTextStyle(properties);
      case 'padding':
        return FlutterCodeGenerator.generatePadding(properties);
      case 'layout':
        // Layout code generation can be added later
        return `// ${category} implementation`;
      default:
        return `// ${category} implementation`;
    }
  }
}

export class FlutterCodeGenerator {
  static generateDecoration(properties: any): string {
    let code = 'BoxDecoration(\n';
    
    if (properties.fills?.length > 0) {
      const fill = properties.fills[0];
      if (fill.hex) {
        code += `  color: Color(0xFF${fill.hex.substring(1)}),\n`;
      }
    }
    
    if (properties.cornerRadius !== undefined) {
      if (typeof properties.cornerRadius === 'number') {
        code += `  borderRadius: BorderRadius.circular(${properties.cornerRadius}),\n`;
      } else {
        const r = properties.cornerRadius;
        code += `  borderRadius: BorderRadius.only(\n`;
        code += `    topLeft: Radius.circular(${r.topLeft}),\n`;
        code += `    topRight: Radius.circular(${r.topRight}),\n`;
        code += `    bottomLeft: Radius.circular(${r.bottomLeft}),\n`;
        code += `    bottomRight: Radius.circular(${r.bottomRight}),\n`;
        code += `  ),\n`;
      }
    }
    
    if (properties.effects?.dropShadows?.length > 0) {
      code += `  boxShadow: [\n`;
      properties.effects.dropShadows.forEach((shadow: any) => {
        code += `    BoxShadow(\n`;
        code += `      color: Color(0xFF${shadow.hex.substring(1)}).withOpacity(${shadow.opacity}),\n`;
        code += `      offset: Offset(${shadow.offset.x}, ${shadow.offset.y}),\n`;
        code += `      blurRadius: ${shadow.radius},\n`;
        if (shadow.spread) {
          code += `      spreadRadius: ${shadow.spread},\n`;
        }
        code += `    ),\n`;
      });
      code += `  ],\n`;
    }
    
    code += ')';
    return code;
  }
  
  static generatePadding(properties: any): string {
    const p = properties.padding;
    if (!p) return 'EdgeInsets.zero';
    
    if (p.isUniform) {
      return `EdgeInsets.all(${p.top})`;
    }
    return `EdgeInsets.fromLTRB(${p.left}, ${p.top}, ${p.right}, ${p.bottom})`;
  }
  
  static generateTextStyle(properties: any): string {
    const parts: string[] = [];
    
    if (properties.fontFamily) {
      parts.push(`fontFamily: '${properties.fontFamily}'`);
    }
    if (properties.fontSize) {
      parts.push(`fontSize: ${properties.fontSize}`);
    }
    if (properties.fontWeight && properties.fontWeight !== 400) {
      const weight = properties.fontWeight >= 700 ? 'FontWeight.bold' : 
                    properties.fontWeight >= 600 ? 'FontWeight.w600' :
                    properties.fontWeight >= 500 ? 'FontWeight.w500' :
                    'FontWeight.normal';
      parts.push(`fontWeight: ${weight}`);
    }
    
    return `TextStyle(${parts.join(', ')})`;
  }
}
