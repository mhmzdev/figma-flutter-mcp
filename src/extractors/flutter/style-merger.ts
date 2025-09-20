// src/extractors/flutter/style-merger.ts

import { FlutterStyleDefinition } from './style-library.js';
import { Logger } from '../../utils/logger.js';

export interface MergeCandidate {
  styles: FlutterStyleDefinition[];
  commonProperties: any;
  differences: Record<string, any[]>;
  mergeScore: number;
}

export class StyleMerger {
  
  canMerge(style1: FlutterStyleDefinition, style2: FlutterStyleDefinition): boolean {
    // Check if two styles can be merged
    if (style1.category !== style2.category) {
      return false;
    }
    
    // Calculate merge benefit
    const compatibility = this.calculateCompatibility(style1.properties, style2.properties);
    const benefit = this.calculateMergeBenefit(style1, style2);
    
    // Merge if compatibility is high and benefit is significant
    return compatibility > 0.7 && benefit > 0.5;
  }
  
  mergeStyles(styles: FlutterStyleDefinition[]): FlutterStyleDefinition | null {
    if (styles.length < 2) return null;
    
    // Find common properties across all styles
    const commonProperties = this.extractCommonProperties(styles);
    
    if (Object.keys(commonProperties).length === 0) {
      return null; // No common properties to merge
    }
    
    // Create merged style from common properties
    const mergedStyle: FlutterStyleDefinition = {
      id: this.generateMergedId(styles),
      category: styles[0].category,
      properties: commonProperties,
      flutterCode: this.generateFlutterCode(styles[0].category, commonProperties),
      hash: this.generateHash(commonProperties),
      semanticHash: this.generateSemanticHash(commonProperties),
      usageCount: styles.reduce((sum, style) => sum + style.usageCount, 0),
      childIds: styles.map(style => style.id),
      variance: 0 // Base style has no variance
    };
    
    return mergedStyle;
  }
  
  extractCommonProperties(styles: FlutterStyleDefinition[]): any {
    if (styles.length === 0) return {};
    
    const commonProps: any = {};
    const firstStyle = styles[0];
    
    // Check each property in the first style
    for (const [key, value] of Object.entries(firstStyle.properties)) {
      let isCommon = true;
      
      // Check if this property exists and has the same value in all other styles
      for (let i = 1; i < styles.length; i++) {
        const otherStyle = styles[i];
        if (!otherStyle.properties.hasOwnProperty(key) || 
            !this.areValuesSimilar(value, otherStyle.properties[key])) {
          isCommon = false;
          break;
        }
      }
      
      if (isCommon) {
        commonProps[key] = value;
      }
    }
    
    return commonProps;
  }
  
  findMergeCandidates(styles: FlutterStyleDefinition[], minScore: number = 0.6): MergeCandidate[] {
    Logger.info(`🔍 StyleMerger: Finding merge candidates from ${styles.length} styles (min score: ${minScore})`);
    const candidates: MergeCandidate[] = [];
    
    // Group styles by category first
    const stylesByCategory = this.groupByCategory(styles);
    Logger.info(`📂 StyleMerger: Grouped styles by category:`, Object.keys(stylesByCategory).map(cat => `${cat}: ${stylesByCategory[cat].length}`));
    
    for (const [category, categoryStyles] of Object.entries(stylesByCategory)) {
      if (categoryStyles.length < 2) continue;
      
      // Find all possible combinations of 2 or more styles
      for (let i = 0; i < categoryStyles.length; i++) {
        for (let j = i + 1; j < categoryStyles.length; j++) {
          const styleGroup = [categoryStyles[i], categoryStyles[j]];
          const candidate = this.analyzeMergeCandidate(styleGroup);
          
          if (candidate.mergeScore >= minScore) {
            candidates.push(candidate);
          }
        }
      }
      
      // Also check for larger groups (3+ styles)
      if (categoryStyles.length >= 3) {
        const largeGroupCandidate = this.analyzeMergeCandidate(categoryStyles);
        if (largeGroupCandidate.mergeScore >= minScore) {
          candidates.push(largeGroupCandidate);
        }
      }
    }
    
    // Sort by merge score (highest first)
    return candidates.sort((a, b) => b.mergeScore - a.mergeScore);
  }
  
  private analyzeMergeCandidate(styles: FlutterStyleDefinition[]): MergeCandidate {
    const commonProperties = this.extractCommonProperties(styles);
    const differences = this.extractDifferences(styles, commonProperties);
    const mergeScore = this.calculateMergeScore(styles, commonProperties, differences);
    
    return {
      styles,
      commonProperties,
      differences,
      mergeScore
    };
  }
  
  private extractDifferences(styles: FlutterStyleDefinition[], commonProperties: any): Record<string, any[]> {
    const differences: Record<string, any[]> = {};
    
    // Collect all unique property keys
    const allKeys = new Set<string>();
    styles.forEach(style => {
      Object.keys(style.properties).forEach(key => allKeys.add(key));
    });
    
    // Find differences for each key
    for (const key of allKeys) {
      if (commonProperties.hasOwnProperty(key)) continue; // Skip common properties
      
      const values = styles.map(style => style.properties[key]).filter(val => val !== undefined);
      if (values.length > 0) {
        differences[key] = values;
      }
    }
    
    return differences;
  }
  
  private calculateMergeScore(styles: FlutterStyleDefinition[], commonProperties: any, differences: Record<string, any[]>): number {
    const totalProperties = this.countTotalProperties(styles);
    const commonCount = Object.keys(commonProperties).length;
    const differenceCount = Object.keys(differences).length;
    
    if (totalProperties === 0) return 0;
    
    // Score based on ratio of common properties to total properties
    const commonRatio = commonCount / totalProperties;
    
    // Bonus for high usage styles (more benefit from merging)
    const usageBonus = styles.reduce((sum, style) => sum + style.usageCount, 0) / (styles.length * 10);
    
    // Penalty for too many differences (harder to maintain)
    const differencePenalty = Math.min(differenceCount / 10, 0.3);
    
    return Math.max(0, Math.min(1, commonRatio + usageBonus - differencePenalty));
  }
  
  private countTotalProperties(styles: FlutterStyleDefinition[]): number {
    const allKeys = new Set<string>();
    styles.forEach(style => {
      Object.keys(style.properties).forEach(key => allKeys.add(key));
    });
    return allKeys.size;
  }
  
  private groupByCategory(styles: FlutterStyleDefinition[]): Record<string, FlutterStyleDefinition[]> {
    const groups: Record<string, FlutterStyleDefinition[]> = {};
    
    styles.forEach(style => {
      if (!groups[style.category]) {
        groups[style.category] = [];
      }
      groups[style.category].push(style);
    });
    
    return groups;
  }
  
  private calculateCompatibility(props1: any, props2: any): number {
    const keys1 = new Set(Object.keys(props1));
    const keys2 = new Set(Object.keys(props2));
    const allKeys = new Set([...keys1, ...keys2]);
    
    let compatible = 0;
    let total = allKeys.size;
    
    for (const key of allKeys) {
      if (keys1.has(key) && keys2.has(key)) {
        // Both have the key - check if values are compatible
        if (this.areValuesSimilar(props1[key], props2[key])) {
          compatible++;
        }
      } else if (keys1.has(key) || keys2.has(key)) {
        // Only one has the key - partial compatibility
        compatible += 0.5;
      }
    }
    
    return total > 0 ? compatible / total : 0;
  }
  
  private calculateMergeBenefit(style1: FlutterStyleDefinition, style2: FlutterStyleDefinition): number {
    // Benefit is higher for frequently used styles
    const usageBenefit = (style1.usageCount + style2.usageCount) / 20; // Normalize to 0-1 range
    
    // Benefit is higher for similar styles (less information loss)
    const similarity = this.calculateSimilarity(style1.properties, style2.properties);
    
    return Math.min(1, (usageBenefit + similarity) / 2);
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
  
  private generateMergedId(styles: FlutterStyleDefinition[]): string {
    const category = styles[0].category;
    const timestamp = Date.now().toString(36);
    const hash = Math.random().toString(36).substr(2, 4);
    return `${category}Merged${timestamp}${hash}`;
  }
  
  private generateFlutterCode(category: string, properties: any): string {
    // This should use the same logic as FlutterCodeGenerator
    // For now, return a placeholder
    return `// Merged ${category} style`;
  }
  
  private generateHash(properties: any): string {
    return JSON.stringify(properties, Object.keys(properties).sort());
  }
  
  private generateSemanticHash(properties: any): string {
    // Simplified semantic hash for merged styles
    const keys = Object.keys(properties).sort();
    return `semantic_${keys.join('_')}_${this.generateHash(properties)}`;
  }
}
