// src/tools/flutter/components/deduplicated-helpers.mts

import type { DeduplicatedComponentAnalysis } from '../../../extractors/components/deduplicated-extractor.js';
import { FlutterStyleLibrary } from '../../../extractors/flutter/style-library.js';

export function generateDeduplicatedReport(analysis: DeduplicatedComponentAnalysis): string {
  let output = `Component Analysis (Deduplicated)\n\n`;
  
  output += `Component: ${analysis.metadata.name}\n`;
  output += `Type: ${analysis.metadata.type}\n`;
  output += `Node ID: ${analysis.metadata.nodeId}\n\n`;
  
  // Style references
  if (Object.keys(analysis.styleRefs).length > 0) {
    output += `Style References:\n`;
    Object.entries(analysis.styleRefs).forEach(([category, styleId]) => {
      output += `- ${category}: ${styleId}\n`;
    });
    output += `\n`;
  }
  
  // Children with their style references
  if (analysis.children.length > 0) {
    output += `Children (${analysis.children.length}):\n`;
    analysis.children.forEach((child, index) => {
      const semanticMark = child.semanticType ? ` [${child.semanticType.toUpperCase()}]` : '';
      output += `${index + 1}. ${child.name} (${child.type})${semanticMark}\n`;
      
      if (child.textContent) {
        output += `   Text: "${child.textContent}"\n`;
      }
      
      if (child.styleRefs.length > 0) {
        output += `   Styles: ${child.styleRefs.join(', ')}\n`;
      }
    });
    output += `\n`;
  }
  
  // New style definitions (only show if this analysis created new styles)
  if (analysis.newStyleDefinitions && Object.keys(analysis.newStyleDefinitions).length > 0) {
    output += `New Style Definitions:\n`;
    Object.entries(analysis.newStyleDefinitions).forEach(([id, definition]) => {
      output += `${id}: ${definition.category} style\n`;
    });
    output += `\nUse generate_flutter_implementation tool for complete Flutter code.\n`;
  }
  
  return output;
}

export function generateFlutterImplementation(analysis: DeduplicatedComponentAnalysis): string {
  const styleLibrary = FlutterStyleLibrary.getInstance();
  let implementation = `Flutter Implementation:\n\n`;
  
  // Widget structure
  const widgetName = toPascalCase(analysis.metadata.name);
  implementation += `class ${widgetName} extends StatelessWidget {\n`;
  implementation += `  const ${widgetName}({Key? key}) : super(key: key);\n\n`;
  implementation += `  @override\n`;
  implementation += `  Widget build(BuildContext context) {\n`;
  implementation += `    return Container(\n`;
  
  // Apply decoration if exists
  if (analysis.styleRefs.decoration) {
    implementation += `      decoration: ${analysis.styleRefs.decoration},\n`;
  }
  
  // Apply padding if exists
  if (analysis.styleRefs.padding) {
    implementation += `      padding: ${analysis.styleRefs.padding},\n`;
  }
  
  // Add child widget structure
  if (analysis.children.length > 0) {
    implementation += `      child: Column(\n`;
    implementation += `        children: [\n`;
    
    analysis.children.forEach(child => {
      if (child.semanticType === 'button' && child.textContent) {
        implementation += `          ElevatedButton(\n`;
        implementation += `            onPressed: () {},\n`;
        implementation += `            child: Text('${child.textContent}'),\n`;
        implementation += `          ),\n`;
      } else if (child.type === 'TEXT' && child.textContent) {
        implementation += `          Text('${child.textContent}'),\n`;
      }
    });
    
    implementation += `        ],\n`;
    implementation += `      ),\n`;
  }
  
  implementation += `    );\n`;
  implementation += `  }\n`;
  implementation += `}\n`;
  
  return implementation;
}

/**
 * Generate comprehensive deduplicated report with style library statistics
 */
export function generateComprehensiveDeduplicatedReport(
  analysis: DeduplicatedComponentAnalysis,
  includeStyleStats: boolean = true
): string {
  let output = `📊 Comprehensive Component Analysis (Deduplicated)\n`;
  output += `${'='.repeat(60)}\n\n`;

  // Component metadata
  output += `🏷️  Component Metadata:\n`;
  output += `   • Name: ${analysis.metadata.name}\n`;
  output += `   • Type: ${analysis.metadata.type}\n`;
  output += `   • Node ID: ${analysis.metadata.nodeId}\n`;
  if (analysis.metadata.componentKey) {
    output += `   • Component Key: ${analysis.metadata.componentKey}\n`;
  }
  output += `\n`;

  // Style references with usage information
  if (Object.keys(analysis.styleRefs).length > 0) {
    output += `🎨 Style References (Deduplicated):\n`;
    const styleLibrary = FlutterStyleLibrary.getInstance();
    
    Object.entries(analysis.styleRefs).forEach(([category, styleId]) => {
      const style = styleLibrary.getStyle(styleId);
      if (style) {
        output += `   • ${category}: ${styleId} (used ${style.usageCount} times)\n`;
      } else {
        output += `   • ${category}: ${styleId} (style not found)\n`;
      }
    });
    output += `\n`;
  } else {
    output += `🎨 Style References: None detected\n\n`;
  }

  // Children analysis with enhanced details
  if (analysis.children.length > 0) {
    output += `👶 Children Analysis (${analysis.children.length} children):\n`;
    analysis.children.forEach((child, index) => {
      const semanticMark = child.semanticType ? ` [${child.semanticType.toUpperCase()}]` : '';
      output += `   ${index + 1}. ${child.name} (${child.type})${semanticMark}\n`;
      
      if (child.textContent) {
        output += `      📝 Text: "${child.textContent}"\n`;
      }
      
      if (child.styleRefs.length > 0) {
        output += `      🎨 Style refs: ${child.styleRefs.join(', ')}\n`;
      }
      
      if (child.semanticType) {
        output += `      🏷️  Semantic type: ${child.semanticType}\n`;
      }
    });
    output += `\n`;
  } else {
    output += `👶 Children: No children detected\n\n`;
  }

  // Nested components
  if (analysis.nestedComponents.length > 0) {
    output += `🔗 Nested Components (${analysis.nestedComponents.length}):\n`;
    analysis.nestedComponents.forEach((nested, index) => {
      output += `   ${index + 1}. ${nested.name}\n`;
      output += `      🆔 Node ID: ${nested.nodeId}\n`;
      if (nested.componentKey) {
        output += `      🔑 Component Key: ${nested.componentKey}\n`;
      }
      output += `      🔧 Needs separate analysis: ${nested.needsSeparateAnalysis ? 'Yes' : 'No'}\n`;
    });
    output += `\n`;
  }

  // New style definitions created in this analysis
  if (analysis.newStyleDefinitions && Object.keys(analysis.newStyleDefinitions).length > 0) {
    output += `✨ New Style Definitions Created:\n`;
    Object.entries(analysis.newStyleDefinitions).forEach(([id, definition]) => {
      output += `   • ${id} (${definition.category})\n`;
      output += `     Usage count: ${definition.usageCount}\n`;
      output += `     Properties: ${Object.keys(definition.properties).join(', ')}\n`;
    });
    output += `\n`;
  }

  // Style library statistics (if requested)
  if (includeStyleStats) {
    const styleLibrary = FlutterStyleLibrary.getInstance();
    const allStyles = styleLibrary.getAllStyles();
    
    output += `📚 Style Library Summary:\n`;
    output += `   • Total unique styles: ${allStyles.length}\n`;
    
    if (allStyles.length > 0) {
      const categoryStats = allStyles.reduce((acc, style) => {
        acc[style.category] = (acc[style.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(categoryStats).forEach(([category, count]) => {
        output += `   • ${category}: ${count} style(s)\n`;
      });
      
      const totalUsage = allStyles.reduce((sum, style) => sum + style.usageCount, 0);
      output += `   • Total style usage: ${totalUsage}\n`;
      
      if (totalUsage > allStyles.length) {
        const efficiency = ((totalUsage - allStyles.length) / totalUsage * 100).toFixed(1);
        output += `   • Deduplication efficiency: ${efficiency}% reduction\n`;
      }
    }
    output += `\n`;
  }

  // Quick actions
  output += `🚀 Quick Actions:\n`;
  output += `   • Use 'generate_flutter_implementation' tool for complete Flutter code\n`;
  output += `   • Use 'analyze_figma_component' with different components to build style library\n`;
  output += `   • Use 'resetStyleLibrary: true' to start fresh analysis\n`;

  return output;
}

/**
 * Generate style library status report
 */
export function generateStyleLibraryReport(): string {
  const styleLibrary = FlutterStyleLibrary.getInstance();
  const allStyles = styleLibrary.getAllStyles();
  
  let output = `📚 Style Library Status Report\n`;
  output += `${'='.repeat(40)}\n\n`;

  if (allStyles.length === 0) {
    output += `⚠️  Style library is empty.\n`;
    output += `   • Analyze components with 'useDeduplication: true' to populate\n`;
    output += `   • Use 'analyze_figma_component' tool to start building your style library\n`;
    return output;
  }

  output += `📊 Library Statistics:\n`;
  output += `   • Total unique styles: ${allStyles.length}\n`;
  
  // Category breakdown
  const categoryStats = allStyles.reduce((acc, style) => {
    acc[style.category] = (acc[style.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  output += `   • Style categories:\n`;
  Object.entries(categoryStats).forEach(([category, count]) => {
    output += `     - ${category}: ${count} style(s)\n`;
  });

  // Usage statistics
  const totalUsage = allStyles.reduce((sum, style) => sum + style.usageCount, 0);
  output += `   • Total style usage: ${totalUsage}\n`;
  
  if (totalUsage > allStyles.length) {
    const efficiency = ((totalUsage - allStyles.length) / totalUsage * 100).toFixed(1);
    output += `   • Deduplication efficiency: ${efficiency}% reduction\n`;
  }

  // Most used styles
  const sortedByUsage = [...allStyles].sort((a, b) => b.usageCount - a.usageCount);
  const topStyles = sortedByUsage.slice(0, 5);
  
  if (topStyles.length > 0) {
    output += `\n🔥 Most Used Styles:\n`;
    topStyles.forEach((style, index) => {
      output += `   ${index + 1}. ${style.id} (${style.category}) - used ${style.usageCount} times\n`;
    });
  }

  // Detailed style list
  output += `\n📋 All Styles:\n`;
  Object.entries(categoryStats).forEach(([category, count]) => {
    const categoryStyles = allStyles.filter(s => s.category === category);
    output += `\n   ${category.toUpperCase()} (${count}):\n`;
    categoryStyles.forEach(style => {
      output += `   • ${style.id} (used ${style.usageCount} times)\n`;
    });
  });

  return output;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .replace(/\s/g, '');
}
