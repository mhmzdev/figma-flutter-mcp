// src/tools/flutter/screens/helpers.mts

import type {ScreenAnalysis, ScreenSection, NavigationElement, ScreenAssetInfo} from "../../../extractors/screens/types.js";

/**
 * Generate comprehensive screen analysis report
 */
export function generateScreenAnalysisReport(
    analysis: ScreenAnalysis,
    parsedInput?: any
): string {
    let output = `Screen Analysis Report\n\n`;

    // Screen metadata
    output += `Screen: ${analysis.metadata.name}\n`;
    output += `Type: ${analysis.metadata.type}\n`;
    output += `Node ID: ${analysis.metadata.nodeId}\n`;
    output += `Device Type: ${analysis.metadata.deviceType}\n`;
    output += `Orientation: ${analysis.metadata.orientation}\n`;
    output += `Dimensions: ${Math.round(analysis.metadata.dimensions.width)}×${Math.round(analysis.metadata.dimensions.height)}px\n`;
    if (parsedInput) {
        output += `Source: ${parsedInput.source === 'url' ? 'Figma URL' : 'Direct input'}\n`;
    }
    output += `\n`;

    // Screen layout information
    output += `Screen Layout:\n`;
    output += `- Layout Type: ${analysis.layout.type}\n`;
    if (analysis.layout.scrollable) {
        output += `- Scrollable: Yes\n`;
    }
    if (analysis.layout.hasHeader) {
        output += `- Has Header: Yes\n`;
    }
    if (analysis.layout.hasFooter) {
        output += `- Has Footer: Yes\n`;
    }
    if (analysis.layout.hasNavigation) {
        output += `- Has Navigation: Yes\n`;
    }
    if (analysis.layout.contentArea) {
        const area = analysis.layout.contentArea;
        output += `- Content Area: ${Math.round(area.width)}×${Math.round(area.height)}px at (${Math.round(area.x)}, ${Math.round(area.y)})\n`;
    }
    output += `\n`;

    // Screen sections
    if (analysis.sections.length > 0) {
        output += `Screen Sections (${analysis.sections.length} identified):\n`;
        analysis.sections.forEach((section, index) => {
            output += `${index + 1}. ${section.name} (${section.type.toUpperCase()})\n`;
            output += `   Priority: ${section.importance}/10\n`;
            
            if (section.layout.dimensions) {
                const dims = section.layout.dimensions;
                output += `   Size: ${Math.round(dims.width)}×${Math.round(dims.height)}px\n`;
            }
            
            if (section.children.length > 0) {
                output += `   Contains: ${section.children.length} elements\n`;
            }
            
            if (section.components.length > 0) {
                output += `   Components: ${section.components.length} nested component(s)\n`;
            }
        });
        output += `\n`;
    }

    // Navigation information
    if (analysis.navigation.navigationElements.length > 0) {
        output += `Navigation Elements:\n`;
        
        if (analysis.navigation.hasTabBar) output += `- Has Tab Bar\n`;
        if (analysis.navigation.hasAppBar) output += `- Has App Bar\n`;
        if (analysis.navigation.hasDrawer) output += `- Has Drawer\n`;
        if (analysis.navigation.hasBottomSheet) output += `- Has Bottom Sheet\n`;
        
        output += `\nNavigation Items (${analysis.navigation.navigationElements.length}):\n`;
        analysis.navigation.navigationElements.forEach((nav, index) => {
            const activeMark = nav.isActive ? ' [ACTIVE]' : '';
            const iconMark = nav.icon ? ' 🎯' : '';
            output += `${index + 1}. ${nav.name} (${nav.type.toUpperCase()})${activeMark}${iconMark}\n`;
            if (nav.text) {
                output += `   Text: "${nav.text}"\n`;
            }
        });
        output += `\n`;
    }

    // Assets information
    if (analysis.assets.length > 0) {
        output += `Screen Assets (${analysis.assets.length} found):\n`;
        
        const assetsByType = groupAssetsByType(analysis.assets);
        Object.entries(assetsByType).forEach(([type, assets]) => {
            output += `${type.toUpperCase()} (${assets.length}):\n`;
            assets.forEach(asset => {
                output += `- ${asset.name} (${asset.size}, ${asset.usage})\n`;
            });
        });
        output += `\n`;
    }

    // Nested components for separate analysis
    if (analysis.components.length > 0) {
        output += `Nested Components Found (${analysis.components.length}):\n`;
        output += `These components should be analyzed separately:\n`;
        analysis.components.forEach((comp, index) => {
            output += `${index + 1}. ${comp.name}\n`;
            output += `   Node ID: ${comp.nodeId}\n`;
            output += `   Type: ${comp.instanceType || 'COMPONENT'}\n`;
            if (comp.componentKey) {
                output += `   Component Key: ${comp.componentKey}\n`;
            }
        });
        output += `\n`;
    }

    // Skipped nodes report
    if (analysis.skippedNodes && analysis.skippedNodes.length > 0) {
        output += `Analysis Limitations:\n`;
        output += `${analysis.skippedNodes.length} sections were skipped due to limits:\n`;
        analysis.skippedNodes.forEach((skipped, index) => {
            output += `${index + 1}. ${skipped.name} (${skipped.type}) - ${skipped.reason}\n`;
        });
        output += `\nTo analyze all sections, increase the maxSections parameter.\n\n`;
    }

    // Flutter implementation guidance
    output += generateFlutterScreenGuidance(analysis);

    return output;
}

/**
 * Generate screen structure inspection report
 */
export function generateScreenStructureReport(node: any, showAllSections: boolean): string {
    let output = `Screen Structure Inspection\n\n`;

    output += `Screen: ${node.name}\n`;
    output += `Type: ${node.type}\n`;
    output += `Node ID: ${node.id}\n`;
    output += `Sections: ${node.children?.length || 0}\n`;

    if (node.absoluteBoundingBox) {
        const bbox = node.absoluteBoundingBox;
        output += `Dimensions: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px\n`;
        
        // Device type detection
        const deviceType = bbox.width > bbox.height ? 'Landscape' : 'Portrait';
        const screenSize = Math.max(bbox.width, bbox.height) > 1200 ? 'Desktop' : 
                          Math.max(bbox.width, bbox.height) > 800 ? 'Tablet' : 'Mobile';
        output += `Device: ${screenSize} ${deviceType}\n`;
    }

    output += `\n`;

    if (!node.children || node.children.length === 0) {
        output += `This screen has no sections.\n`;
        return output;
    }

    output += `Screen Structure:\n`;

    const sectionsToShow = showAllSections ? node.children : node.children.slice(0, 20);
    const hasMore = node.children.length > sectionsToShow.length;

    sectionsToShow.forEach((section: any, index: number) => {
        const isComponent = section.type === 'COMPONENT' || section.type === 'INSTANCE';
        const componentMark = isComponent ? ' [COMPONENT]' : '';
        const hiddenMark = section.visible === false ? ' [HIDDEN]' : '';
        
        // Detect section type
        const sectionType = detectSectionTypeFromName(section.name);
        const typeMark = sectionType !== 'content' ? ` [${sectionType.toUpperCase()}]` : '';

        output += `${index + 1}. ${section.name} (${section.type})${componentMark}${typeMark}${hiddenMark}\n`;

        if (section.absoluteBoundingBox) {
            const bbox = section.absoluteBoundingBox;
            output += `   Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px\n`;
            output += `   Position: (${Math.round(bbox.x)}, ${Math.round(bbox.y)})\n`;
        }

        if (section.children && section.children.length > 0) {
            output += `   Contains: ${section.children.length} child elements\n`;
            
            // Show component count
            const componentCount = section.children.filter((child: any) => 
                child.type === 'COMPONENT' || child.type === 'INSTANCE'
            ).length;
            if (componentCount > 0) {
                output += `   Components: ${componentCount} nested component(s)\n`;
            }
        }

        // Show basic styling info
        if (section.fills && section.fills.length > 0) {
            const fill = section.fills[0];
            if (fill.color) {
                const hex = rgbaToHex(fill.color);
                output += `   Background: ${hex}\n`;
            }
        }
    });

    if (hasMore) {
        output += `\n... and ${node.children.length - sectionsToShow.length} more sections.\n`;
        output += `Use showAllSections: true to see all sections.\n`;
    }

    // Analysis recommendations
    output += `\nAnalysis Recommendations:\n`;
    
    const componentSections = node.children.filter((section: any) =>
        section.type === 'COMPONENT' || section.type === 'INSTANCE'
    );
    if (componentSections.length > 0) {
        output += `- Found ${componentSections.length} component sections for separate analysis\n`;
    }

    const largeSections = node.children.filter((section: any) => {
        const bbox = section.absoluteBoundingBox;
        return bbox && (bbox.width * bbox.height) > 20000;
    });
    if (largeSections.length > 5) {
        output += `- Screen has ${largeSections.length} large sections - consider increasing maxSections\n`;
    }

    // Detect navigation elements
    const navSections = node.children.filter((section: any) => {
        const name = section.name.toLowerCase();
        return name.includes('nav') || name.includes('tab') || name.includes('menu') || 
               name.includes('header') || name.includes('footer');
    });
    if (navSections.length > 0) {
        output += `- Found ${navSections.length} navigation-related sections\n`;
    }

    return output;
}

/**
 * Generate Flutter screen implementation guidance
 */
export function generateFlutterScreenGuidance(analysis: ScreenAnalysis): string {
    let guidance = `Flutter Screen Implementation Guidance:\n\n`;

    // Main scaffold structure
    guidance += `Main Screen Structure:\n`;
    guidance += `Scaffold(\n`;
    
    // App bar
    if (analysis.navigation.hasAppBar) {
        guidance += `  appBar: AppBar(\n`;
        guidance += `    title: Text('${analysis.metadata.name}'),\n`;
        guidance += `    // Add app bar actions and styling\n`;
        guidance += `  ),\n`;
    }
    
    // Drawer
    if (analysis.navigation.hasDrawer) {
        guidance += `  drawer: Drawer(\n`;
        guidance += `    // Add drawer content\n`;
        guidance += `  ),\n`;
    }
    
    // Body structure
    guidance += `  body: `;
    
    if (analysis.layout.scrollable) {
        guidance += `SingleChildScrollView(\n`;
        guidance += `    child: Column(\n`;
        guidance += `      children: [\n`;
    } else {
        guidance += `Column(\n`;
        guidance += `    children: [\n`;
    }
    
    // Add sections
    analysis.sections.forEach((section, index) => {
        const widgetName = toPascalCase(section.name);
        guidance += `        ${widgetName}(), // ${section.type} section\n`;
    });
    
    guidance += `      ],\n`;
    guidance += `    ),\n`;
    
    if (analysis.layout.scrollable) {
        guidance += `  ),\n`;
    }
    
    // Bottom navigation
    if (analysis.navigation.hasTabBar) {
        guidance += `  bottomNavigationBar: BottomNavigationBar(\n`;
        guidance += `    items: [\n`;
        
        const tabItems = analysis.navigation.navigationElements.filter(nav => nav.type === 'tab');
        tabItems.slice(0, 5).forEach(tab => {
            guidance += `      BottomNavigationBarItem(\n`;
            guidance += `        icon: Icon(Icons.${tab.icon ? 'placeholder' : 'home'}),\n`;
            guidance += `        label: '${tab.text || tab.name}',\n`;
            guidance += `      ),\n`;
        });
        
        guidance += `    ],\n`;
        guidance += `  ),\n`;
    }
    
    guidance += `)\n\n`;

    // Section widgets guidance
    if (analysis.sections.length > 0) {
        guidance += `Section Widgets:\n`;
        analysis.sections.forEach((section, index) => {
            const widgetName = toPascalCase(section.name);
            guidance += `${index + 1}. ${widgetName}() - ${section.type} section\n`;
            guidance += `   Elements: ${section.children.length} child elements\n`;
            if (section.components.length > 0) {
                guidance += `   Components: ${section.components.length} nested components\n`;
            }
        });
        guidance += `\n`;
    }

    // Navigation guidance
    if (analysis.navigation.navigationElements.length > 0) {
        guidance += `Navigation Implementation:\n`;
        
        const buttons = analysis.navigation.navigationElements.filter(nav => nav.type === 'button');
        const tabs = analysis.navigation.navigationElements.filter(nav => nav.type === 'tab');
        const links = analysis.navigation.navigationElements.filter(nav => nav.type === 'link');
        
        if (buttons.length > 0) {
            guidance += `Buttons (${buttons.length}):\n`;
            buttons.forEach(button => {
                guidance += `- ElevatedButton(onPressed: () {}, child: Text('${button.text || button.name}'))\n`;
            });
        }
        
        if (tabs.length > 0) {
            guidance += `Tab Navigation (${tabs.length}):\n`;
            guidance += `- Use TabBar with ${tabs.length} tabs\n`;
            guidance += `- Consider TabBarView for content switching\n`;
        }
        
        if (links.length > 0) {
            guidance += `Links (${links.length}):\n`;
            links.forEach(link => {
                guidance += `- TextButton(onPressed: () {}, child: Text('${link.text || link.name}'))\n`;
            });
        }
        
        guidance += `\n`;
    }

    // Asset guidance
    if (analysis.assets.length > 0) {
        guidance += `Assets Implementation:\n`;
        
        const images = analysis.assets.filter(asset => asset.type === 'image');
        const icons = analysis.assets.filter(asset => asset.type === 'icon');
        const illustrations = analysis.assets.filter(asset => asset.type === 'illustration');
        
        if (images.length > 0) {
            guidance += `Images (${images.length}): Use Image.asset() or Image.network()\n`;
        }
        
        if (icons.length > 0) {
            guidance += `Icons (${icons.length}): Use Icon() widget with appropriate IconData\n`;
        }
        
        if (illustrations.length > 0) {
            guidance += `Illustrations (${illustrations.length}): Use SvgPicture or Image.asset()\n`;
        }
        
        guidance += `\n`;
    }

    // Responsive design guidance
    guidance += `Responsive Design:\n`;
    guidance += `- Device Type: ${analysis.metadata.deviceType}\n`;
    guidance += `- Orientation: ${analysis.metadata.orientation}\n`;
    
    if (analysis.metadata.deviceType === 'mobile') {
        guidance += `- Optimize for mobile: Use SingleChildScrollView, consider bottom navigation\n`;
    } else if (analysis.metadata.deviceType === 'tablet') {
        guidance += `- Tablet layout: Consider using NavigationRail or side navigation\n`;
    } else if (analysis.metadata.deviceType === 'desktop') {
        guidance += `- Desktop layout: Use NavigationRail, consider multi-column layouts\n`;
    }

    return guidance;
}

// Helper functions
function groupAssetsByType(assets: ScreenAssetInfo[]): Record<string, ScreenAssetInfo[]> {
    return assets.reduce((acc, asset) => {
        if (!acc[asset.type]) {
            acc[asset.type] = [];
        }
        acc[asset.type].push(asset);
        return acc;
    }, {} as Record<string, ScreenAssetInfo[]>);
}

function detectSectionTypeFromName(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('header') || lowerName.includes('app bar')) return 'header';
    if (lowerName.includes('footer') || lowerName.includes('bottom')) return 'footer';
    if (lowerName.includes('nav') || lowerName.includes('menu')) return 'navigation';
    if (lowerName.includes('modal') || lowerName.includes('dialog')) return 'modal';
    if (lowerName.includes('sidebar')) return 'sidebar';
    
    return 'content';
}

function toPascalCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .replace(/\s/g, '');
}

function rgbaToHex(color: {r: number; g: number; b: number; a?: number}): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}
