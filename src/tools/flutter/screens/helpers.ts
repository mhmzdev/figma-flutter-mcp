// src/tools/flutter/screens/helpers.mts

import type {ScreenAnalysis, ScreenSection, NavigationElement, ScreenAssetInfo} from "../../../extractors/screens/types.js";
import type {ComponentChild} from "../../../extractors/components/types.js";
import {generateScreenVisualContext} from "../visual-context.js";
import {filterEffectivelyVisibleChildren} from "../../../utils/visibility.js";
import {
    formatCategorizedEffects,
    formatFigmaEffects
} from "../../../utils/effects-format.js";
import {
    formatVisualBoxEvidence,
    formatFigmaNodeBoxEvidence
} from "../../../utils/style-format.js";

export function generateChildLayoutEvidence(
    children: ComponentChild[],
    indent: string = '   ',
    depth: number = 0,
    maxDepth: number = 2
): string {
    let output = '';

    children.forEach(child => {
        const layout = child.basicInfo?.layout;
        if (layout) {
            const details = [
                layout.dimensions
                    ? `${Math.round(layout.dimensions.width)}×${Math.round(layout.dimensions.height)}px`
                    : undefined,
                layout.sizingHorizontal
                    ? `horizontal=${layout.sizingHorizontal}`
                    : undefined,
                layout.sizingVertical
                    ? `vertical=${layout.sizingVertical}`
                    : undefined,
                layout.layoutAlign
                    ? `parentAlign=${layout.layoutAlign}`
                    : undefined
            ].filter(Boolean);
            output += `${indent}- ${child.name}: ${details.join(', ')}\n`;
        } else {
            output += `${indent}- ${child.name}\n`;
        }

        output += formatVisualBoxEvidence(
            child.basicInfo?.styling,
            child.basicInfo?.layout,
            `${indent}  `
        );

        if (child.children?.length && depth < maxDepth) {
            output += generateChildLayoutEvidence(
                child.children,
                `${indent}  `,
                depth + 1,
                maxDepth
            );
        }
    });

    return output;
}

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
    const topSafeArea = analysis.layout.safeArea?.top;
    if (topSafeArea?.required) {
        output += `- Top Safe Area: Required at runtime (no App Bar present)\n`;
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
            if (section.layout.sizingHorizontal) {
                output += `   Horizontal Sizing: ${section.layout.sizingHorizontal}\n`;
            }
            if (section.layout.sizingVertical) {
                output += `   Vertical Sizing: ${section.layout.sizingVertical}\n`;
            }
            if (section.layout.layoutAlign) {
                output += `   Parent Alignment: ${section.layout.layoutAlign}\n`;
            }

            output += formatVisualBoxEvidence(section.styling, section.layout, '   ');
            output += formatCategorizedEffects(section.styling?.effects, '   ');
            
            if (section.children.length > 0) {
                output += `   Contains: ${section.children.length} elements\n`;
                output += generateChildLayoutEvidence(section.children);
            }
            
            if (section.components.length > 0) {
                output += `   Components: ${section.components.length} nested component(s)\n`;
            }
        });
        output += `\n`;
    }

    output += `Layout Sizing Semantics:\n`;
    output += `- FILL / STRETCH: adapt to the parent's available space; do not hardcode the measured width. Use parent padding, stretch, or Expanded as appropriate.\n`;
    output += `- FIXED: preserve the explicit Figma dimension.\n`;
    output += `- HUG: size to the child content.\n\n`;

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
        
        const deviceUISkipped = analysis.skippedNodes.filter(node => node.reason === 'device_ui_element');
        const limitSkipped = analysis.skippedNodes.filter(node => node.reason === 'max_sections');
        
        if (deviceUISkipped.length > 0) {
            output += `${deviceUISkipped.length} device UI elements were automatically filtered out:\n`;
            deviceUISkipped.forEach((skipped, index) => {
                output += `${index + 1}. ${skipped.name} (${skipped.type}) - device UI placeholder\n`;
            });
            output += `\n`;
        }
        
        if (limitSkipped.length > 0) {
            output += `${limitSkipped.length} sections were skipped due to limits:\n`;
            limitSkipped.forEach((skipped, index) => {
                output += `${index + 1}. ${skipped.name} (${skipped.type}) - ${skipped.reason}\n`;
            });
            output += `\nTo analyze all sections, increase the maxSections parameter.\n`;
        }
        
        output += `\n`;
    }

    // Visual context for AI implementation
    if (parsedInput?.source === 'url') {
        // Reconstruct the Figma URL from the parsed input
        const figmaUrl = `https://www.figma.com/design/${parsedInput.fileId}/?node-id=${parsedInput.nodeId}`;
        output += generateScreenVisualContext(analysis, figmaUrl, parsedInput.nodeId);
        output += `\n`;
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
    if (node.layoutSizingHorizontal) {
        output += `Horizontal Sizing: ${node.layoutSizingHorizontal}\n`;
    }
    if (node.layoutSizingVertical) {
        output += `Vertical Sizing: ${node.layoutSizingVertical}\n`;
    }
    if (node.layoutAlign) {
        output += `Parent Alignment: ${node.layoutAlign}\n`;
    }

    output += `\n`;

    if (!node.children || node.children.length === 0) {
        output += `This screen has no sections.\n`;
        return output;
    }

    const sectionsSource = showAllSections
        ? node.children
        : filterEffectivelyVisibleChildren(node.children, false);
    const hiddenSkipped = (node.children?.length || 0) - sectionsSource.length;

    output += `Screen Structure:\n`;

    const sectionsToShow = showAllSections ? sectionsSource : sectionsSource.slice(0, 20);
    const hasMore = sectionsSource.length > sectionsToShow.length;

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
        if (section.layoutSizingHorizontal) {
            output += `   Horizontal Sizing: ${section.layoutSizingHorizontal}\n`;
        }
        if (section.layoutSizingVertical) {
            output += `   Vertical Sizing: ${section.layoutSizingVertical}\n`;
        }
        if (section.layoutAlign) {
            output += `   Parent Alignment: ${section.layoutAlign}\n`;
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

        output += formatFigmaNodeBoxEvidence(section, '   ');
        output += formatFigmaEffects(section.effects, '   ');
    });

    if (hasMore) {
        output += `\n... and ${sectionsSource.length - sectionsToShow.length} more sections.\n`;
        output += `Use showAllSections: true to see all sections.\n`;
    }

    if (!showAllSections && hiddenSkipped > 0) {
        output += `\nSkipped ${hiddenSkipped} hidden / empty-slot section(s). Use showAllSections: true to include them.\n`;
    }

    // Analysis recommendations
    output += `\nAnalysis Recommendations:\n`;
    
    const componentSections = sectionsSource.filter((section: any) =>
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

    // Widget composition best practices
    guidance += `🏗️  Widget Composition Best Practices:\n`;
    guidance += `- Start by building the complete screen widget tree in a single build() method\n`;
    guidance += `- Keep composing widgets inline until you reach ~250 lines of code\n`;
    guidance += `- Only then break down into private StatelessWidget classes for sections\n`;
    guidance += `- Use private widgets (prefix with _) for internal screen component breakdown\n`;
    guidance += `- Avoid functional widgets - always use StatelessWidget classes\n\n`;
    
    guidance += `📱 Device UI Filtering:\n`;
    guidance += `- Status bars, battery icons, wifi indicators are automatically filtered out\n`;
    guidance += `- Home indicators, notches, and device bezels are ignored during analysis\n`;
    guidance += `- Only actual app design content is analyzed for Flutter implementation\n`;
    guidance += `- Safe-area insets belong to screen composition, not reusable component heights\n`;
    guidance += `- Use Flutter SafeArea for reported screen edges; never hardcode the design inset\n\n`;

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
    const footerSections = analysis.sections.filter(section => section.type === 'footer');
    const bodySections = analysis.sections.filter(section => section.type !== 'footer');

    // Body owns whichever edge its neighboring slot does not already absorb:
    // top is unhandled without an AppBar, bottom is unhandled without a footer/bottomNavigationBar.
    const needsTopSafeArea = analysis.layout.safeArea?.top?.required ?? false;
    const needsBottomSafeArea = footerSections.length === 0;
    const wrapBodyInSafeArea = needsTopSafeArea || needsBottomSafeArea;
    const bodyIndent = wrapBodyInSafeArea ? '  ' : '';

    guidance += `  body: `;
    if (wrapBodyInSafeArea) {
        guidance += `SafeArea(\n`;
        if (!needsTopSafeArea) {
            guidance += `    top: false, // the App Bar already occupies the top edge\n`;
        }
        if (!needsBottomSafeArea) {
            guidance += `    bottom: false, // bottomNavigationBar already occupies the bottom edge\n`;
        }
        guidance += `    child: `;
    }

    if (analysis.layout.scrollable) {
        guidance += `SingleChildScrollView(\n`;
        guidance += `${bodyIndent}    child: Column(\n`;
        guidance += `${bodyIndent}      children: [\n`;
    } else {
        guidance += `Column(\n`;
        guidance += `${bodyIndent}    children: [\n`;
    }

    // Add non-footer sections to the body
    bodySections.forEach(section => {
        const widgetName = toPascalCase(section.name);
        guidance += `${bodyIndent}        ${widgetName}(), // ${section.type} section\n`;
    });
    
    guidance += `${bodyIndent}      ],\n`;
    guidance += `${bodyIndent}    ),\n`;
    
    if (analysis.layout.scrollable) {
        guidance += `${bodyIndent}  ),\n`;
    }

    if (wrapBodyInSafeArea) {
        guidance += `  ),\n`;
    }
    
    // Bottom screen section
    if (footerSections.length > 0) {
        const footerWidgetName = toPascalCase(footerSections[0].name);
        guidance += `  bottomNavigationBar: ${footerWidgetName}(),\n`;
    } else if (analysis.navigation.hasTabBar) {
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
