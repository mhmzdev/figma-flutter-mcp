// src/extractors/screens/types.mts

import type {FigmaNode, FigmaColor} from '../../types/figma.js';
import type {ComponentChild, NestedComponentInfo, LayoutInfo, StylingInfo} from '../components/types.js';

/**
 * Main screen analysis result
 */
export interface ScreenAnalysis {
    metadata: ScreenMetadata;
    layout: ScreenLayoutInfo;
    sections: ScreenSection[];
    components: NestedComponentInfo[];
    navigation: NavigationInfo;
    assets: ScreenAssetInfo[];
    skippedNodes?: SkippedNodeInfo[];
}

/**
 * Screen metadata information
 */
export interface ScreenMetadata {
    name: string;
    type: 'FRAME' | 'PAGE' | 'COMPONENT';
    nodeId: string;
    description?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    orientation?: 'portrait' | 'landscape';
    dimensions: {
        width: number;
        height: number;
    };
}

/**
 * Screen layout information optimized for full screens
 */
export interface ScreenLayoutInfo extends LayoutInfo {
    scrollable?: boolean;
    hasHeader?: boolean;
    hasFooter?: boolean;
    hasNavigation?: boolean;
    contentArea?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * Screen section (header, content, footer, etc.)
 */
export interface ScreenSection {
    id: string;
    name: string;
    type: 'header' | 'navigation' | 'content' | 'footer' | 'sidebar' | 'modal' | 'other';
    nodeId: string;
    layout: Partial<LayoutInfo>;
    styling?: Partial<StylingInfo>;
    children: ComponentChild[];
    components: NestedComponentInfo[];
    importance: number; // 1-10 score
}

/**
 * Navigation information
 */
export interface NavigationInfo {
    hasTabBar?: boolean;
    hasAppBar?: boolean;
    hasDrawer?: boolean;
    hasBottomSheet?: boolean;
    navigationElements: NavigationElement[];
}

/**
 * Navigation element
 */
export interface NavigationElement {
    nodeId: string;
    name: string;
    type: 'tab' | 'button' | 'link' | 'icon' | 'menu' | 'other';
    text?: string;
    icon?: boolean;
    isActive?: boolean;
}

/**
 * Screen asset information
 */
export interface ScreenAssetInfo {
    nodeId: string;
    name: string;
    type: 'image' | 'icon' | 'illustration' | 'background';
    size: 'small' | 'medium' | 'large';
    usage: 'decorative' | 'content' | 'navigation' | 'branding';
}

/**
 * Information about nodes that were skipped
 */
export interface SkippedNodeInfo {
    nodeId: string;
    name: string;
    type: string;
    reason: 'depth_limit' | 'complexity' | 'max_sections';
}

/**
 * Screen extraction options
 */
export interface ScreenExtractionOptions {
    maxSections?: number;
    maxDepth?: number;
    includeHiddenNodes?: boolean;
    extractNavigation?: boolean;
    extractAssets?: boolean;
    deviceTypeDetection?: boolean;
}
