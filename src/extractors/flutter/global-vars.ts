// src/extractors/flutter/global-vars.ts

import { FlutterStyleLibrary, FlutterStyleDefinition, StyleRelationship, OptimizationReport } from './style-library.js';
import { Logger } from '../../utils/logger.js';

export interface GlobalVars {
  styles: Record<string, FlutterStyleDefinition>;
  relationships: Record<string, StyleRelationship>;
  usage: Record<string, number>;
}

export class GlobalStyleManager {
  private globalVars: GlobalVars = { styles: {}, relationships: {}, usage: {} };
  private styleLibrary = FlutterStyleLibrary.getInstance();
  
  addStyle(properties: any, context?: string): string {
    Logger.info(`🌐 GlobalStyleManager: Adding style with context: ${context}`);
    
    // Check for exact matches first
    const exactMatch = this.findExactMatch(properties);
    if (exactMatch) {
      Logger.info(`🎯 GlobalStyleManager: Found exact match ${exactMatch}`);
      this.incrementUsage(exactMatch);
      return exactMatch;
    }
    
    // Check for semantic equivalents
    const semanticMatch = this.findSemanticMatch(properties);
    if (semanticMatch) {
      Logger.info(`🔍 GlobalStyleManager: Found semantic match ${semanticMatch}`);
      this.incrementUsage(semanticMatch);
      return semanticMatch;
    }
    
    // Check if this should be a variant of existing style
    const parentStyle = this.findPotentialParent(properties);
    if (parentStyle) {
      Logger.info(`👨‍👩‍👧‍👦 GlobalStyleManager: Found potential parent ${parentStyle.id}`);
    }
    
    // Create new style with proper relationships
    return this.createNewStyle(properties, parentStyle, context);
  }
  
  private findExactMatch(properties: any): string | undefined {
    const hash = this.generateHash(properties);
    
    for (const [id, style] of Object.entries(this.globalVars.styles)) {
      if (style.hash === hash) {
        return id;
      }
    }
    
    return undefined;
  }
  
  private findSemanticMatch(properties: any): string | undefined {
    const semanticHash = this.generateSemanticHash(properties);
    
    for (const [id, style] of Object.entries(this.globalVars.styles)) {
      if (style.semanticHash === semanticHash) {
        return id;
      }
    }
    
    return undefined;
  }
  
  private findPotentialParent(properties: any, threshold: number = 0.8): FlutterStyleDefinition | undefined {
    let bestMatch: FlutterStyleDefinition | undefined;
    let bestSimilarity = 0;
    
    for (const style of Object.values(this.globalVars.styles)) {
      const similarity = this.calculateSimilarity(properties, style.properties);
      if (similarity >= threshold && similarity < 1.0 && similarity > bestSimilarity) {
        bestMatch = style;
        bestSimilarity = similarity;
      }
    }
    
    return bestMatch;
  }
  
  private createNewStyle(properties: any, parentStyle?: FlutterStyleDefinition, context?: string): string {
    // Determine category from context or properties
    const category = this.determineCategory(properties, context);
    
    // Use the style library to create the style (it handles all the logic)
    const styleId = this.styleLibrary.addStyle(category, properties, context);
    const newStyle = this.styleLibrary.getStyle(styleId)!;
    
    // Update global vars
    this.globalVars.styles[styleId] = newStyle;
    this.globalVars.usage[styleId] = newStyle.usageCount;
    
    if (newStyle.parentId || newStyle.childIds.length > 0) {
      this.globalVars.relationships[styleId] = {
        parentId: newStyle.parentId,
        childIds: newStyle.childIds,
        variance: newStyle.variance || 0
      };
    }
    
    return styleId;
  }
  
  private determineCategory(properties: any, context?: string): string {
    if (context) return context;
    
    // Auto-detect category based on properties
    if (properties.fills || properties.cornerRadius || properties.effects) {
      return 'decoration';
    }
    
    if (properties.fontFamily || properties.fontSize || properties.fontWeight) {
      return 'text';
    }
    
    if (properties.padding) {
      return 'padding';
    }
    
    return 'layout';
  }
  
  private incrementUsage(styleId: string): void {
    if (this.globalVars.usage[styleId]) {
      this.globalVars.usage[styleId]++;
    } else {
      this.globalVars.usage[styleId] = 1;
    }
    
    // Also update the style library
    const style = this.styleLibrary.getStyle(styleId);
    if (style) {
      style.usageCount++;
    }
  }
  
  optimizeLibrary(): OptimizationReport {
    Logger.info(`🔧 GlobalStyleManager: Starting library optimization`);
    
    // Sync with style library first
    this.syncWithStyleLibrary();
    Logger.info(`🔄 GlobalStyleManager: Synced with style library`);
    
    // Run optimization on the style library
    const report = this.styleLibrary.optimizeLibrary();
    Logger.info(`📊 GlobalStyleManager: Optimization report:`, report);
    
    // Update global vars after optimization
    this.syncFromStyleLibrary();
    Logger.info(`✅ GlobalStyleManager: Optimization complete`);
    
    return report;
  }
  
  private syncWithStyleLibrary(): void {
    // Update style library with any changes from global vars
    const allStyles = this.styleLibrary.getAllStyles();
    
    for (const style of allStyles) {
      if (this.globalVars.usage[style.id] && this.globalVars.usage[style.id] !== style.usageCount) {
        style.usageCount = this.globalVars.usage[style.id];
      }
    }
  }
  
  private syncFromStyleLibrary(): void {
    // Update global vars with current state of style library
    const allStyles = this.styleLibrary.getAllStyles();
    
    this.globalVars.styles = {};
    this.globalVars.usage = {};
    this.globalVars.relationships = {};
    
    for (const style of allStyles) {
      this.globalVars.styles[style.id] = style;
      this.globalVars.usage[style.id] = style.usageCount;
      
      if (style.parentId || style.childIds.length > 0) {
        this.globalVars.relationships[style.id] = {
          parentId: style.parentId,
          childIds: style.childIds,
          variance: style.variance || 0
        };
      }
    }
  }
  
  getGlobalVars(): GlobalVars {
    this.syncFromStyleLibrary();
    return { ...this.globalVars };
  }
  
  getStyleHierarchy(): Record<string, StyleRelationship> {
    return { ...this.globalVars.relationships };
  }
  
  getUsageStats(): Record<string, number> {
    return { ...this.globalVars.usage };
  }
  
  reset(): void {
    this.globalVars = { styles: {}, relationships: {}, usage: {} };
    this.styleLibrary.reset();
  }
  
  // Helper methods (delegated to style library for consistency)
  private generateHash(properties: any): string {
    return JSON.stringify(properties, Object.keys(properties).sort());
  }
  
  private generateSemanticHash(properties: any): string {
    // This should match the logic in FlutterStyleLibrary
    // For now, delegate to a simplified version
    const normalized = this.normalizeProperties(properties);
    const semanticKey = this.createSemanticKey(normalized);
    return JSON.stringify(semanticKey, Object.keys(semanticKey).sort());
  }
  
  private normalizeProperties(properties: any): any {
    const normalized = { ...properties };
    
    // Normalize color representations
    if (normalized.fills) {
      normalized.fills = normalized.fills.map((fill: any) => {
        if (fill.hex) {
          const hex = fill.hex.toLowerCase();
          if (hex === '#000000') return { ...fill, hex: '#000', normalized: 'black' };
          if (hex === '#ffffff') return { ...fill, hex: '#fff', normalized: 'white' };
        }
        return fill;
      });
    }
    
    // Normalize padding representations
    if (normalized.padding) {
      const p = normalized.padding;
      if (p.top === p.right && p.right === p.bottom && p.bottom === p.left) {
        normalized.padding = { uniform: p.top, isUniform: true };
      }
    }
    
    return normalized;
  }
  
  private createSemanticKey(properties: any): any {
    const key: any = {};
    
    if (properties.fills) {
      key.color = properties.fills[0]?.normalized || properties.fills[0]?.hex;
    }
    
    if (properties.cornerRadius !== undefined) {
      key.borderRadius = typeof properties.cornerRadius === 'number' 
        ? properties.cornerRadius 
        : 'complex';
    }
    
    if (properties.padding) {
      key.padding = properties.padding.isUniform 
        ? properties.padding.uniform 
        : 'complex';
    }
    
    return key;
  }
  
  private calculateSimilarity(props1: any, props2: any): number {
    const keys1 = new Set(Object.keys(props1));
    const keys2 = new Set(Object.keys(props2));
    const allKeys = new Set([...keys1, ...keys2]);
    
    let matches = 0;
    let total = allKeys.size;
    
    for (const key of allKeys) {
      if (keys1.has(key) && keys2.has(key)) {
        if (this.areValuesSimilar(props1[key], props2[key])) {
          matches++;
        }
      }
    }
    
    return total > 0 ? matches / total : 0;
  }
  
  private areValuesSimilar(val1: any, val2: any): boolean {
    if (val1 === val2) return true;
    
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((item, index) => this.areValuesSimilar(item, val2[index]));
    }
    
    if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
      const keys1 = Object.keys(val1);
      const keys2 = Object.keys(val2);
      if (keys1.length !== keys2.length) return false;
      return keys1.every(key => this.areValuesSimilar(val1[key], val2[key]));
    }
    
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      return Math.abs(val1 - val2) < 0.01;
    }
    
    return false;
  }
}
