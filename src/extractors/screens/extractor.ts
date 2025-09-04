// src/extractors/screens/extractor.mts

import type {FigmaNode} from '../../types/figma.js';
import type {
    ScreenAnalysis,
    ScreenMetadata,
    ScreenLayoutInfo,
    ScreenSection,
    NavigationInfo,
    NavigationElement,
    ScreenAssetInfo,
    SkippedNodeInfo,
    ScreenExtractionOptions
} from './types.js';
import type {ComponentChild, NestedComponentInfo} from '../components/types.js';
import {
    extractLayoutInfo,
    extractStylingInfo,
    createComponentChild,
    createNestedComponentInfo,
    calculateVisualImportance,
    isComponentNode
} from '../components/extractor.js';

/**
 * Extract screen metadata
 */
export function extractScreenMetadata(node: FigmaNode): ScreenMetadata {
    const dimensions = {
        width: node.absoluteBoundingBox?.width || 0,
        height: node.absoluteBoundingBox?.height || 0
    };

    const deviceType = detectDeviceType(dimensions);
    const orientation = detectOrientation(dimensions);

    return {
        name: node.name,
        type: node.type as 'FRAME' | 'PAGE' | 'COMPONENT',
        nodeId: node.id,
        deviceType,
        orientation,
        dimensions
    };
}

/**
 * Extract screen layout information
 */
export function extractScreenLayoutInfo(node: FigmaNode): ScreenLayoutInfo {
    const baseLayout = extractLayoutInfo(node);
    
    return {
        ...baseLayout,
        scrollable: detectScrollable(node),
        hasHeader: detectHeader(node),
        hasFooter: detectFooter(node),
        hasNavigation: detectNavigation(node),
        contentArea: calculateContentArea(node)
    };
}

/**
 * Analyze screen sections (header, content, footer, etc.)
 */
export function analyzeScreenSections(
    node: FigmaNode,
    options: Required<ScreenExtractionOptions>
): {
    sections: ScreenSection[];
    components: NestedComponentInfo[];
    skippedNodes: SkippedNodeInfo[];
} {
    const sections: ScreenSection[] = [];
    const components: NestedComponentInfo[] = [];
    const skippedNodes: SkippedNodeInfo[] = [];

    if (!node.children || node.children.length === 0) {
        return {sections, components, skippedNodes};
    }

    // Filter visible nodes unless includeHiddenNodes is true
    let visibleChildren = node.children;
    if (!options.includeHiddenNodes) {
        visibleChildren = node.children.filter(child => child.visible !== false);
    }

    // Analyze each child as potential section
    const sectionsWithImportance = visibleChildren.map(child => ({
        node: child,
        importance: calculateSectionImportance(child),
        sectionType: detectSectionType(child)
    }));

    // Sort by importance
    sectionsWithImportance.sort((a, b) => b.importance - a.importance);

    // Process up to maxSections
    const processedCount = Math.min(sectionsWithImportance.length, options.maxSections);

    for (let i = 0; i < sectionsWithImportance.length; i++) {
        const {node: child, importance, sectionType} = sectionsWithImportance[i];

        if (i < processedCount) {
            const section = createScreenSection(child, sectionType, importance, options);
            sections.push(section);

            // Collect nested components from this section
            section.components.forEach(comp => {
                if (!components.find(c => c.nodeId === comp.nodeId)) {
                    components.push(comp);
                }
            });
        } else {
            skippedNodes.push({
                nodeId: child.id,
                name: child.name,
                type: child.type,
                reason: 'max_sections'
            });
        }
    }

    return {sections, components, skippedNodes};
}

/**
 * Extract navigation information
 */
export function extractNavigationInfo(node: FigmaNode): NavigationInfo {
    const navigationElements: NavigationElement[] = [];
    
    // Traverse to find navigation elements
    traverseForNavigation(node, navigationElements);

    return {
        hasTabBar: detectTabBar(node),
        hasAppBar: detectAppBar(node),
        hasDrawer: detectDrawer(node),
        hasBottomSheet: detectBottomSheet(node),
        navigationElements
    };
}

/**
 * Extract screen assets information
 */
export function extractScreenAssets(node: FigmaNode): ScreenAssetInfo[] {
    const assets: ScreenAssetInfo[] = [];
    
    traverseForAssets(node, assets);
    
    return assets;
}

/**
 * Create screen section
 */
function createScreenSection(
    node: FigmaNode,
    sectionType: ScreenSection['type'],
    importance: number,
    options: Required<ScreenExtractionOptions>
): ScreenSection {
    const children: ComponentChild[] = [];
    const components: NestedComponentInfo[] = [];

    // Analyze section children
    if (node.children) {
        const visibleChildren = options.includeHiddenNodes 
            ? node.children 
            : node.children.filter(child => child.visible !== false);

        visibleChildren.forEach(child => {
            const childImportance = calculateVisualImportance(child);
            const isComponent = isComponentNode(child);

            if (isComponent) {
                components.push(createNestedComponentInfo(child));
            }

            children.push(createComponentChild(child, childImportance, isComponent, {
                maxChildNodes: 20, // Higher limit for screens
                maxDepth: options.maxDepth,
                includeHiddenNodes: options.includeHiddenNodes,
                prioritizeComponents: true,
                extractTextContent: true
            }));
        });
    }

    return {
        id: `section_${node.id}`,
        name: node.name,
        type: sectionType,
        nodeId: node.id,
        layout: extractLayoutInfo(node),
        styling: extractStylingInfo(node),
        children,
        components,
        importance
    };
}

/**
 * Calculate section importance for prioritization
 */
function calculateSectionImportance(node: FigmaNode): number {
    let score = 0;

    // Size importance (0-3 points)
    const area = (node.absoluteBoundingBox?.width || 0) * (node.absoluteBoundingBox?.height || 0);
    if (area > 50000) score += 3;
    else if (area > 20000) score += 2;
    else if (area > 5000) score += 1;

    // Position importance (0-2 points) - top elements are more important
    const y = node.absoluteBoundingBox?.y || 0;
    if (y < 100) score += 2; // Header area
    else if (y < 200) score += 1;

    // Type importance (0-3 points)
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') score += 3;
    else if (node.type === 'FRAME') score += 2;

    // Name-based importance (0-2 points)
    const name = node.name.toLowerCase();
    if (name.includes('header') || name.includes('nav') || name.includes('footer')) score += 2;
    else if (name.includes('content') || name.includes('main') || name.includes('body')) score += 1;

    return Math.min(score, 10);
}

/**
 * Detect section type based on node properties
 */
function detectSectionType(node: FigmaNode): ScreenSection['type'] {
    const name = node.name.toLowerCase();
    const bounds = node.absoluteBoundingBox;

    // Name-based detection
    if (name.includes('header') || name.includes('app bar') || name.includes('top bar')) return 'header';
    if (name.includes('footer') || name.includes('bottom') || name.includes('tab bar')) return 'footer';
    if (name.includes('nav') || name.includes('menu') || name.includes('sidebar')) return 'navigation';
    if (name.includes('modal') || name.includes('dialog') || name.includes('popup')) return 'modal';
    if (name.includes('content') || name.includes('main') || name.includes('body')) return 'content';

    // Position-based detection
    if (bounds) {
        const screenHeight = bounds.y + bounds.height;
        
        // Top 15% of screen likely header
        if (bounds.y < screenHeight * 0.15) return 'header';
        
        // Bottom 15% of screen likely footer/navigation
        if (bounds.y > screenHeight * 0.85) return 'footer';
        
        // Side areas might be navigation
        if (bounds.width < 100 && bounds.height > 200) return 'sidebar';
    }

    return 'content';
}

/**
 * Detect device type based on dimensions
 */
function detectDeviceType(dimensions: {width: number; height: number}): ScreenMetadata['deviceType'] {
    const {width, height} = dimensions;
    const maxDimension = Math.max(width, height);
    const minDimension = Math.min(width, height);

    // Mobile devices (typical ranges)
    if (maxDimension <= 900 && minDimension <= 500) return 'mobile';
    
    // Tablet devices
    if (maxDimension <= 1400 && minDimension <= 1000) return 'tablet';
    
    // Desktop
    if (maxDimension > 1400) return 'desktop';

    return 'unknown';
}

/**
 * Detect orientation
 */
function detectOrientation(dimensions: {width: number; height: number}): ScreenMetadata['orientation'] {
    return dimensions.width > dimensions.height ? 'landscape' : 'portrait';
}

/**
 * Detect if screen is scrollable
 */
function detectScrollable(node: FigmaNode): boolean {
    // Check for scroll properties or overflow
    const nodeAny = node as any;
    return !!(nodeAny.overflowDirection || nodeAny.scrollBehavior);
}

/**
 * Detect header presence
 */
function detectHeader(node: FigmaNode): boolean {
    if (!node.children) return false;
    
    return node.children.some(child => {
        const name = child.name.toLowerCase();
        const bounds = child.absoluteBoundingBox;
        
        return (name.includes('header') || name.includes('app bar') || name.includes('top bar')) ||
               (bounds && bounds.y < 150); // Top area
    });
}

/**
 * Detect footer presence
 */
function detectFooter(node: FigmaNode): boolean {
    if (!node.children) return false;
    
    const screenHeight = node.absoluteBoundingBox?.height || 0;
    
    return node.children.some(child => {
        const name = child.name.toLowerCase();
        const bounds = child.absoluteBoundingBox;
        
        return (name.includes('footer') || name.includes('bottom') || name.includes('tab bar')) ||
               (bounds && bounds.y > screenHeight * 0.8); // Bottom area
    });
}

/**
 * Detect navigation presence
 */
function detectNavigation(node: FigmaNode): boolean {
    if (!node.children) return false;
    
    return node.children.some(child => {
        const name = child.name.toLowerCase();
        return name.includes('nav') || name.includes('menu') || name.includes('tab') || name.includes('drawer');
    });
}

/**
 * Calculate content area
 */
function calculateContentArea(node: FigmaNode): ScreenLayoutInfo['contentArea'] {
    const bounds = node.absoluteBoundingBox;
    if (!bounds) return undefined;

    // Simple heuristic: assume content is the main area minus header/footer
    return {
        x: bounds.x,
        y: bounds.y + 100, // Assume 100px header
        width: bounds.width,
        height: bounds.height - 200 // Assume 100px header + 100px footer
    };
}

/**
 * Detect tab bar
 */
function detectTabBar(node: FigmaNode): boolean {
    return traverseAndCheck(node, child => {
        const name = child.name.toLowerCase();
        return !!(name.includes('tab bar') || name.includes('bottom nav') || 
               (name.includes('tab') && child.children && child.children.length > 1));
    });
}

/**
 * Detect app bar
 */
function detectAppBar(node: FigmaNode): boolean {
    return traverseAndCheck(node, child => {
        const name = child.name.toLowerCase();
        return !!(name.includes('app bar') || name.includes('header') || name.includes('top bar'));
    });
}

/**
 * Detect drawer
 */
function detectDrawer(node: FigmaNode): boolean {
    return traverseAndCheck(node, child => {
        const name = child.name.toLowerCase();
        return !!(name.includes('drawer') || name.includes('sidebar') || name.includes('menu'));
    });
}

/**
 * Detect bottom sheet
 */
function detectBottomSheet(node: FigmaNode): boolean {
    return traverseAndCheck(node, child => {
        const name = child.name.toLowerCase();
        return !!(name.includes('bottom sheet') || name.includes('modal') || name.includes('popup'));
    });
}

/**
 * Traverse and check condition
 */
function traverseAndCheck(node: FigmaNode, condition: (node: FigmaNode) => boolean): boolean {
    if (condition(node)) return true;
    
    if (node.children) {
        return node.children.some(child => traverseAndCheck(child, condition));
    }
    
    return false;
}

/**
 * Traverse for navigation elements
 */
function traverseForNavigation(node: FigmaNode, results: NavigationElement[], depth: number = 0): void {
    if (depth > 3) return;

    const name = node.name.toLowerCase();
    
    // Check if this node is a navigation element
    if (isNavigationElement(node)) {
        results.push({
            nodeId: node.id,
            name: node.name,
            type: detectNavigationElementType(node),
            text: extractNavigationText(node),
            icon: hasIcon(node),
            isActive: detectActiveState(node)
        });
    }

    // Traverse children
    if (node.children) {
        node.children.forEach(child => {
            traverseForNavigation(child, results, depth + 1);
        });
    }
}

/**
 * Check if node is navigation element
 */
function isNavigationElement(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    
    return name.includes('tab') || name.includes('button') || name.includes('link') ||
           name.includes('menu') || name.includes('nav') || 
           (node.type === 'INSTANCE' && name.includes('item'));
}

/**
 * Detect navigation element type
 */
function detectNavigationElementType(node: FigmaNode): NavigationElement['type'] {
    const name = node.name.toLowerCase();
    
    if (name.includes('tab')) return 'tab';
    if (name.includes('button')) return 'button';
    if (name.includes('link')) return 'link';
    if (name.includes('icon')) return 'icon';
    if (name.includes('menu')) return 'menu';
    
    return 'other';
}

/**
 * Extract navigation text
 */
function extractNavigationText(node: FigmaNode): string | undefined {
    // Look for text children
    if (node.children) {
        for (const child of node.children) {
            if (child.type === 'TEXT' && child.name) {
                return child.name;
            }
        }
    }
    
    // Fallback to node name if it looks like text
    const name = node.name;
    if (name && !name.toLowerCase().includes('component') && !name.toLowerCase().includes('instance')) {
        return name;
    }
    
    return undefined;
}

/**
 * Check if node has icon
 */
function hasIcon(node: FigmaNode): boolean {
    if (!node.children) return false;
    
    return node.children.some(child => {
        const name = child.name.toLowerCase();
        return name.includes('icon') || child.type === 'VECTOR';
    });
}

/**
 * Detect active state
 */
function detectActiveState(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('active') || name.includes('selected') || name.includes('current');
}

/**
 * Traverse for assets
 */
function traverseForAssets(node: FigmaNode, results: ScreenAssetInfo[], depth: number = 0): void {
    if (depth > 4) return;

    // Check if this node is an asset
    if (isAssetNode(node)) {
        results.push({
            nodeId: node.id,
            name: node.name,
            type: detectAssetType(node),
            size: detectAssetSize(node),
            usage: detectAssetUsage(node)
        });
    }

    // Traverse children
    if (node.children) {
        node.children.forEach(child => {
            traverseForAssets(child, results, depth + 1);
        });
    }
}

/**
 * Check if node is an asset
 */
function isAssetNode(node: FigmaNode): boolean {
    // Check for image fills
    if (node.fills && node.fills.some((fill: any) => fill.type === 'IMAGE')) return true;
    
    // Check for vectors that are likely assets
    if (node.type === 'VECTOR') {
        const name = node.name.toLowerCase();
        return name.includes('image') || name.includes('illustration') || 
               name.includes('icon') || name.includes('logo');
    }
    
    return false;
}

/**
 * Detect asset type
 */
function detectAssetType(node: FigmaNode): ScreenAssetInfo['type'] {
    const name = node.name.toLowerCase();
    
    if (name.includes('icon')) return 'icon';
    if (name.includes('illustration') || name.includes('graphic')) return 'illustration';
    if (name.includes('background') || name.includes('bg')) return 'background';
    
    return 'image';
}

/**
 * Detect asset size
 */
function detectAssetSize(node: FigmaNode): ScreenAssetInfo['size'] {
    const bounds = node.absoluteBoundingBox;
    if (!bounds) return 'medium';
    
    const area = bounds.width * bounds.height;
    
    if (area < 2500) return 'small'; // < 50x50
    if (area > 40000) return 'large'; // > 200x200
    
    return 'medium';
}

/**
 * Detect asset usage
 */
function detectAssetUsage(node: FigmaNode): ScreenAssetInfo['usage'] {
    const name = node.name.toLowerCase();
    
    if (name.includes('logo') || name.includes('brand')) return 'branding';
    if (name.includes('nav') || name.includes('menu') || name.includes('tab')) return 'navigation';
    if (name.includes('background') || name.includes('decoration')) return 'decorative';
    
    return 'content';
}
