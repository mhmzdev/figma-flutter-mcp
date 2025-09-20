// src/extractors/components/deduplicated-extractor.mts

import type { FigmaNode } from '../../types/figma.js';
import type { FlutterStyleDefinition } from '../flutter/style-library.js';
import { FlutterStyleLibrary } from '../flutter/style-library.js';
import { GlobalStyleManager } from '../flutter/global-vars.js';
import { 
  extractStylingInfo, 
  extractLayoutInfo, 
  extractMetadata,
  extractTextInfo,
  createNestedComponentInfo
} from './extractor.js';
import type {
  ComponentMetadata,
  LayoutInfo,
  StylingInfo,
  NestedComponentInfo,
  TextInfo
} from './types.js';

export interface DeduplicatedComponentAnalysis {
  metadata: ComponentMetadata;
  styleRefs: Record<string, string>;
  children: DeduplicatedComponentChild[];
  nestedComponents: NestedComponentInfo[];
  newStyleDefinitions?: Record<string, FlutterStyleDefinition>;
}

export interface DeduplicatedComponentChild {
  nodeId: string;
  name: string;
  type: string;
  styleRefs: string[];
  semanticType?: string;
  textContent?: string;
}

export class DeduplicatedComponentExtractor {
  private styleLibrary = FlutterStyleLibrary.getInstance();
  private globalStyleManager = new GlobalStyleManager();
  
  async analyzeComponent(node: FigmaNode, trackNewStyles = false): Promise<DeduplicatedComponentAnalysis> {
    const styling = extractStylingInfo(node);
    const layout = extractLayoutInfo(node);
    const metadata = extractMetadata(node, false); // assuming not user-defined unless specified
    
    const styleRefs: Record<string, string> = {};
    const newStyles = new Set<string>();
    
    // Process decoration styles using the enhanced global style manager
    if (this.hasDecorationProperties(styling)) {
      const beforeCount = this.styleLibrary.getAllStyles().length;
      styleRefs.decoration = this.globalStyleManager.addStyle({
        fills: styling.fills,
        cornerRadius: styling.cornerRadius,
        effects: styling.effects
      }, 'decoration');
      if (trackNewStyles && this.styleLibrary.getAllStyles().length > beforeCount) {
        newStyles.add(styleRefs.decoration);
      }
    }
    
    // Process padding styles using the enhanced global style manager
    if (layout.padding) {
      const beforeCount = this.styleLibrary.getAllStyles().length;
      styleRefs.padding = this.globalStyleManager.addStyle({ padding: layout.padding }, 'padding');
      if (trackNewStyles && this.styleLibrary.getAllStyles().length > beforeCount) {
        newStyles.add(styleRefs.padding);
      }
    }
    
    // Process children with deduplication
    const children = await this.analyzeChildren(node);
    const nestedComponents = this.extractNestedComponents(node);
    
    const result: DeduplicatedComponentAnalysis = {
      metadata,
      styleRefs,
      children,
      nestedComponents
    };
    
    if (trackNewStyles && newStyles.size > 0) {
      result.newStyleDefinitions = this.getStyleDefinitions(Array.from(newStyles));
    }
    
    return result;
  }
  
  private async analyzeChildren(node: FigmaNode): Promise<DeduplicatedComponentChild[]> {
    if (!node.children) return [];
    
    const children: DeduplicatedComponentChild[] = [];
    
    for (const child of node.children) {
      if (!child.visible) continue;
      
      const childStyleRefs: string[] = [];
      
      // Extract child styling using enhanced global style manager
      const childStyling = extractStylingInfo(child);
      if (this.hasDecorationProperties(childStyling)) {
        const decorationRef = this.globalStyleManager.addStyle({
          fills: childStyling.fills,
          cornerRadius: childStyling.cornerRadius,
          effects: childStyling.effects
        }, 'decoration');
        childStyleRefs.push(decorationRef);
      }
      
      // Extract text styling for text nodes using enhanced global style manager
      let textContent: string | undefined;
      if (child.type === 'TEXT') {
        const textInfo = extractTextInfo(child);
        if (textInfo) {
          textContent = textInfo.content;
          
          // Add text style to library using enhanced deduplication
          if (child.style) {
            const textStyleRef = this.globalStyleManager.addStyle({
              fontFamily: child.style.fontFamily,
              fontSize: child.style.fontSize,
              fontWeight: child.style.fontWeight
            }, 'text');
            childStyleRefs.push(textStyleRef);
          }
        }
      }
      
      children.push({
        nodeId: child.id,
        name: child.name,
        type: child.type,
        styleRefs: childStyleRefs,
        semanticType: this.detectSemanticType(child),
        textContent
      });
    }
    
    return children;
  }
  
  private hasDecorationProperties(styling: StylingInfo): boolean {
    return !!(styling.fills?.length || styling.cornerRadius !== undefined || styling.effects?.dropShadows?.length);
  }
  
  private extractTextContent(node: any): string {
    return node.characters || node.name || '';
  }
  
  private detectSemanticType(node: any): string | undefined {
    // Simplified semantic detection
    if (node.type === 'TEXT') {
      const content = this.extractTextContent(node).toLowerCase();
      if (['click', 'submit', 'save', 'cancel'].some(word => content.includes(word))) {
        return 'button';
      }
      return 'text';
    }
    return undefined;
  }
  
  private extractNestedComponents(node: FigmaNode): NestedComponentInfo[] {
    if (!node.children) return [];
    
    const nestedComponents: NestedComponentInfo[] = [];
    
    for (const child of node.children) {
      if (child.type === 'COMPONENT' || child.type === 'INSTANCE' || child.type === 'COMPONENT_SET') {
        nestedComponents.push(createNestedComponentInfo(child));
      }
    }
    
    return nestedComponents;
  }
  
  private getStyleDefinitions(styleIds: string[]): Record<string, FlutterStyleDefinition> {
    const definitions: Record<string, FlutterStyleDefinition> = {};
    styleIds.forEach(id => {
      const definition = this.styleLibrary.getStyle(id);
      if (definition) {
        definitions[id] = definition;
      }
    });
    return definitions;
  }
}
