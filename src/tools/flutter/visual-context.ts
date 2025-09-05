// src/tools/flutter/visual-context.ts

import type { ComponentAnalysis } from '../../extractors/components/types.js';
import type { ScreenAnalysis } from '../../extractors/screens/types.js';

/**
 * Generate visual context for component analysis
 */
export function generateComponentVisualContext(
    analysis: ComponentAnalysis, 
    figmaUrl?: string,
    nodeId?: string
): string {
    let context = `📐 Visual Context for AI Implementation:\n`;
    context += `${'='.repeat(50)}\n\n`;

    // Design reference
    if (figmaUrl) {
        context += `🎨 Design Reference:\n`;
        context += `   • Figma URL: ${figmaUrl}\n`;
        if (nodeId) {
            context += `   • Node ID: ${nodeId}\n`;
        }
        context += `   • Component: ${analysis.metadata.name}\n`;
        context += `   • Type: ${analysis.metadata.type}\n\n`;
    }

    // ASCII layout representation
    context += `📏 Layout Structure:\n`;
    context += generateComponentAsciiLayout(analysis);
    context += `\n`;

    // Spatial relationships
    context += `📍 Spatial Relationships:\n`;
    context += generateComponentSpatialDescription(analysis);
    context += `\n`;

    // Visual patterns
    context += `🎯 Visual Design Patterns:\n`;
    context += generateComponentPatternDescription(analysis);
    context += `\n`;

    // Implementation guidance
    context += `💡 Implementation Guidance:\n`;
    context += generateComponentImplementationHints(analysis);
    
    // Semantic detection information
    context += `\n🧠 Enhanced Semantic Detection:\n`;
    context += `   • Multi-factor analysis with confidence scoring\n`;
    context += `   • Context-aware classification using position and parent information\n`;
    context += `   • Design pattern recognition for improved accuracy\n`;
    context += `   • Fallback to legacy detection for low-confidence classifications\n`;
    context += `   • Reduced false positives through evidence-based classification\n`;

    return context;
}

/**
 * Generate visual context for screen analysis
 */
export function generateScreenVisualContext(
    analysis: ScreenAnalysis,
    figmaUrl?: string,
    nodeId?: string
): string {
    let context = `📱 Screen Visual Context for AI Implementation:\n`;
    context += `${'='.repeat(55)}\n\n`;

    // Design reference
    if (figmaUrl) {
        context += `🎨 Design Reference:\n`;
        context += `   • Figma URL: ${figmaUrl}\n`;
        if (nodeId) {
            context += `   • Node ID: ${nodeId}\n`;
        }
        context += `   • Screen: ${analysis.metadata.name}\n`;
        context += `   • Device: ${analysis.metadata.deviceType} (${analysis.metadata.orientation})\n\n`;
    }

    // Screen layout with ASCII representation
    context += `📏 Screen Layout Structure:\n`;
    context += generateScreenAsciiLayout(analysis);
    context += `\n`;

    // Visual hierarchy
    context += `📊 Visual Hierarchy (top to bottom):\n`;
    context += generateScreenHierarchy(analysis);
    context += `\n`;

    // Spatial relationships
    context += `📍 Component Spatial Relationships:\n`;
    context += generateScreenSpatialDescription(analysis);
    context += `\n`;

    // Design patterns
    context += `🎯 Visual Design Patterns Detected:\n`;
    context += generateScreenPatternDescription(analysis);
    context += `\n`;

    // Implementation guidance
    context += `💡 Flutter Implementation Strategy:\n`;
    context += generateScreenImplementationHints(analysis);
    
    // Semantic detection information
    context += `\n🧠 Enhanced Semantic Detection:\n`;
    context += `   • Advanced section type detection with confidence scoring\n`;
    context += `   • Multi-factor analysis for text element classification\n`;
    context += `   • Context-aware position and styling analysis\n`;
    context += `   • Improved navigation and interactive element detection\n`;
    context += `   • Reduced misclassification through evidence-based decisions\n`;

    if (figmaUrl) {
        context += `\n🔗 Reference for Verification:\n`;
        context += `   View the original design at: ${figmaUrl}\n`;
        context += `   Use this to verify your implementation matches the intended visual design.\n`;
    }

    return context;
}

/**
 * Generate ASCII layout for component
 */
function generateComponentAsciiLayout(analysis: ComponentAnalysis): string {
    const width = Math.min(Math.max(Math.round(analysis.layout.dimensions.width / 20), 10), 50);
    const height = Math.min(Math.max(Math.round(analysis.layout.dimensions.height / 20), 3), 10);
    
    let ascii = `┌${'─'.repeat(width)}┐\n`;
    
    // Add component name in the middle
    const nameLines = Math.floor(height / 2);
    for (let i = 0; i < height; i++) {
        if (i === nameLines) {
            const name = analysis.metadata.name.substring(0, width - 2);
            const padding = Math.max(0, Math.floor((width - name.length) / 2));
            ascii += `│${' '.repeat(padding)}${name}${' '.repeat(width - padding - name.length)}│\n`;
        } else {
            ascii += `│${' '.repeat(width)}│\n`;
        }
    }
    
    ascii += `└${'─'.repeat(width)}┘\n`;
    ascii += `Dimensions: ${Math.round(analysis.layout.dimensions.width)}×${Math.round(analysis.layout.dimensions.height)}px\n`;
    
    // Add layout type indicator
    if (analysis.layout.type === 'auto-layout') {
        const direction = analysis.layout.direction === 'horizontal' ? '↔' : '↕';
        ascii += `Layout: Auto-layout ${direction} (${analysis.layout.direction})\n`;
        if (analysis.layout.spacing) {
            ascii += `Spacing: ${analysis.layout.spacing}px\n`;
        }
    }

    return ascii;
}

/**
 * Generate ASCII layout for screen
 */
function generateScreenAsciiLayout(analysis: ScreenAnalysis): string {
    const screenWidth = Math.min(Math.max(Math.round(analysis.metadata.dimensions.width / 30), 15), 40);
    const screenHeight = Math.min(Math.max(Math.round(analysis.metadata.dimensions.height / 40), 8), 20);
    
    let ascii = `📱 Screen Layout Map:\n`;
    ascii += `┌${'─'.repeat(screenWidth)}┐\n`;
    
    // Categorize sections by position
    const headerSections = analysis.sections.filter(s => s.type === 'header');
    const contentSections = analysis.sections.filter(s => s.type === 'content');
    const footerSections = analysis.sections.filter(s => s.type === 'footer');
    const navSections = analysis.sections.filter(s => s.type === 'navigation');
    
    let currentLine = 0;
    
    // Header area
    if (headerSections.length > 0) {
        const headerLines = Math.ceil(screenHeight * 0.15);
        for (let i = 0; i < headerLines && currentLine < screenHeight; i++) {
            if (i === Math.floor(headerLines / 2)) {
                const text = 'HEADER';
                const padding = Math.max(0, Math.floor((screenWidth - text.length) / 2));
                ascii += `│${' '.repeat(padding)}${text}${' '.repeat(screenWidth - padding - text.length)}│\n`;
            } else {
                ascii += `│${' '.repeat(screenWidth)}│\n`;
            }
            currentLine++;
        }
    }
    
    // Content area
    const contentLines = screenHeight - currentLine - (footerSections.length > 0 ? Math.ceil(screenHeight * 0.15) : 0);
    for (let i = 0; i < contentLines && currentLine < screenHeight; i++) {
        if (i === Math.floor(contentLines / 2)) {
            const text = 'CONTENT';
            const padding = Math.max(0, Math.floor((screenWidth - text.length) / 2));
            ascii += `│${' '.repeat(padding)}${text}${' '.repeat(screenWidth - padding - text.length)}│\n`;
        } else {
            ascii += `│${' '.repeat(screenWidth)}│\n`;
        }
        currentLine++;
    }
    
    // Footer area
    if (footerSections.length > 0) {
        const remainingLines = screenHeight - currentLine;
        for (let i = 0; i < remainingLines; i++) {
            if (i === Math.floor(remainingLines / 2)) {
                const text = navSections.length > 0 ? 'NAVIGATION' : 'FOOTER';
                const padding = Math.max(0, Math.floor((screenWidth - text.length) / 2));
                ascii += `│${' '.repeat(padding)}${text}${' '.repeat(screenWidth - padding - text.length)}│\n`;
            } else {
                ascii += `│${' '.repeat(screenWidth)}│\n`;
            }
        }
    }
    
    ascii += `└${'─'.repeat(screenWidth)}┘\n`;
    ascii += `Screen: ${Math.round(analysis.metadata.dimensions.width)}×${Math.round(analysis.metadata.dimensions.height)}px (${analysis.metadata.deviceType})\n`;

    return ascii;
}

/**
 * Generate component spatial description
 */
function generateComponentSpatialDescription(analysis: ComponentAnalysis): string {
    let description = '';
    
    // Layout analysis
    if (analysis.layout.type === 'auto-layout') {
        description += `   • Layout flow: ${analysis.layout.direction} auto-layout\n`;
        if (analysis.layout.spacing) {
            description += `   • Element spacing: ${analysis.layout.spacing}px consistent\n`;
        }
        if (analysis.layout.alignItems) {
            description += `   • Cross-axis alignment: ${analysis.layout.alignItems}\n`;
        }
        if (analysis.layout.justifyContent) {
            description += `   • Main-axis alignment: ${analysis.layout.justifyContent}\n`;
        }
    } else {
        description += `   • Layout flow: absolute positioning\n`;
    }

    // Padding analysis
    if (analysis.layout.padding) {
        const p = analysis.layout.padding;
        if (p.isUniform) {
            description += `   • Internal padding: ${p.top}px uniform\n`;
        } else {
            description += `   • Internal padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px (TRBL)\n`;
        }
    }

    // Children positioning
    if (analysis.children.length > 0) {
        description += `   • Contains ${analysis.children.length} child elements\n`;
        const highImportanceChildren = analysis.children.filter(c => c.visualImportance >= 7);
        if (highImportanceChildren.length > 0) {
            description += `   • ${highImportanceChildren.length} high-priority elements (visual weight ≥7)\n`;
        }
    }

    return description;
}

/**
 * Generate screen spatial description
 */
function generateScreenSpatialDescription(analysis: ScreenAnalysis): string {
    let description = '';
    
    // Screen zones
    const screenHeight = analysis.metadata.dimensions.height;
    description += `   • Header zone: Y < ${Math.round(screenHeight * 0.15)}px (top 15%)\n`;
    description += `   • Content zone: Y ${Math.round(screenHeight * 0.15)}px - ${Math.round(screenHeight * 0.85)}px\n`;
    description += `   • Footer zone: Y > ${Math.round(screenHeight * 0.85)}px (bottom 15%)\n`;

    // Content area
    if (analysis.layout.contentArea) {
        const area = analysis.layout.contentArea;
        description += `   • Primary content area: ${Math.round(area.width)}×${Math.round(area.height)}px\n`;
        description += `   • Content position: (${Math.round(area.x)}, ${Math.round(area.y)})\n`;
    }

    // Section distribution
    if (analysis.sections.length > 0) {
        const sectionsByType = analysis.sections.reduce((acc, section) => {
            acc[section.type] = (acc[section.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        description += `   • Section distribution: `;
        Object.entries(sectionsByType).forEach(([type, count], index) => {
            description += `${count} ${type}${index < Object.keys(sectionsByType).length - 1 ? ', ' : ''}`;
        });
        description += `\n`;
    }

    return description;
}

/**
 * Generate screen hierarchy
 */
function generateScreenHierarchy(analysis: ScreenAnalysis): string {
    let hierarchy = '';
    
    // Sort sections by importance and position
    const sortedSections = [...analysis.sections].sort((a, b) => {
        // First by type priority (header > content > footer)
        const typePriority = { header: 3, navigation: 2, content: 1, footer: 0, sidebar: 1, modal: 2, other: 0 };
        const aPriority = typePriority[a.type] || 0;
        const bPriority = typePriority[b.type] || 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Then by importance score
        return b.importance - a.importance;
    });

    sortedSections.forEach((section, index) => {
        const position = section.layout.dimensions ? 
            `${Math.round(section.layout.dimensions.width)}×${Math.round(section.layout.dimensions.height)}px` : 
            'auto';
        hierarchy += `   ${index + 1}. ${section.name} (${section.type.toUpperCase()}) - ${position}\n`;
        hierarchy += `      Priority: ${section.importance}/10`;
        if (section.children.length > 0) {
            hierarchy += `, Contains: ${section.children.length} elements`;
        }
        if (section.components.length > 0) {
            hierarchy += `, Components: ${section.components.length}`;
        }
        hierarchy += `\n`;
    });

    return hierarchy;
}

/**
 * Generate component pattern description
 */
function generateComponentPatternDescription(analysis: ComponentAnalysis): string {
    let patterns = '';
    
    // Layout pattern
    patterns += `   • Layout type: ${analysis.layout.type}\n`;
    
    // Spacing pattern
    if (analysis.layout.spacing !== undefined) {
        patterns += `   • Spacing system: ${analysis.layout.spacing}px consistent\n`;
    }
    
    // Visual styling patterns
    if (analysis.styling.fills && analysis.styling.fills.length > 0) {
        const primaryColor = analysis.styling.fills[0].hex;
        patterns += `   • Color pattern: Primary ${primaryColor}\n`;
    }
    
    if (analysis.styling.cornerRadius !== undefined) {
        const radius = typeof analysis.styling.cornerRadius === 'number' 
            ? analysis.styling.cornerRadius 
            : `${analysis.styling.cornerRadius.topLeft}px mixed`;
        patterns += `   • Border radius: ${radius}px consistent\n`;
    }
    
    // Component grouping
    if (analysis.children.length > 0) {
        const componentChildren = analysis.children.filter(c => c.isNestedComponent).length;
        if (componentChildren > 0) {
            patterns += `   • Component composition: ${componentChildren}/${analysis.children.length} nested components\n`;
        }
    }

    // Visual weight
    const textElements = analysis.children.filter(c => c.type === 'TEXT').length;
    const visualElements = analysis.children.length - textElements;
    patterns += `   • Content balance: ${textElements} text, ${visualElements} visual elements\n`;

    return patterns;
}

/**
 * Generate screen pattern description
 */
function generateScreenPatternDescription(analysis: ScreenAnalysis): string {
    let patterns = '';
    
    // Overall layout pattern
    patterns += `   • Layout type: ${analysis.layout.type}\n`;
    if (analysis.layout.scrollable) {
        patterns += `   • Scroll behavior: vertical scrolling enabled\n`;
    }
    
    // Section patterns
    const sectionTypes = analysis.sections.map(s => s.type);
    const hasStandardLayout = sectionTypes.includes('header') && sectionTypes.includes('content');
    patterns += `   • Screen structure: ${hasStandardLayout ? 'standard' : 'custom'} layout pattern\n`;
    
    // Navigation patterns
    if (analysis.navigation.hasTabBar) patterns += `   • Navigation: bottom tab bar\n`;
    if (analysis.navigation.hasAppBar) patterns += `   • Navigation: top app bar\n`;
    if (analysis.navigation.hasDrawer) patterns += `   • Navigation: side drawer\n`;
    
    // Visual weight distribution
    const headerSections = analysis.sections.filter(s => s.type === 'header').length;
    const contentSections = analysis.sections.filter(s => s.type === 'content').length;
    const footerSections = analysis.sections.filter(s => s.type === 'footer' || s.type === 'navigation').length;
    
    if (headerSections > contentSections) {
        patterns += `   • Visual weight: header-heavy design\n`;
    } else if (footerSections > contentSections) {
        patterns += `   • Visual weight: bottom-heavy design\n`;
    } else {
        patterns += `   • Visual weight: content-focused design\n`;
    }

    return patterns;
}

/**
 * Generate component implementation hints
 */
function generateComponentImplementationHints(analysis: ComponentAnalysis): string {
    let hints = '';
    
    // Main container suggestion
    if (analysis.layout.type === 'auto-layout') {
        const widget = analysis.layout.direction === 'horizontal' ? 'Row' : 'Column';
        hints += `   • Main container: Use ${widget}() for ${analysis.layout.direction} layout\n`;
        if (analysis.layout.spacing) {
            hints += `   • Spacing: Add SizedBox gaps of ${analysis.layout.spacing}px\n`;
        }
    } else {
        hints += `   • Main container: Use Stack() or Container() for absolute positioning\n`;
    }
    
    // Styling approach
    if (analysis.styling.fills || analysis.styling.strokes || analysis.styling.cornerRadius !== undefined) {
        hints += `   • Styling: Implement BoxDecoration for visual styling\n`;
    }
    
    // Text handling
    const textChildren = analysis.children.filter(c => c.type === 'TEXT');
    if (textChildren.length > 0) {
        hints += `   • Text elements: ${textChildren.length} Text() widgets with custom styling\n`;
    }
    
    // Component composition
    const nestedComponents = analysis.children.filter(c => c.isNestedComponent);
    if (nestedComponents.length > 0) {
        hints += `   • Component structure: Break down ${nestedComponents.length} nested components\n`;
    }
    
    // Responsive considerations
    if (analysis.layout.dimensions.width > 400) {
        hints += `   • Responsive: Consider MediaQuery for larger screens\n`;
    }

    return hints;
}

/**
 * Generate screen implementation hints
 */
function generateScreenImplementationHints(analysis: ScreenAnalysis): string {
    let hints = '';
    
    // Main scaffold structure
    hints += `   • Main structure: Scaffold with systematic layout\n`;
    
    // App bar recommendation
    if (analysis.navigation.hasAppBar) {
        hints += `   • App bar: AppBar widget for top navigation\n`;
    }
    
    // Body structure
    if (analysis.layout.scrollable) {
        hints += `   • Body: SingleChildScrollView with Column layout\n`;
    } else {
        hints += `   • Body: Column layout for fixed content\n`;
    }
    
    // Navigation recommendation
    if (analysis.navigation.hasTabBar) {
        hints += `   • Bottom navigation: BottomNavigationBar for tab switching\n`;
    }
    if (analysis.navigation.hasDrawer) {
        hints += `   • Side navigation: Drawer widget for menu access\n`;
    }
    
    // Section breakdown
    if (analysis.sections.length > 3) {
        hints += `   • Widget organization: Break into ${analysis.sections.length} section widgets\n`;
    }
    
    // Device considerations
    if (analysis.metadata.deviceType === 'mobile') {
        hints += `   • Mobile optimization: Use SafeArea and responsive sizing\n`;
    } else if (analysis.metadata.deviceType === 'tablet') {
        hints += `   • Tablet layout: Consider NavigationRail for wider screens\n`;
    }
    
    // Asset handling
    if (analysis.assets.length > 0) {
        hints += `   • Assets: ${analysis.assets.length} image/icon assets to implement\n`;
    }

    return hints;
}
