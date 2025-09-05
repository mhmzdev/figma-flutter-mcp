// src/tools/flutter/semantic-detection.ts

/**
 * Advanced semantic detection with multi-factor analysis and confidence scoring
 * Based on heuristics improvement recommendations
 */

export interface SemanticContext {
    parentType?: string;
    siblingTypes: string[];
    screenPosition: 'header' | 'content' | 'footer' | 'unknown';
    componentType: 'form' | 'navigation' | 'content' | 'card' | 'button-group' | 'unknown';
    layoutDirection?: 'horizontal' | 'vertical';
    isInteractive?: boolean;
    hasActionableNeighbors?: boolean;
}

export interface SemanticClassification {
    type: 'heading' | 'body' | 'label' | 'button' | 'link' | 'caption' | 'error' | 'success' | 'warning' | 'other';
    confidence: number; // 0-1
    alternatives: Array<{type: string; confidence: number}>;
    reasoning: string[];
}

export interface PositionContext {
    isTopLevel: boolean;
    isBottomLevel: boolean;
    isIsolated: boolean;
    visualWeight: number;
    relativeSize: number;
    hasNearbyInteractive: boolean;
}

export interface TextAnalysis {
    isActionable: boolean;
    isDescriptive: boolean;
    isNavigational: boolean;
    isStatusMessage: boolean;
    length: number;
    structure: 'imperative' | 'declarative' | 'question' | 'fragment' | 'mixed';
    hasActionWords: boolean;
    hasImperativeForm: boolean;
}

export interface DesignPattern {
    name: string;
    confidence: number;
    indicators: string[];
}

/**
 * Enhanced semantic type detection with multi-factor analysis
 */
export function detectSemanticTypeAdvanced(
    content: string,
    nodeName: string,
    context: SemanticContext,
    nodeProperties?: any
): SemanticClassification {
    const factors = {
        textContent: analyzeTextContent(content),
        nodeName: analyzeNodeName(nodeName),
        position: nodeProperties ? analyzePosition(nodeProperties, context) : null,
        styling: nodeProperties ? analyzeStyling(nodeProperties) : null,
        patterns: detectDesignPatterns(content, nodeName, nodeProperties, context)
    };

    return weightedClassification(factors, context);
}

/**
 * Analyze text content for semantic clues
 */
function analyzeTextContent(content: string): TextAnalysis {
    const lowerContent = content.toLowerCase().trim();
    
    // Check for action words
    const actionWords = [
        'click', 'tap', 'press', 'submit', 'send', 'save', 'cancel', 'continue',
        'next', 'back', 'close', 'start', 'begin', 'try', 'get', 'download',
        'upload', 'buy', 'purchase', 'add', 'remove', 'edit', 'delete', 'create'
    ];
    
    const hasActionWords = actionWords.some(word => lowerContent.includes(word));
    
    // Check for imperative form (simplified detection)
    const hasImperativeForm = /^(let's|please|go|try|get|make|do|use|see|find|learn|discover)/.test(lowerContent) ||
                             /^[a-z]+ (now|here|more|started)$/i.test(lowerContent);
    
    // Check for navigational keywords
    const navKeywords = ['home', 'back', 'next', 'previous', 'menu', 'settings', 'profile', 'about', 'contact', 'help'];
    const isNavigational = navKeywords.some(word => lowerContent.includes(word));
    
    // Check for status messages
    const statusKeywords = ['error', 'success', 'warning', 'complete', 'failed', 'loading', 'pending'];
    const isStatusMessage = statusKeywords.some(word => lowerContent.includes(word));
    
    // Determine structure
    let structure: TextAnalysis['structure'] = 'mixed';
    if (content.endsWith('?')) structure = 'question';
    else if (hasImperativeForm || hasActionWords) structure = 'imperative';
    else if (content.length > 50 && content.includes('.')) structure = 'declarative';
    else if (content.length < 30 && !content.includes('.')) structure = 'fragment';
    
    return {
        isActionable: hasActionWords || hasImperativeForm,
        isDescriptive: content.length > 50 && !hasActionWords,
        isNavigational,
        isStatusMessage,
        length: content.length,
        structure,
        hasActionWords,
        hasImperativeForm
    };
}

/**
 * Analyze node name for semantic clues
 */
function analyzeNodeName(nodeName: string): {type: string; confidence: number} {
    const lowerName = nodeName.toLowerCase();
    
    // High confidence name patterns
    if (lowerName.includes('button') || lowerName.includes('btn')) {
        return {type: 'button', confidence: 0.9};
    }
    if (lowerName.includes('heading') || lowerName.includes('title') || /h[1-6]/.test(lowerName)) {
        return {type: 'heading', confidence: 0.9};
    }
    if (lowerName.includes('label') || lowerName.includes('field')) {
        return {type: 'label', confidence: 0.8};
    }
    if (lowerName.includes('link') || lowerName.includes('nav')) {
        return {type: 'link', confidence: 0.8};
    }
    if (lowerName.includes('caption') || lowerName.includes('subtitle')) {
        return {type: 'caption', confidence: 0.8};
    }
    if (lowerName.includes('error') || lowerName.includes('warning') || lowerName.includes('success')) {
        return {type: lowerName.includes('error') ? 'error' : lowerName.includes('warning') ? 'warning' : 'success', confidence: 0.9};
    }
    
    return {type: 'unknown', confidence: 0.0};
}

/**
 * Analyze position context
 */
function analyzePosition(nodeProperties: any, context: SemanticContext): PositionContext {
    const bounds = nodeProperties.absoluteBoundingBox;
    const parentBounds = nodeProperties.parent?.absoluteBoundingBox;
    
    if (!bounds || !parentBounds) {
        return {
            isTopLevel: false,
            isBottomLevel: false,
            isIsolated: false,
            visualWeight: 1,
            relativeSize: 1,
            hasNearbyInteractive: false
        };
    }
    
    const relativeY = (bounds.y - parentBounds.y) / parentBounds.height;
    const relativeSize = (bounds.width * bounds.height) / (parentBounds.width * parentBounds.height);
    
    return {
        isTopLevel: relativeY < 0.2,
        isBottomLevel: relativeY > 0.8,
        isIsolated: calculateIsolation(bounds, nodeProperties.siblings || []),
        visualWeight: calculateVisualWeight(nodeProperties),
        relativeSize,
        hasNearbyInteractive: context.hasActionableNeighbors || false
    };
}

/**
 * Analyze styling patterns
 */
function analyzeStyling(nodeProperties: any): {buttonLike: number; textLike: number; statusLike: number} {
    const styling = nodeProperties.styling || {};
    
    let buttonLike = 0;
    let textLike = 0;
    let statusLike = 0;
    
    // Button-like characteristics
    if (styling.fills?.length > 0) buttonLike += 0.3;
    if (styling.strokes?.length > 0) buttonLike += 0.2;
    if (styling.cornerRadius !== undefined && styling.cornerRadius > 4) buttonLike += 0.3;
    if (nodeProperties.layout?.padding) buttonLike += 0.2;
    
    // Text-like characteristics
    if (!styling.fills || styling.fills.length === 0) textLike += 0.3;
    if (!styling.strokes || styling.strokes.length === 0) textLike += 0.2;
    if (!styling.cornerRadius || styling.cornerRadius === 0) textLike += 0.3;
    
    // Status-like characteristics (color-based)
    if (styling.fills?.length > 0) {
        const primaryColor = styling.fills[0].hex?.toLowerCase();
        if (primaryColor?.includes('red') || primaryColor?.includes('ff')) statusLike += 0.4;
        if (primaryColor?.includes('green') || primaryColor?.includes('0f')) statusLike += 0.4;
        if (primaryColor?.includes('orange') || primaryColor?.includes('yellow')) statusLike += 0.4;
    }
    
    return {buttonLike, textLike, statusLike};
}

/**
 * Detect design patterns
 */
function detectDesignPatterns(
    content: string,
    nodeName: string,
    nodeProperties: any,
    context: SemanticContext
): DesignPattern[] {
    const patterns: DesignPattern[] = [];
    
    // Button pattern
    const buttonPattern = detectButtonPattern(content, nodeName, nodeProperties, context);
    if (buttonPattern.confidence > 0.5) patterns.push(buttonPattern);
    
    // Heading pattern
    const headingPattern = detectHeadingPattern(content, nodeName, nodeProperties, context);
    if (headingPattern.confidence > 0.5) patterns.push(headingPattern);
    
    // Form label pattern
    const labelPattern = detectLabelPattern(content, nodeName, nodeProperties, context);
    if (labelPattern.confidence > 0.5) patterns.push(labelPattern);
    
    // Navigation pattern
    const navPattern = detectNavigationPattern(content, nodeName, nodeProperties, context);
    if (navPattern.confidence > 0.5) patterns.push(navPattern);
    
    return patterns;
}

/**
 * Detect button pattern
 */
function detectButtonPattern(content: string, nodeName: string, nodeProperties: any, context: SemanticContext): DesignPattern {
    const indicators: string[] = [];
    let confidence = 0;
    
    // Content analysis
    const textAnalysis = analyzeTextContent(content);
    if (textAnalysis.isActionable) {
        confidence += 0.4;
        indicators.push('actionable text');
    }
    
    // Visual characteristics
    const styling = analyzeStyling(nodeProperties);
    if (styling.buttonLike > 0.6) {
        confidence += 0.3;
        indicators.push('button-like styling');
    }
    
    // Context analysis
    if (context.componentType === 'form' && textAnalysis.hasActionWords) {
        confidence += 0.2;
        indicators.push('form context with action words');
    }
    
    // Name analysis
    if (nodeName.toLowerCase().includes('button')) {
        confidence += 0.1;
        indicators.push('button in name');
    }
    
    return {
        name: 'button',
        confidence: Math.min(confidence, 1),
        indicators
    };
}

/**
 * Detect heading pattern
 */
function detectHeadingPattern(content: string, nodeName: string, nodeProperties: any, context: SemanticContext): DesignPattern {
    const indicators: string[] = [];
    let confidence = 0;
    
    // Size and typography
    const fontSize = nodeProperties.text?.fontSize || 0;
    const fontWeight = nodeProperties.text?.fontWeight || 400;
    
    if (fontSize > 18) {
        confidence += 0.3;
        indicators.push('large font size');
    }
    if (fontWeight >= 600) {
        confidence += 0.2;
        indicators.push('bold font weight');
    }
    
    // Content structure
    if (content.length < 80 && !content.endsWith('.')) {
        confidence += 0.2;
        indicators.push('short non-sentence text');
    }
    
    // Position context
    const position = analyzePosition(nodeProperties, context);
    if (position.isTopLevel) {
        confidence += 0.2;
        indicators.push('top-level position');
    }
    
    // Context analysis
    if (context.screenPosition === 'header') {
        confidence += 0.1;
        indicators.push('header context');
    }
    
    return {
        name: 'heading',
        confidence: Math.min(confidence, 1),
        indicators
    };
}

/**
 * Detect label pattern
 */
function detectLabelPattern(content: string, nodeName: string, nodeProperties: any, context: SemanticContext): DesignPattern {
    const indicators: string[] = [];
    let confidence = 0;
    
    // Content characteristics
    if (content.length < 40 && content.endsWith(':')) {
        confidence += 0.4;
        indicators.push('short text ending with colon');
    }
    
    // Context analysis
    if (context.componentType === 'form') {
        confidence += 0.3;
        indicators.push('form context');
    }
    
    // Name analysis
    if (nodeName.toLowerCase().includes('label')) {
        confidence += 0.3;
        indicators.push('label in name');
    }
    
    return {
        name: 'label',
        confidence: Math.min(confidence, 1),
        indicators
    };
}

/**
 * Detect navigation pattern
 */
function detectNavigationPattern(content: string, nodeName: string, nodeProperties: any, context: SemanticContext): DesignPattern {
    const indicators: string[] = [];
    let confidence = 0;
    
    // Content analysis
    const textAnalysis = analyzeTextContent(content);
    if (textAnalysis.isNavigational) {
        confidence += 0.4;
        indicators.push('navigational content');
    }
    
    // Context analysis
    if (context.componentType === 'navigation' || context.screenPosition === 'header') {
        confidence += 0.3;
        indicators.push('navigation context');
    }
    
    // Layout analysis
    if (context.hasActionableNeighbors) {
        confidence += 0.2;
        indicators.push('near other actionable elements');
    }
    
    return {
        name: 'navigation',
        confidence: Math.min(confidence, 1),
        indicators
    };
}

/**
 * Weighted classification based on all factors
 */
function weightedClassification(factors: any, context: SemanticContext): SemanticClassification {
    const candidates: Array<{type: string; confidence: number; reasoning: string[]}> = [];
    
    // Pattern-based classification (highest priority)
    if (factors.patterns) {
        factors.patterns.forEach((pattern: DesignPattern) => {
            if (pattern.confidence > 0.6) {
                candidates.push({
                    type: pattern.name,
                    confidence: pattern.confidence,
                    reasoning: [`Strong ${pattern.name} pattern: ${pattern.indicators.join(', ')}`]
                });
            }
        });
    }
    
    // Text content analysis
    if (factors.textContent) {
        const textAnalysis = factors.textContent as TextAnalysis;
        
        if (textAnalysis.isActionable && textAnalysis.length < 50) {
            candidates.push({
                type: 'button',
                confidence: 0.7,
                reasoning: ['Actionable short text content']
            });
        }
        
        if (textAnalysis.isNavigational) {
            candidates.push({
                type: 'link',
                confidence: 0.6,
                reasoning: ['Navigational text content']
            });
        }
        
        if (textAnalysis.isStatusMessage) {
            const statusType = determineStatusType(factors.textContent, factors.styling);
            candidates.push({
                type: statusType,
                confidence: 0.8,
                reasoning: ['Status message detected']
            });
        }
        
        if (textAnalysis.length > 80 || textAnalysis.structure === 'declarative') {
            candidates.push({
                type: 'body',
                confidence: 0.6,
                reasoning: ['Long descriptive text']
            });
        }
    }
    
    // Name-based classification
    if (factors.nodeName && factors.nodeName.confidence > 0.7) {
        candidates.push({
            type: factors.nodeName.type,
            confidence: factors.nodeName.confidence,
            reasoning: ['Node name indicates type']
        });
    }
    
    // Apply confidence threshold - only return high confidence classifications
    const highConfidenceCandidates = candidates.filter(c => c.confidence >= 0.6);
    
    if (highConfidenceCandidates.length === 0) {
        return {
            type: 'other',
            confidence: 0.0,
            alternatives: candidates.map(c => ({type: c.type, confidence: c.confidence})),
            reasoning: ['Low confidence in all classifications - deferring to AI interpretation']
        };
    }
    
    // Sort by confidence and return the best match
    highConfidenceCandidates.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = highConfidenceCandidates[0];
    
    return {
        type: bestMatch.type as any,
        confidence: bestMatch.confidence,
        alternatives: highConfidenceCandidates.slice(1).map(c => ({type: c.type, confidence: c.confidence})),
        reasoning: bestMatch.reasoning
    };
}

/**
 * Helper functions
 */
function calculateIsolation(bounds: any, siblings: any[]): boolean {
    if (!siblings || siblings.length === 0) return true;
    
    const minDistance = 50; // pixels
    return !siblings.some((sibling: any) => {
        if (!sibling.absoluteBoundingBox) return false;
        
        const distance = Math.sqrt(
            Math.pow(bounds.x - sibling.absoluteBoundingBox.x, 2) +
            Math.pow(bounds.y - sibling.absoluteBoundingBox.y, 2)
        );
        
        return distance < minDistance;
    });
}

function calculateVisualWeight(nodeProperties: any): number {
    let weight = 1;
    
    // Size contribution
    const area = (nodeProperties.absoluteBoundingBox?.width || 0) * (nodeProperties.absoluteBoundingBox?.height || 0);
    if (area > 10000) weight += 2;
    else if (area > 5000) weight += 1;
    
    // Styling contribution
    if (nodeProperties.styling?.fills?.length > 0) weight += 1;
    if (nodeProperties.styling?.strokes?.length > 0) weight += 0.5;
    if (nodeProperties.text?.fontWeight >= 600) weight += 1;
    
    return weight;
}

function determineStatusType(textAnalysis: TextAnalysis, styling: any): string {
    const content = textAnalysis;
    // This is a simplified version - in practice you'd analyze the content more thoroughly
    if (styling?.statusLike > 0.5) {
        // Could analyze color to determine if error, warning, or success
        return 'error'; // simplified
    }
    return 'other';
}

/**
 * Enhanced section type detection with confidence scoring
 */
export function detectSectionTypeAdvanced(
    node: any,
    parent?: any,
    siblings?: any[]
): {type: 'header' | 'navigation' | 'content' | 'footer' | 'sidebar' | 'modal' | 'other'; confidence: number; reasoning: string[]} {
    const factors = {
        nodeName: analyzeNodeName(node.name),
        position: parent ? analyzePosition(node, generateSemanticContext(node, parent, siblings)) : null,
        styling: analyzeStyling(node),
        siblings: siblings ? analyzeSiblingContext(siblings) : null
    };

    return classifySection(factors);
}

/**
 * Classify section based on multiple factors
 */
function classifySection(factors: any): {type: 'header' | 'navigation' | 'content' | 'footer' | 'sidebar' | 'modal' | 'other'; confidence: number; reasoning: string[]} {
    const candidates: Array<{type: 'header' | 'navigation' | 'content' | 'footer' | 'sidebar' | 'modal' | 'other'; confidence: number; reasoning: string[]}> = [];
    
    // Name-based classification
    if (factors.nodeName.confidence > 0.7) {
        const nameType = factors.nodeName.type;
        const sectionType = (['header', 'navigation', 'content', 'footer', 'sidebar', 'modal'].includes(nameType)) 
            ? nameType as 'header' | 'navigation' | 'content' | 'footer' | 'sidebar' | 'modal'
            : 'other' as const;
        
        candidates.push({
            type: sectionType,
            confidence: factors.nodeName.confidence,
            reasoning: ['Node name indicates section type']
        });
    }
    
    // Position-based classification
    if (factors.position) {
        if (factors.position.isTopLevel) {
            candidates.push({
                type: 'header',
                confidence: 0.7,
                reasoning: ['Positioned in top area of screen']
            });
        } else if (factors.position.isBottomLevel) {
            candidates.push({
                type: 'footer',
                confidence: 0.7,
                reasoning: ['Positioned in bottom area of screen']
            });
        }
    }
    
    // Styling-based classification
    if (factors.styling.buttonLike > 0.6 && factors.siblings?.hasMultipleButtons) {
        candidates.push({
            type: 'navigation',
            confidence: 0.6,
            reasoning: ['Multiple button-like elements suggest navigation']
        });
    }
    
    // Apply confidence threshold
    const highConfidenceCandidates = candidates.filter(c => c.confidence >= 0.6);
    
    if (highConfidenceCandidates.length === 0) {
        return {
            type: 'content',
            confidence: 0.5,
            reasoning: ['Default classification - insufficient confidence in alternatives']
        };
    }
    
    // Return best match
    highConfidenceCandidates.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = highConfidenceCandidates[0];
    
    return {
        type: bestMatch.type,
        confidence: bestMatch.confidence,
        reasoning: bestMatch.reasoning
    };
}

/**
 * Analyze sibling context for section detection
 */
function analyzeSiblingContext(siblings: any[]): {hasMultipleButtons: boolean; hasNavigation: boolean} {
    const buttonLikeSiblings = siblings.filter(sibling => {
        const name = sibling.name?.toLowerCase() || '';
        return name.includes('button') || name.includes('btn') || name.includes('tab');
    });
    
    const navigationSiblings = siblings.filter(sibling => {
        const name = sibling.name?.toLowerCase() || '';
        return name.includes('nav') || name.includes('menu') || name.includes('link');
    });
    
    return {
        hasMultipleButtons: buttonLikeSiblings.length >= 2,
        hasNavigation: navigationSiblings.length > 0
    };
}

/**
 * Generate semantic context from component hierarchy
 */
export function generateSemanticContext(
    node: any,
    parent?: any,
    siblings?: any[]
): SemanticContext {
    const parentName = parent?.name?.toLowerCase() || '';
    const siblingTypes = siblings?.map(s => s.type) || [];
    
    // Determine screen position
    let screenPosition: SemanticContext['screenPosition'] = 'unknown';
    if (parent?.absoluteBoundingBox) {
        const relativeY = (node.absoluteBoundingBox?.y || 0) - parent.absoluteBoundingBox.y;
        const parentHeight = parent.absoluteBoundingBox.height;
        
        if (relativeY < parentHeight * 0.15) screenPosition = 'header';
        else if (relativeY > parentHeight * 0.85) screenPosition = 'footer';
        else screenPosition = 'content';
    }
    
    // Determine component type
    let componentType: SemanticContext['componentType'] = 'unknown';
    if (parentName.includes('form') || parentName.includes('input')) componentType = 'form';
    else if (parentName.includes('nav') || parentName.includes('menu')) componentType = 'navigation';
    else if (parentName.includes('card') || parentName.includes('item')) componentType = 'card';
    else if (parentName.includes('button') && siblings?.length) componentType = 'button-group';
    else componentType = 'content';
    
    // Detect actionable neighbors
    const hasActionableNeighbors = siblings?.some(sibling => {
        const name = sibling.name?.toLowerCase() || '';
        return name.includes('button') || name.includes('link') || name.includes('nav');
    }) || false;
    
    return {
        parentType: parent?.type,
        siblingTypes,
        screenPosition,
        componentType,
        layoutDirection: parent?.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
        hasActionableNeighbors
    };
}
