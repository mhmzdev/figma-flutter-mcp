// src/extractors/components/extractor.mts

import type {FigmaNode, FigmaColor, FigmaEffect} from '../../types/figma.mjs';
import type {
    ComponentMetadata,
    LayoutInfo,
    StylingInfo,
    ComponentChild,
    NestedComponentInfo,
    SkippedNodeInfo,
    CategorizedEffects,
    ColorInfo,
    StrokeInfo,
    CornerRadii,
    PaddingInfo,
    TextInfo,
    ComponentExtractionOptions
} from './types.mjs';

/**
 * Extract component metadata
 */
export function extractMetadata(node: FigmaNode, userDefinedAsComponent: boolean): ComponentMetadata {
    const metadata: ComponentMetadata = {
        name: node.name,
        type: node.type as 'COMPONENT' | 'COMPONENT_SET' | 'FRAME',
        nodeId: node.id,
        isUserDefinedComponent: userDefinedAsComponent
    };

    // Add component-specific metadata
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        metadata.componentKey = (node as any).componentKey;
    }

    if (node.type === 'COMPONENT_SET') {
        metadata.variantCount = node.children?.length || 0;
    }

    return metadata;
}

/**
 * Extract layout information
 */
export function extractLayoutInfo(node: FigmaNode): LayoutInfo {
    const layout: LayoutInfo = {
        type: determineLayoutType(node),
        dimensions: {
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0
        }
    };

    // Auto-layout specific properties
    if (node.layoutMode) {
        layout.direction = node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
        layout.spacing = node.itemSpacing || 0;

        // Extract padding
        if (hasPadding(node)) {
            layout.padding = extractPadding(node);
        }

        // Alignment properties
        layout.alignItems = (node as any).primaryAxisAlignItems;
        layout.justifyContent = (node as any).counterAxisAlignItems;
    }

    // Constraints
    if (node.constraints) {
        layout.constraints = node.constraints;
    }

    return layout;
}

/**
 * Extract styling information
 */
export function extractStylingInfo(node: FigmaNode): StylingInfo {
    const styling: StylingInfo = {};

    // Fills (background colors/gradients)
    if (node.fills && node.fills.length > 0) {
        styling.fills = node.fills.map(convertFillToColorInfo);
    }

    // Strokes (borders)
    if (node.strokes && node.strokes.length > 0) {
        styling.strokes = node.strokes.map(convertStrokeInfo);
    }

    // Effects (shadows, blurs)
    if (node.effects && node.effects.length > 0) {
        styling.effects = categorizeEffects(node.effects);
    }

    // Corner radius
    const cornerRadius = extractCornerRadius(node);
    if (cornerRadius) {
        styling.cornerRadius = cornerRadius;
    }

    // Opacity
    if ((node as any).opacity !== undefined && (node as any).opacity !== 1) {
        styling.opacity = (node as any).opacity;
    }

    return styling;
}

/**
 * Analyze child nodes with prioritization and limits
 */
export function analyzeChildren(
    node: FigmaNode,
    options: Required<ComponentExtractionOptions>
): {
    children: ComponentChild[];
    nestedComponents: NestedComponentInfo[];
    skippedNodes: SkippedNodeInfo[];
} {
    const children: ComponentChild[] = [];
    const nestedComponents: NestedComponentInfo[] = [];
    const skippedNodes: SkippedNodeInfo[] = [];

    if (!node.children || node.children.length === 0) {
        return {children, nestedComponents, skippedNodes};
    }

    // Filter visible nodes unless includeHiddenNodes is true
    let visibleChildren = node.children;
    if (!options.includeHiddenNodes) {
        visibleChildren = node.children.filter(child => child.visible !== false);
    }

    // Calculate visual importance for all children
    const childrenWithImportance = visibleChildren.map(child => ({
        node: child,
        importance: calculateVisualImportance(child),
        isComponent: isComponentNode(child)
    }));

    // Sort by importance (components first if prioritized, then by visual importance)
    childrenWithImportance.sort((a, b) => {
        if (options.prioritizeComponents) {
            if (a.isComponent && !b.isComponent) return -1;
            if (!a.isComponent && b.isComponent) return 1;
        }
        return b.importance - a.importance;
    });

    // Process up to maxChildNodes
    const processedCount = Math.min(childrenWithImportance.length, options.maxChildNodes);

    for (let i = 0; i < childrenWithImportance.length; i++) {
        const {node: child, importance, isComponent} = childrenWithImportance[i];

        if (i < processedCount) {
            // Check if this is a nested component
            if (isComponent) {
                nestedComponents.push(createNestedComponentInfo(child));
            }

            children.push(createComponentChild(child, importance, isComponent, options));
        } else {
            // Track skipped nodes
            skippedNodes.push({
                nodeId: child.id,
                name: child.name,
                type: child.type,
                reason: 'max_nodes'
            });
        }
    }

    return {children, nestedComponents, skippedNodes};
}

/**
 * Create nested component information
 */
export function createNestedComponentInfo(node: FigmaNode): NestedComponentInfo {
    return {
        nodeId: node.id,
        name: node.name,
        componentKey: (node as any).componentKey,
        masterComponent: (node as any).masterComponent?.key,
        isComponentInstance: node.type === 'INSTANCE',
        needsSeparateAnalysis: true,
        instanceType: node.type === 'INSTANCE' ? 'COMPONENT' : node.type as 'COMPONENT' | 'COMPONENT_SET'
    };
}

/**
 * Create component child information
 */
export function createComponentChild(
    node: FigmaNode,
    importance: number,
    isNestedComponent: boolean,
    options: Required<ComponentExtractionOptions>
): ComponentChild {
    const child: ComponentChild = {
        nodeId: node.id,
        name: node.name,
        type: node.type,
        isNestedComponent,
        visualImportance: importance
    };

    // Extract basic info for non-component children
    if (!isNestedComponent) {
        child.basicInfo = {
            layout: extractBasicLayout(node),
            styling: extractBasicStyling(node)
        };

        // Extract text info for text nodes
        if (node.type === 'TEXT' && options.extractTextContent) {
            child.basicInfo.text = extractTextInfo(node);
        }
    }

    return child;
}

/**
 * Calculate visual importance score (1-10)
 */
export function calculateVisualImportance(node: FigmaNode): number {
    let score = 0;

    // Size importance (0-4 points)
    const area = (node.absoluteBoundingBox?.width || 0) * (node.absoluteBoundingBox?.height || 0);
    if (area > 10000) score += 4;
    else if (area > 5000) score += 3;
    else if (area > 1000) score += 2;
    else if (area > 100) score += 1;

    // Type importance (0-3 points)
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') score += 3;
    else if (node.type === 'FRAME') score += 2;
    else if (node.type === 'TEXT') score += 2;
    else if (node.type === 'VECTOR') score += 1;

    // Styling importance (0-2 points)
    if (node.fills && node.fills.length > 0) score += 1;
    if (node.effects && node.effects.length > 0) score += 1;

    // Has children importance (0-1 point)
    if (node.children && node.children.length > 0) score += 1;

    return Math.min(score, 10);
}

/**
 * Check if node is a component
 */
export function isComponentNode(node: FigmaNode): boolean {
    return node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'COMPONENT_SET';
}

/**
 * Determine layout type from node properties
 */
export function determineLayoutType(node: FigmaNode): 'auto-layout' | 'absolute' | 'frame' {
    if (node.layoutMode) {
        return 'auto-layout';
    }
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        return 'frame';
    }
    return 'absolute';
}

/**
 * Check if node has padding
 */
export function hasPadding(node: FigmaNode): boolean {
    return !!(node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft);
}

/**
 * Extract padding information
 */
export function extractPadding(node: FigmaNode): PaddingInfo {
    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;

    return {
        top,
        right,
        bottom,
        left,
        isUniform: top === right && right === bottom && bottom === left
    };
}

/**
 * Convert fill to color info
 */
export function convertFillToColorInfo(fill: any): ColorInfo {
    const colorInfo: ColorInfo = {
        type: fill.type,
        opacity: fill.opacity
    };

    if (fill.color) {
        colorInfo.color = fill.color;
        colorInfo.hex = rgbaToHex(fill.color);
    }

    if (fill.gradientStops) {
        colorInfo.gradientStops = fill.gradientStops;
    }

    return colorInfo;
}

/**
 * Convert stroke to stroke info
 */
export function convertStrokeInfo(stroke: any): StrokeInfo {
    return {
        type: stroke.type,
        color: stroke.color,
        hex: rgbaToHex(stroke.color),
        weight: (stroke as any).strokeWeight || 1,
        align: (stroke as any).strokeAlign
    };
}

/**
 * Categorize effects for Flutter mapping
 */
export function categorizeEffects(effects: FigmaEffect[]): CategorizedEffects {
    const categorized: CategorizedEffects = {
        dropShadows: [],
        innerShadows: [],
        blurs: []
    };

    effects.forEach(effect => {
        if (effect.type === 'DROP_SHADOW' && effect.visible !== false) {
            categorized.dropShadows.push({
                color: effect.color!,
                hex: rgbaToHex(effect.color!),
                offset: effect.offset || {x: 0, y: 0},
                radius: effect.radius,
                spread: effect.spread,
                opacity: effect.color?.a || 1
            });
        } else if (effect.type === 'INNER_SHADOW' && effect.visible !== false) {
            categorized.innerShadows.push({
                color: effect.color!,
                hex: rgbaToHex(effect.color!),
                offset: effect.offset || {x: 0, y: 0},
                radius: effect.radius,
                spread: effect.spread,
                opacity: effect.color?.a || 1
            });
        } else if ((effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') && effect.visible !== false) {
            categorized.blurs.push({
                type: effect.type,
                radius: effect.radius
            });
        }
    });

    return categorized;
}

/**
 * Extract corner radius
 */
export function extractCornerRadius(node: FigmaNode): number | CornerRadii | undefined {
    const nodeAny = node as any;

    if (nodeAny.cornerRadius !== undefined) {
        return nodeAny.cornerRadius;
    }

    // Check for individual corner radii
    if (nodeAny.rectangleCornerRadii && Array.isArray(nodeAny.rectangleCornerRadii)) {
        const [topLeft, topRight, bottomRight, bottomLeft] = nodeAny.rectangleCornerRadii;
        const isUniform = topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft;

        if (isUniform) {
            return topLeft;
        }

        return {
            topLeft,
            topRight,
            bottomLeft,
            bottomRight,
            isUniform: false
        };
    }

    return undefined;
}

/**
 * Extract basic layout info for non-component children
 */
export function extractBasicLayout(node: FigmaNode): Partial<LayoutInfo> {
    return {
        type: determineLayoutType(node),
        dimensions: {
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0
        }
    };
}

/**
 * Extract basic styling info for non-component children
 */
export function extractBasicStyling(node: FigmaNode): Partial<StylingInfo> {
    const styling: Partial<StylingInfo> = {};

    if (node.fills && node.fills.length > 0) {
        styling.fills = node.fills.slice(0, 1).map(convertFillToColorInfo); // Limit to primary fill
    }

    const cornerRadius = extractCornerRadius(node);
    if (cornerRadius) {
        styling.cornerRadius = cornerRadius;
    }

    return styling;
}

/**
 * Extract enhanced text information
 */
export function extractTextInfo(node: FigmaNode): TextInfo | undefined {
    if (node.type !== 'TEXT') return undefined;

    const textContent = getActualTextContent(node);
    const isPlaceholder = isPlaceholderText(textContent);

    return {
        content: textContent,
        isPlaceholder,
        fontFamily: node.style?.fontFamily,
        fontSize: node.style?.fontSize,
        fontWeight: node.style?.fontWeight,
        textAlign: node.style?.textAlignHorizontal,
        textCase: detectTextCase(textContent),
        semanticType: detectSemanticType(textContent, node.name),
        placeholder: isPlaceholder
    };
}

/**
 * Get actual text content from various sources
 */
function getActualTextContent(node: FigmaNode): string {
    // 1. Primary source: characters property (official Figma API text content)
    if (node.characters && node.characters.trim().length > 0) {
        return node.characters.trim();
    }

    // 2. Check fills for text content (sometimes stored in fill metadata)
    if (node.fills) {
        for (const fill of node.fills) {
            if ((fill as any).textData || (fill as any).content) {
                const textContent = (fill as any).textData || (fill as any).content;
                if (textContent && textContent.trim().length > 0) {
                    return textContent.trim();
                }
            }
        }
    }

    // 3. Check for text in component properties (for component instances)
    if (node.type === 'INSTANCE' && (node as any).componentProperties) {
        const textProps = extractTextFromComponentProperties((node as any).componentProperties);
        if (textProps && textProps.trim().length > 0) {
            return textProps.trim();
        }
    }

    // 4. Analyze node name for meaningful content
    const nodeName = node.name;

    // If node name looks like actual content (not generic), use it
    if (isLikelyActualContent(nodeName)) {
        return nodeName;
    }

    // 5. Fallback to node name with placeholder flag
    return nodeName;
}

/**
 * Check if node name looks like actual content vs generic label
 */
function isLikelyActualContent(name: string): boolean {
    const genericPatterns = [
        /^text$/i,
        /^label$/i,
        /^heading$/i,
        /^title$/i,
        /^body\s*\d*$/i,
        /^text\s*\d+$/i,
        /^heading\s*\d+$/i,
        /^h\d+$/i,
        /^lorem\s+ipsum/i,
        /^sample\s+text/i,
        /^placeholder/i,
        /^example\s+text/i,
        /^demo\s+text/i,
        /^text\s*layer/i,
        /^component\s*\d+/i
    ];

    // If it matches generic patterns, it's probably not actual content
    if (genericPatterns.some(pattern => pattern.test(name))) {
        return false;
    }

    // If it's very short and common UI text, it might be actual content
    const shortUIText = ['ok', 'yes', 'no', 'save', 'cancel', 'close', 'menu', 'home', 'back', 'next', 'login', 'signup'];
    if (name.length <= 8 && shortUIText.includes(name.toLowerCase())) {
        return true;
    }

    // If it contains real words and is reasonably long, likely actual content
    if (name.length > 3 && name.length < 100) {
        // Check if it has word-like structure
        const hasWords = /\b[a-zA-Z]{2,}\b/.test(name);
        const hasSpaces = name.includes(' ');

        if (hasWords && (hasSpaces || name.length > 8)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if text content is placeholder/dummy text
 */
function isPlaceholderText(content: string): boolean {
    if (!content || content.trim().length === 0) {
        return true;
    }

    const trimmedContent = content.trim().toLowerCase();

    // Common placeholder patterns
    const placeholderPatterns = [
        /lorem\s+ipsum/i,
        /dolor\s+sit\s+amet/i,
        /consectetur\s+adipiscing/i,
        /the\s+quick\s+brown\s+fox/i,
        /sample\s+text/i,
        /placeholder/i,
        /example\s+text/i,
        /demo\s+text/i,
        /test\s+content/i,
        /dummy\s+text/i,
        /text\s+goes\s+here/i,
        /your\s+text\s+here/i,
        /add\s+text\s+here/i,
        /enter\s+text/i,
        /\[.*\]/,  // Text in brackets like [Your text here]
        /^heading\s*\d*$/i,
        /^title\s*\d*$/i,
        /^body\s*\d*$/i,
        /^text\s*\d*$/i,
        /^label\s*\d*$/i,
        /^h[1-6]$/i,
        /^paragraph$/i,
        /^caption$/i,
        /^subtitle$/i,
        /^overline$/i
    ];

    // Check against placeholder patterns
    if (placeholderPatterns.some(pattern => pattern.test(content))) {
        return true;
    }

    // Check for generic single words that are likely placeholders
    const genericWords = [
        'text', 'label', 'title', 'heading', 'body', 'content', 
        'description', 'subtitle', 'caption', 'paragraph', 'copy'
    ];

    if (genericWords.includes(trimmedContent)) {
        return true;
    }

    // Check for repeated characters (like "AAAA" or "xxxx")
    if (content.length > 2 && /^(.)\1+$/.test(content.trim())) {
        return true;
    }

    // Check for Lorem Ipsum variations
    if (/lorem|ipsum|dolor|sit|amet|consectetur|adipiscing|elit/i.test(content)) {
        return true;
    }

    return false;
}

/**
 * Extract text from component properties
 */
function extractTextFromComponentProperties(properties: any): string | null {
    if (!properties || typeof properties !== 'object') {
        return null;
    }

    // Look for common text property names
    const textPropertyNames = ['text', 'label', 'title', 'content', 'value', 'caption'];

    for (const propName of textPropertyNames) {
        if (properties[propName] && typeof properties[propName] === 'string') {
            return properties[propName];
        }
    }

    // Look for any string property that might contain text
    for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string' && value.length > 0 && !isPlaceholderText(value)) {
            return value;
        }
    }

    return null;
}

/**
 * Detect text case pattern
 */
function detectTextCase(content: string): 'uppercase' | 'lowercase' | 'capitalize' | 'sentence' | 'mixed' {
    if (content.length === 0) return 'mixed';

    const isAllUpper = content === content.toUpperCase() && content !== content.toLowerCase();
    const isAllLower = content === content.toLowerCase() && content !== content.toUpperCase();

    if (isAllUpper) return 'uppercase';
    if (isAllLower) return 'lowercase';

    // Check if it's title case (first letter of each word capitalized)
    const words = content.split(/\s+/);
    const isTitleCase = words.every(word => {
        return word.length === 0 || word[0] === word[0].toUpperCase();
    });

    if (isTitleCase) return 'capitalize';

    // Check if it's sentence case (first letter capitalized, rest normal)
    if (content[0] === content[0].toUpperCase()) {
        return 'sentence';
    }

    return 'mixed';
}

/**
 * Detect semantic type of text based on content and context
 */
function detectSemanticType(content: string, nodeName: string): 'heading' | 'body' | 'label' | 'button' | 'link' | 'caption' | 'error' | 'success' | 'warning' | 'other' {
    const lowerContent = content.toLowerCase().trim();
    const lowerNodeName = nodeName.toLowerCase();

    // Skip detection for placeholder text
    if (isPlaceholderText(content)) {
        return 'other';
    }

    // Button text patterns - exact matches for common button labels
    const buttonPatterns = [
        /^(click|tap|press|submit|send|save|cancel|ok|yes|no|continue|next|back|close|done|finish|start|begin)$/i,
        /^(login|log in|sign in|signup|sign up|register|logout|log out|sign out)$/i,
        /^(buy|purchase|add|remove|delete|edit|update|create|new|get started|learn more|try now)$/i,
        /^(download|upload|share|copy|paste|cut|undo|redo|refresh|reload|search|filter|sort|apply|reset|clear)$/i,
        /^(accept|decline|agree|disagree|confirm|verify|validate|approve|reject)$/i
    ];

    if (buttonPatterns.some(pattern => pattern.test(content)) || lowerNodeName.includes('button')) {
        return 'button';
    }

    // Error/status text patterns - more comprehensive detection
    const errorPatterns = /error|invalid|required|missing|failed|wrong|incorrect|forbidden|unauthorized|not found|unavailable|expired|timeout/i;
    const successPatterns = /success|completed|done|saved|updated|created|uploaded|downloaded|sent|delivered|confirmed|verified|approved/i;
    const warningPatterns = /warning|caution|note|important|attention|notice|alert|reminder|tip|info|information/i;

    if (errorPatterns.test(content)) {
        return 'error';
    }

    if (successPatterns.test(content)) {
        return 'success';
    }

    if (warningPatterns.test(content)) {
        return 'warning';
    }

    // Link patterns - navigation and informational links
    const linkPatterns = [
        /^(learn more|read more|see more|view all|show all|details|click here|view details)$/i,
        /^(about|contact|help|support|faq|terms|privacy|policy|documentation|docs|guide|tutorial)$/i,
        /^(home|dashboard|profile|settings|preferences|account|billing|notifications|security)$/i
    ];

    if (linkPatterns.some(pattern => pattern.test(content)) || lowerNodeName.includes('link')) {
        return 'link';
    }

    // Heading patterns - based on structure and context
    if (content.length < 80 && !content.endsWith('.') && !content.includes('\n')) {
        if (lowerNodeName.includes('heading') || lowerNodeName.includes('title') || /h[1-6]/.test(lowerNodeName)) {
            return 'heading';
        }
        // Check if it looks like a title (short, starts with capital, no sentence punctuation)
        if (content.length < 50 && /^[A-Z]/.test(content) && !/[.!?]$/.test(content)) {
            return 'heading';
        }
    }

    // Label patterns - form labels and descriptive text
    if (content.length < 40 && (content.endsWith(':') || lowerNodeName.includes('label') || lowerNodeName.includes('field'))) {
        return 'label';
    }

    // Caption patterns - short descriptive text
    if (content.length < 120 && (
        lowerNodeName.includes('caption') || 
        lowerNodeName.includes('subtitle') || 
        lowerNodeName.includes('description') ||
        lowerNodeName.includes('meta')
    )) {
        return 'caption';
    }

    // Body text - longer content, paragraphs
    if (content.length > 80 || content.includes('\n') || content.includes('. ')) {
        return 'body';
    }

    return 'other';
}

/**
 * Generate Flutter widget suggestion based on semantic type and text info
 */
export function generateFlutterTextWidget(textInfo: TextInfo): string {
    // Escape single quotes in content for Dart strings
    const escapedContent = textInfo.content.replace(/'/g, "\\'");
    
    if (textInfo.isPlaceholder) {
        return `Text('${escapedContent}') // TODO: Replace with actual content`;
    }

    // Generate style properties based on text info
    const styleProps: string[] = [];
    if (textInfo.fontFamily) {
        styleProps.push(`fontFamily: '${textInfo.fontFamily}'`);
    }
    if (textInfo.fontSize) {
        styleProps.push(`fontSize: ${textInfo.fontSize}`);
    }
    if (textInfo.fontWeight && textInfo.fontWeight !== 400) {
        const fontWeight = textInfo.fontWeight >= 700 ? 'FontWeight.bold' : 
                          textInfo.fontWeight >= 600 ? 'FontWeight.w600' :
                          textInfo.fontWeight >= 500 ? 'FontWeight.w500' :
                          textInfo.fontWeight <= 300 ? 'FontWeight.w300' : 'FontWeight.normal';
        styleProps.push(`fontWeight: ${fontWeight}`);
    }

    const customStyle = styleProps.length > 0 ? `TextStyle(${styleProps.join(', ')})` : null;

    switch (textInfo.semanticType) {
        case 'button':
            return `ElevatedButton(\n  onPressed: () {\n    // TODO: Implement button action\n  },\n  child: Text('${escapedContent}'),\n)`;

        case 'link':
            return `TextButton(\n  onPressed: () {\n    // TODO: Implement navigation\n  },\n  child: Text('${escapedContent}'),\n)`;

        case 'heading':
            const headingStyle = customStyle || 'Theme.of(context).textTheme.headlineMedium';
            return `Text(\n  '${escapedContent}',\n  style: ${headingStyle},\n)`;

        case 'body':
            const bodyStyle = customStyle || 'Theme.of(context).textTheme.bodyMedium';
            return `Text(\n  '${escapedContent}',\n  style: ${bodyStyle},\n)`;

        case 'caption':
            const captionStyle = customStyle || 'Theme.of(context).textTheme.bodySmall';
            return `Text(\n  '${escapedContent}',\n  style: ${captionStyle},\n)`;

        case 'label':
            const labelStyle = customStyle || 'Theme.of(context).textTheme.labelMedium';
            return `Text(\n  '${escapedContent}',\n  style: ${labelStyle},\n)`;

        case 'error':
            const errorStyle = customStyle ? 
                `${customStyle.slice(0, -1)}, color: Theme.of(context).colorScheme.error)` :
                'TextStyle(color: Theme.of(context).colorScheme.error)';
            return `Text(\n  '${escapedContent}',\n  style: ${errorStyle},\n)`;

        case 'success':
            const successStyle = customStyle ?
                `${customStyle.slice(0, -1)}, color: Colors.green)` :
                'TextStyle(color: Colors.green)';
            return `Text(\n  '${escapedContent}',\n  style: ${successStyle},\n)`;

        case 'warning':
            const warningStyle = customStyle ?
                `${customStyle.slice(0, -1)}, color: Colors.orange)` :
                'TextStyle(color: Colors.orange)';
            return `Text(\n  '${escapedContent}',\n  style: ${warningStyle},\n)`;

        default:
            return customStyle ? 
                `Text(\n  '${escapedContent}',\n  style: ${customStyle},\n)` :
                `Text('${escapedContent}')`;
    }
}

/**
 * Get all text content from a component tree
 */
export function extractAllTextContent(node: FigmaNode): Array<{nodeId: string, textInfo: TextInfo, widgetSuggestion: string}> {
    const textNodes: Array<{nodeId: string, textInfo: TextInfo, widgetSuggestion: string}> = [];

    traverseForText(node, textNodes);

    return textNodes;
}

/**
 * Recursively traverse node tree to find all text nodes
 */
function traverseForText(
    node: FigmaNode,
    results: Array<{nodeId: string, textInfo: TextInfo, widgetSuggestion: string}>,
    depth: number = 0
): void {
    if (depth > 5) return; // Prevent infinite recursion

    if (node.type === 'TEXT') {
        const textInfo = extractTextInfo(node);
        if (textInfo) {
            results.push({
                nodeId: node.id,
                textInfo,
                widgetSuggestion: generateFlutterTextWidget(textInfo)
            });
        }
    }

    if (node.children) {
        node.children.forEach(child => {
            traverseForText(child, results, depth + 1);
        });
    }
}

/**
 * Convert RGBA color to hex string
 */
export function rgbaToHex(color: FigmaColor): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}