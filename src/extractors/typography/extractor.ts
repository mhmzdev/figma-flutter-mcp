// src/extractors/typography/extractor.mts

import type {FigmaNode, FigmaTextStyle} from '../../types/figma.js';
import type {
    TypographyStyle,
    TypographyDefinition,
    TypographyExtractionContext,
    TypographyExtractorFn,
    TextStyleHash
} from './types.js';

/**
 * Extract typography styles from a theme frame containing text samples
 */
export function extractTypographyFromThemeFrame(frameNode: FigmaNode): TypographyStyle[] {
    const typography: TypographyStyle[] = [];

    // Find all child nodes in the frame
    if (!frameNode.children) {
        return typography;
    }

    // Look for text nodes only, ignore frames and other nodes that might be for colors
    frameNode.children.forEach(child => {
        // Only process direct text nodes or groups/frames that contain text
        if (child.type === 'TEXT') {
            const textStyle = createTypographyStyle(child);
            if (textStyle) {
                typography.push(textStyle);
            }
        } else if (child.children) {
            // For groups/frames, only look for immediate text children
            child.children.forEach(grandchild => {
                if (grandchild.type === 'TEXT') {
                    const textStyle = createTypographyStyle(grandchild);
                    if (textStyle) {
                        typography.push(textStyle);
                    }
                }
            });
        }
    });

    return typography;
}

/**
 * Extract typography from a single node (used by theme frame extraction)
 */
function extractTypographyFromNode(node: FigmaNode): TypographyStyle | null {
    // Check if this node is a text node
    if (node.type === 'TEXT' && node.style) {
        return createTypographyStyle(node);
    }

    // Only check immediate children for text nodes, don't go deep to avoid color frames
    if (node.children) {
        for (const child of node.children) {
            // Only process direct text nodes, ignore nested structures
            if (child.type === 'TEXT' && child.style) {
                return createTypographyStyle(child);
            }
        }
    }

    return null;
}

/**
 * Create typography style from text node
 */
function createTypographyStyle(node: FigmaNode): TypographyStyle | null {
    if (!node.style) {
        return null;
    }

    // Get typography name from node name or generate one
    const typographyName = getTypographyName(node);
    if (!typographyName) {
        return null;
    }

    // Ensure we have a valid font family, fallback to system default if needed
    const fontFamily = node.style.fontFamily && node.style.fontFamily.trim() !== ''
        ? node.style.fontFamily.trim()
        : 'Roboto'; // Flutter's default font

    return {
        name: typographyName,
        fontFamily: fontFamily,
        fontSize: node.style.fontSize || 16,
        fontWeight: node.style.fontWeight || 400,
        lineHeight: node.style.lineHeightPx || (node.style.fontSize || 16) * 1.2,
        letterSpacing: node.style.letterSpacing || 0,
        nodeId: node.id,
        textAlign: node.style.textAlignHorizontal,
    };
}

/**
 * Get typography name from node or generate meaningful name
 */
function getTypographyName(node: FigmaNode): string | null {
    // Always prioritize the actual node name from Figma first
    if (node.name && node.name.trim() && !isTypographyDemoNode(node)) {
        return cleanTypographyName(node.name);
    }

    // Fallback to style-based generation only if no meaningful name
    if (node.style) {
        return generateTypographyNameFromStyle(node.style);
    }

    return null;
}

/**
 * Check if name looks like a typography style name
 */
function isTypographyStyleName(name: string): boolean {
    const typographyKeywords = [
        // Typography categories
        'heading', 'title', 'subtitle', 'body', 'caption', 'label', 'button',
        'display', 'headline', 'subheading', 'overline',

        // Size variations
        'large', 'medium', 'small', 'xl', 'lg', 'md', 'sm', 'xs',
        'big', 'regular', 'tiny',

        // Weight variations
        'bold', 'semibold', 'medium', 'regular', 'light', 'thin',

        // Number variations
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        '1', '2', '3', '4', '5', '6'
    ];

    const lowerName = name.toLowerCase();
    return typographyKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Check if node is a typography demo/sample and should be excluded
 */
export function isTypographyDemoNode(node: FigmaNode): boolean {
    const demoKeywords = [
        // Lorem ipsum and common demo text
        'lorem', 'ipsum', 'dolor', 'sit', 'amet',
        'sample text', 'example text', 'demo text', 'placeholder text',
        'the quick brown', 'abcdefg', 'test text',

        // Demo indicators
        'sample', 'example', 'demo', 'placeholder', 'preview',
        'specimen', 'showcase', 'test'
    ];

    const nodeName = node.name.toLowerCase();

    // Check node name against demo keywords
    const isDemoByName = demoKeywords.some(keyword =>
        nodeName.includes(keyword.toLowerCase())
    );

    // Check if node name is very generic (likely demo text)
    const isGenericName = /^(text|label|title|heading|body)(\s*\d+)?$/i.test(node.name.trim());

    return isDemoByName || isGenericName;
}

/**
 * Clean up typography name for use as identifier while preserving original naming
 */
function cleanTypographyName(name: string): string {
    // First, clean up the name but preserve the original structure
    let cleaned = name
        .trim()
        .replace(/\s+/g, ' '); // Normalize whitespace

    // Only remove common prefixes/suffixes if they're clearly not part of the intended name
    if (cleaned.toLowerCase().startsWith('text ') && cleaned.split(' ').length > 1) {
        cleaned = cleaned.substring(5);
    }
    if (cleaned.toLowerCase().endsWith(' style') && cleaned.split(' ').length > 1) {
        cleaned = cleaned.substring(0, cleaned.length - 6);
    }

    // Convert to PascalCase while preserving meaningful word boundaries
    return cleaned
        .split(/[\s\-_]+/)
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Generate typography name from style properties
 */
function generateTypographyNameFromStyle(style: FigmaTextStyle): string {
    const fontSize = style.fontSize || 16;
    const fontWeight = style.fontWeight || 400;

    // Categorize by size
    let sizeName = 'Body';
    if (fontSize >= 32) sizeName = 'DisplayLarge';
    else if (fontSize >= 28) sizeName = 'DisplayMedium';
    else if (fontSize >= 24) sizeName = 'DisplaySmall';
    else if (fontSize >= 22) sizeName = 'HeadlineLarge';
    else if (fontSize >= 20) sizeName = 'HeadlineMedium';
    else if (fontSize >= 18) sizeName = 'HeadlineSmall';
    else if (fontSize >= 16) sizeName = 'BodyLarge';
    else if (fontSize >= 14) sizeName = 'BodyMedium';
    else if (fontSize >= 12) sizeName = 'BodySmall';
    else if (fontSize >= 11) sizeName = 'LabelLarge';
    else if (fontSize >= 10) sizeName = 'LabelMedium';
    else sizeName = 'LabelSmall';

    // Add weight if not regular
    if (fontWeight >= 700) {
        sizeName += 'Bold';
    } else if (fontWeight >= 600) {
        sizeName += 'SemiBold';
    } else if (fontWeight >= 500) {
        sizeName += 'Medium';
    } else if (fontWeight <= 300) {
        sizeName += 'Light';
    }

    return sizeName;
}

/**
 * Generate meaningful typography name from style and context
 */
function generateTypographyName(style: FigmaTextStyle, nodeName: string): string {
    // Try to infer name from node context first
    const name = nodeName.toLowerCase();

    if (name.includes('heading') || name.includes('title')) return 'Heading';
    if (name.includes('subtitle')) return 'Subtitle';
    if (name.includes('body')) return 'Body';
    if (name.includes('caption')) return 'Caption';
    if (name.includes('button')) return 'Button';
    if (name.includes('label')) return 'Label';

    // Fallback to style-based naming
    return generateTypographyNameFromStyle(style);
}

/**
 * Generate Dart-safe property name
 */
function generateDartSafeName(style: FigmaTextStyle, nodeName: string): string {
    const baseName = generateTypographyName(style, nodeName);

    // Convert to camelCase and ensure it's Dart-safe
    return baseName.charAt(0).toLowerCase() + baseName.slice(1)
        .replace(/[^a-zA-Z0-9]/g, '')
        .replace(/^\d/, '_$&'); // Prefix with underscore if starts with number
}

/**
 * Categorize typography usage
 */
function categorizeTypographyUsage(style: FigmaTextStyle, nodeName: string): TypographyDefinition['usage'] {
    const name = nodeName.toLowerCase();
    const fontSize = style.fontSize || 16;

    // Check name patterns first
    if (name.includes('heading') || name.includes('title') || name.includes('h1') || name.includes('h2') || name.includes('h3')) {
        return 'heading';
    }
    if (name.includes('body') || name.includes('paragraph')) return 'body';
    if (name.includes('caption') || name.includes('small')) return 'caption';
    if (name.includes('button')) return 'button';
    if (name.includes('label')) return 'label';

    // Fallback to size-based categorization
    if (fontSize >= 20) return 'heading';
    if (fontSize >= 14) return 'body';
    if (fontSize >= 12) return 'caption';

    return 'other';
}

/**
 * Create text style hash for deduplication
 */
function createTextStyleHash(style: FigmaTextStyle): TextStyleHash {
    return {
        fontFamily: style.fontFamily || 'default',
        fontSize: style.fontSize || 16,
        fontWeight: style.fontWeight || 400,
        lineHeight: style.lineHeightPx || (style.fontSize || 16) * 1.2,
        letterSpacing: style.letterSpacing || 0,
    };
}

/**
 * Add typography to library with deduplication
 */
function addTypographyToLibrary(
    style: FigmaTextStyle,
    nodeName: string,
    typographyLibrary: TypographyDefinition[],
    typographyMap: Map<string, string>
): string {
    const styleHash = createTextStyleHash(style);
    const hashString = JSON.stringify(styleHash);

    // Check if typography already exists
    const existingId = typographyMap.get(hashString);
    if (existingId) {
        // Increment usage count
        const typography = typographyLibrary.find(t => t.id === existingId);
        if (typography) {
            typography.usageCount++;
        }
        return existingId;
    }

    // Create new typography definition
    const typographyId = `typography_${typographyLibrary.length + 1}`;
    const typographyDef: TypographyDefinition = {
        id: typographyId,
        name: generateTypographyName(style, nodeName),
        fontFamily: style.fontFamily && style.fontFamily.trim() !== ''
            ? style.fontFamily.trim()
            : 'Roboto',
        fontSize: style.fontSize || 16,
        fontWeight: style.fontWeight || 400,
        lineHeight: style.lineHeightPx || (style.fontSize || 16) * 1.2,
        letterSpacing: style.letterSpacing || 0,
        usage: categorizeTypographyUsage(style, nodeName),
        usageCount: 1,
        dartName: generateDartSafeName(style, nodeName)
    };

    typographyLibrary.push(typographyDef);
    typographyMap.set(hashString, typographyId);

    return typographyId;
}
