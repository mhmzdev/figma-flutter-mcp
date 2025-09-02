// src/extractors/flutter/style-library.mts

export interface FlutterStyleDefinition {
  id: string;
  category: 'decoration' | 'text' | 'layout' | 'padding';
  properties: Record<string, any>;
  flutterCode: string;
  hash: string;
  usageCount: number;
}

export class FlutterStyleLibrary {
  private static instance: FlutterStyleLibrary;
  private styles = new Map<string, FlutterStyleDefinition>();
  private hashToId = new Map<string, string>();
  
  static getInstance(): FlutterStyleLibrary {
    if (!this.instance) {
      this.instance = new FlutterStyleLibrary();
    }
    return this.instance;
  }
  
  addStyle(category: string, properties: any): string {
    const hash = this.generateHash(properties);
    
    if (this.hashToId.has(hash)) {
      const existingId = this.hashToId.get(hash)!;
      const style = this.styles.get(existingId)!;
      style.usageCount++;
      return existingId;
    }
    
    const generatedId = this.generateId();
    const styleId = `${category}${generatedId.charAt(0).toUpperCase()}${generatedId.slice(1)}`;
    const definition: FlutterStyleDefinition = {
      id: styleId,
      category: category as any,
      properties,
      flutterCode: this.generateFlutterCode(category, properties),
      hash,
      usageCount: 1
    };
    
    this.styles.set(styleId, definition);
    this.hashToId.set(hash, styleId);
    return styleId;
  }
  
  getStyle(id: string): FlutterStyleDefinition | undefined {
    return this.styles.get(id);
  }
  
  getAllStyles(): FlutterStyleDefinition[] {
    return Array.from(this.styles.values());
  }
  
  reset(): void {
    this.styles.clear();
    this.hashToId.clear();
  }
  
  private generateHash(properties: any): string {
    return JSON.stringify(properties, Object.keys(properties).sort());
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
