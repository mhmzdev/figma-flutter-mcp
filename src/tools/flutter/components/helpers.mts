import type {ComponentVariant} from "../../../extractors/components/types.mjs";
import type {ComponentAnalysis} from "../../../extractors/components/types.mjs";
import {generateFlutterTextWidget} from "../../../extractors/components/extractor.mjs";

/**
 * Generate variant selection prompt when there are more than 3 variants
 */
export function generateVariantSelectionPrompt(
    componentName: string,
    selectionInfo: any,
    variants: ComponentVariant[]
): string {
    let output = `Component Set "${componentName}" has ${selectionInfo.totalCount} variants.\n\n`;
    output += `Since there are more than 3 variants, please specify which ones to analyze.\n\n`;

    output += `Available variants:\n`;
    variants.forEach((variant, index) => {
        const defaultMark = variant.isDefault ? ' (default)' : '';
        output += `${index + 1}. ${variant.name}${defaultMark}\n`;
    });

    output += `\nVariant properties:\n`;
    Object.entries(selectionInfo.variantProperties).forEach(([prop, values]: [string, any]) => {
        output += `- ${prop}: ${Array.from(values).join(', ')}\n`;
    });

    if (selectionInfo.defaultVariant) {
        output += `\nDefault variant: ${selectionInfo.defaultVariant.name}\n`;
    }

    output += `\nTo analyze specific variants, run the tool again with:\n`;
    output += `variantSelection: ["variant name 1", "variant name 2"]\n\n`;
    output += `Or to analyze all variants (may be token-intensive):\n`;
    output += `variantSelection: ${JSON.stringify(variants.slice(0, 3).map(v => v.name))}\n`;

    return output;
}

/**
 * Generate comprehensive component analysis report
 */
export function generateComponentAnalysisReport(
    analysis: ComponentAnalysis,
    variantAnalysis?: ComponentVariant[],
    selectedVariants?: ComponentVariant[],
    parsedInput?: any
): string {
    let output = `Component Analysis Report\n\n`;

    // Component metadata
    output += `Component: ${analysis.metadata.name}\n`;
    output += `Type: ${analysis.metadata.type}\n`;
    output += `Node ID: ${analysis.metadata.nodeId}\n`;
    if (parsedInput) {
        output += `Source: ${parsedInput.source === 'url' ? 'Figma URL' : 'Direct input'}\n`;
    }
    output += `\n`;

    // Variant information
    if (variantAnalysis && variantAnalysis.length > 0) {
        output += `Variants Analysis:\n`;
        if (selectedVariants && selectedVariants.length > 0) {
            output += `Analyzed variants (${selectedVariants.length} of ${variantAnalysis.length}):\n`;
            selectedVariants.forEach(variant => {
                const defaultMark = variant.isDefault ? ' (default)' : '';
                output += `- ${variant.name}${defaultMark}\n`;
            });
        } else {
            output += `Total variants: ${variantAnalysis.length}\n`;
        }
        output += `\n`;
    }

    // Layout information
    output += `Layout Structure:\n`;
    output += `- Type: ${analysis.layout.type}\n`;
    output += `- Dimensions: ${Math.round(analysis.layout.dimensions.width)}×${Math.round(analysis.layout.dimensions.height)}px\n`;

    if (analysis.layout.direction) {
        output += `- Direction: ${analysis.layout.direction}\n`;
    }
    if (analysis.layout.spacing !== undefined) {
        output += `- Spacing: ${analysis.layout.spacing}px\n`;
    }
    if (analysis.layout.padding) {
        const p = analysis.layout.padding;
        if (p.isUniform) {
            output += `- Padding: ${p.top}px (uniform)\n`;
        } else {
            output += `- Padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px\n`;
        }
    }
    if (analysis.layout.alignItems) {
        output += `- Align Items: ${analysis.layout.alignItems}\n`;
    }
    if (analysis.layout.justifyContent) {
        output += `- Justify Content: ${analysis.layout.justifyContent}\n`;
    }
    output += `\n`;

    // Styling information
    output += `Visual Styling:\n`;
    if (analysis.styling.fills && analysis.styling.fills.length > 0) {
        const fill = analysis.styling.fills[0];
        output += `- Background: ${fill.hex || fill.type}`;
        if (fill.opacity && fill.opacity !== 1) {
            output += ` (${Math.round(fill.opacity * 100)}% opacity)`;
        }
        output += `\n`;
    }
    if (analysis.styling.strokes && analysis.styling.strokes.length > 0) {
        const stroke = analysis.styling.strokes[0];
        output += `- Border: ${stroke.weight}px solid ${stroke.hex}\n`;
    }
    if (analysis.styling.cornerRadius !== undefined) {
        if (typeof analysis.styling.cornerRadius === 'number') {
            output += `- Corner radius: ${analysis.styling.cornerRadius}px\n`;
        } else {
            const r = analysis.styling.cornerRadius;
            output += `- Corner radius: ${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px\n`;
        }
    }
    if (analysis.styling.opacity && analysis.styling.opacity !== 1) {
        output += `- Opacity: ${Math.round(analysis.styling.opacity * 100)}%\n`;
    }

    // Effects (shadows, blurs)
    if (analysis.styling.effects) {
        const effects = analysis.styling.effects;
        if (effects.dropShadows.length > 0) {
            effects.dropShadows.forEach((shadow, index) => {
                output += `- Drop shadow ${index + 1}: ${shadow.hex} offset(${shadow.offset.x}, ${shadow.offset.y}) blur ${shadow.radius}px`;
                if (shadow.spread) {
                    output += ` spread ${shadow.spread}px`;
                }
                output += `\n`;
            });
        }
        if (effects.innerShadows.length > 0) {
            output += `- Inner shadows: ${effects.innerShadows.length} effect(s)\n`;
        }
        if (effects.blurs.length > 0) {
            output += `- Blur effects: ${effects.blurs.length} effect(s)\n`;
        }
    }
    output += `\n`;

    // Children information
    if (analysis.children.length > 0) {
        output += `Child Elements (${analysis.children.length} analyzed):\n`;
        analysis.children.forEach((child, index) => {
            const componentMark = child.isNestedComponent ? ' [COMPONENT]' : '';
            const importanceMark = ` (priority: ${child.visualImportance}/10)`;
            output += `${index + 1}. ${child.name} (${child.type})${componentMark}${importanceMark}\n`;

            if (child.basicInfo?.layout?.dimensions) {
                const dims = child.basicInfo.layout.dimensions;
                output += `   Size: ${Math.round(dims.width)}×${Math.round(dims.height)}px\n`;
            }

            if (child.basicInfo?.styling?.fills && child.basicInfo.styling.fills.length > 0) {
                output += `   Background: ${child.basicInfo.styling.fills[0].hex}\n`;
            }

            if (child.basicInfo?.text) {
                const textInfo = child.basicInfo.text;
                const placeholderMark = textInfo.isPlaceholder ? ' [PLACEHOLDER]' : '';
                const semanticMark = textInfo.semanticType && textInfo.semanticType !== 'other' ? ` [${textInfo.semanticType.toUpperCase()}]` : '';

                output += `   Text Content: "${textInfo.content}"${placeholderMark}${semanticMark}\n`;

                if (textInfo.fontFamily || textInfo.fontSize || textInfo.fontWeight) {
                    const fontParts = [];
                    if (textInfo.fontFamily) fontParts.push(textInfo.fontFamily);
                    if (textInfo.fontSize) fontParts.push(`${textInfo.fontSize}px`);
                    if (textInfo.fontWeight && textInfo.fontWeight !== 400) fontParts.push(`weight: ${textInfo.fontWeight}`);
                    output += `   Typography: ${fontParts.join(' ')}\n`;
                }

                if (textInfo.textCase && textInfo.textCase !== 'mixed') {
                    output += `   Text Case: ${textInfo.textCase}\n`;
                }
            }
        });
        output += `\n`;
    }

    // Nested components for separate analysis
    if (analysis.nestedComponents.length > 0) {
        output += `Nested Components Found (${analysis.nestedComponents.length}):\n`;
        output += `These components should be analyzed separately to maintain reusability:\n`;
        analysis.nestedComponents.forEach((comp, index) => {
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
        output += `${analysis.skippedNodes.length} nodes were skipped due to the maxChildNodes limit:\n`;
        analysis.skippedNodes.forEach((skipped, index) => {
            output += `${index + 1}. ${skipped.name} (${skipped.type})\n`;
        });
        output += `\nTo analyze all nodes, increase the maxChildNodes parameter.\n\n`;
    }

    // Flutter implementation guidance
    output += generateFlutterGuidance(analysis);

    return output;
}

/**
 * Generate Flutter implementation guidance
 */
export function generateFlutterGuidance(analysis: ComponentAnalysis): string {
    let guidance = `Flutter Implementation Guidance:\n\n`;

    // Main container guidance
    guidance += `Main Widget Structure:\n`;
    if (analysis.layout.type === 'auto-layout') {
        const containerWidget = analysis.layout.direction === 'horizontal' ? 'Row' : 'Column';
        guidance += `- Use ${containerWidget}() as the main layout widget\n`;

        if (analysis.layout.spacing && analysis.layout.spacing > 0) {
            const spacingWidget = analysis.layout.direction === 'horizontal' ? 'width' : 'height';
            guidance += `- Add spacing with SizedBox(${spacingWidget}: ${analysis.layout.spacing})\n`;
        }

        if (analysis.layout.alignItems) {
            guidance += `- CrossAxisAlignment: ${mapFigmaToFlutterAlignment(analysis.layout.alignItems)}\n`;
        }
        if (analysis.layout.justifyContent) {
            guidance += `- MainAxisAlignment: ${mapFigmaToFlutterAlignment(analysis.layout.justifyContent)}\n`;
        }
    } else {
        guidance += `- Use Container() or Stack() for layout\n`;
    }

    // Styling guidance
    if (hasVisualStyling(analysis.styling)) {
        guidance += `\nContainer Decoration:\n`;
        guidance += `Container(\n`;
        guidance += `  decoration: BoxDecoration(\n`;

        if (analysis.styling.fills && analysis.styling.fills.length > 0) {
            const fill = analysis.styling.fills[0];
            if (fill.hex) {
                guidance += `    color: Color(0xFF${fill.hex.substring(1)}),\n`;
            }
        }

        if (analysis.styling.strokes && analysis.styling.strokes.length > 0) {
            const stroke = analysis.styling.strokes[0];
            guidance += `    border: Border.all(\n`;
            guidance += `      color: Color(0xFF${stroke.hex.substring(1)}),\n`;
            guidance += `      width: ${stroke.weight},\n`;
            guidance += `    ),\n`;
        }

        if (analysis.styling.cornerRadius !== undefined) {
            if (typeof analysis.styling.cornerRadius === 'number') {
                guidance += `    borderRadius: BorderRadius.circular(${analysis.styling.cornerRadius}),\n`;
            } else {
                const r = analysis.styling.cornerRadius;
                guidance += `    borderRadius: BorderRadius.only(\n`;
                guidance += `      topLeft: Radius.circular(${r.topLeft}),\n`;
                guidance += `      topRight: Radius.circular(${r.topRight}),\n`;
                guidance += `      bottomLeft: Radius.circular(${r.bottomLeft}),\n`;
                guidance += `      bottomRight: Radius.circular(${r.bottomRight}),\n`;
                guidance += `    ),\n`;
            }
        }

        if (analysis.styling.effects?.dropShadows.length) {
            guidance += `    boxShadow: [\n`;
            analysis.styling.effects.dropShadows.forEach(shadow => {
                guidance += `      BoxShadow(\n`;
                guidance += `        color: Color(0xFF${shadow.hex.substring(1)}).withOpacity(${shadow.opacity.toFixed(2)}),\n`;
                guidance += `        offset: Offset(${shadow.offset.x}, ${shadow.offset.y}),\n`;
                guidance += `        blurRadius: ${shadow.radius},\n`;
                if (shadow.spread) {
                    guidance += `        spreadRadius: ${shadow.spread},\n`;
                }
                guidance += `      ),\n`;
            });
            guidance += `    ],\n`;
        }

        guidance += `  ),\n`;

        if (analysis.layout.padding) {
            const p = analysis.layout.padding;
            if (p.isUniform) {
                guidance += `  padding: EdgeInsets.all(${p.top}),\n`;
            } else {
                guidance += `  padding: EdgeInsets.fromLTRB(${p.left}, ${p.top}, ${p.right}, ${p.bottom}),\n`;
            }
        }

        guidance += `  child: /* Your content here */\n`;
        guidance += `)\n\n`;
    }

    // Component organization guidance
    if (analysis.nestedComponents.length > 0) {
        guidance += `Component Architecture:\n`;
        guidance += `Create separate widget classes for reusability:\n`;
        analysis.nestedComponents.forEach((comp, index) => {
            const widgetName = toPascalCase(comp.name);
            guidance += `${index + 1}. ${widgetName}() - Node ID: ${comp.nodeId}\n`;
        });
        guidance += `\nAnalyze each nested component separately using the analyze_figma_component tool.\n\n`;
    }

    // Text widget guidance with enhanced Flutter suggestions
    const textChildren = analysis.children.filter(child => child.type === 'TEXT');
    if (textChildren.length > 0) {
        guidance += `Text Elements & Flutter Widgets:\n`;
        textChildren.forEach((textChild, index) => {
            const textInfo = textChild.basicInfo?.text;
            if (textInfo) {
                // Import the generateFlutterTextWidget function result
                const widgetSuggestion = generateFlutterTextWidget(textInfo);
                const placeholderNote = textInfo.isPlaceholder ? ' // Placeholder text - replace with actual content' : '';
                const semanticNote = textInfo.semanticType && textInfo.semanticType !== 'other' ? ` // Detected as ${textInfo.semanticType}` : '';

                guidance += `${index + 1}. "${textInfo.content}"${placeholderNote}${semanticNote}\n`;
                guidance += `   Flutter Widget:\n`;

                // Indent the widget suggestion
                const indentedWidget = widgetSuggestion.split('\n').map(line => `   ${line}`).join('\n');
                guidance += `${indentedWidget}\n\n`;
            } else {
                guidance += `${index + 1}. Text('${textChild.name}') // No text info available\n\n`;
            }
        });
    }

    return guidance;
}

/**
 * Generate structure inspection report
 */
export function generateStructureInspectionReport(node: any, showAllChildren: boolean): string {
    let output = `Component Structure Inspection\n\n`;

    output += `Component: ${node.name}\n`;
    output += `Type: ${node.type}\n`;
    output += `Node ID: ${node.id}\n`;
    output += `Children: ${node.children?.length || 0}\n`;

    if (node.absoluteBoundingBox) {
        const bbox = node.absoluteBoundingBox;
        output += `Dimensions: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px\n`;
    }

    output += `\n`;

    if (!node.children || node.children.length === 0) {
        output += `This component has no children.\n`;
        return output;
    }

    output += `Child Structure:\n`;

    const childrenToShow = showAllChildren ? node.children : node.children.slice(0, 15);
    const hasMore = node.children.length > childrenToShow.length;

    childrenToShow.forEach((child: any, index: number) => {
        const isComponent = child.type === 'COMPONENT' || child.type === 'INSTANCE';
        const componentMark = isComponent ? ' [COMPONENT]' : '';
        const hiddenMark = child.visible === false ? ' [HIDDEN]' : '';

        output += `${index + 1}. ${child.name} (${child.type})${componentMark}${hiddenMark}\n`;

        if (child.absoluteBoundingBox) {
            const bbox = child.absoluteBoundingBox;
            output += `   Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px\n`;
        }

        if (child.children && child.children.length > 0) {
            output += `   Contains: ${child.children.length} child nodes\n`;
        }

        // Show basic styling info
        if (child.fills && child.fills.length > 0) {
            const fill = child.fills[0];
            if (fill.color) {
                const hex = rgbaToHex(fill.color);
                output += `   Background: ${hex}\n`;
            }
        }
    });

    if (hasMore) {
        output += `\n... and ${node.children.length - childrenToShow.length} more children.\n`;
        output += `Use showAllChildren: true to see all children.\n`;
    }

    // Analysis recommendations
    output += `\nAnalysis Recommendations:\n`;
    const componentChildren = node.children.filter((child: any) =>
        child.type === 'COMPONENT' || child.type === 'INSTANCE'
    );

    if (componentChildren.length > 0) {
        output += `- Found ${componentChildren.length} nested components for separate analysis\n`;
    }

    const largeChildren = node.children.filter((child: any) => {
        const bbox = child.absoluteBoundingBox;
        return bbox && (bbox.width * bbox.height) > 5000;
    });

    if (largeChildren.length > 3) {
        output += `- Component has ${largeChildren.length} large children - consider increasing maxChildNodes\n`;
    }

    const textChildren = node.children.filter((child: any) => child.type === 'TEXT');
    if (textChildren.length > 0) {
        output += `- Found ${textChildren.length} text nodes for content extraction\n`;
    }

    return output;
}

// Helper functions
export function mapFigmaToFlutterAlignment(alignment: string): string {
    const alignmentMap: Record<string, string> = {
        'MIN': 'CrossAxisAlignment.start',
        'CENTER': 'CrossAxisAlignment.center',
        'MAX': 'CrossAxisAlignment.end',
        'SPACE_BETWEEN': 'MainAxisAlignment.spaceBetween',
        'SPACE_AROUND': 'MainAxisAlignment.spaceAround',
        'SPACE_EVENLY': 'MainAxisAlignment.spaceEvenly'
    };

    return alignmentMap[alignment] || 'CrossAxisAlignment.center';
}

export function hasVisualStyling(styling: any): boolean {
    return !!(styling.fills?.length || styling.strokes?.length ||
        styling.cornerRadius !== undefined || styling.effects?.dropShadows?.length);
}

export function toPascalCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .replace(/\s/g, '');
}

export function rgbaToHex(color: {r: number; g: number; b: number; a?: number}): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}