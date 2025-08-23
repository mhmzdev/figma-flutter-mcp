// src/extractors/components/variant-analyzer.mts

import type {FigmaNode} from '../../types/figma.mjs';
import type {ComponentVariant} from './types.mjs';

/**
 * Variant analysis for ComponentSets
 */
export class VariantAnalyzer {

    /**
     * Analyze component set and extract all variants
     */
    async analyzeComponentSet(componentSetNode: FigmaNode): Promise<ComponentVariant[]> {
        if (componentSetNode.type !== 'COMPONENT_SET') {
            throw new Error('Node is not a COMPONENT_SET');
        }

        const variants: ComponentVariant[] = [];

        if (!componentSetNode.children || componentSetNode.children.length === 0) {
            return variants;
        }

        // Process each variant (child component)
        componentSetNode.children.forEach(child => {
            if (child.type === 'COMPONENT') {
                const variant = this.extractVariantInfo(child);
                variants.push(variant);
            }
        });

        // Determine default variant
        const defaultVariant = this.determineDefaultVariant(variants);
        if (defaultVariant) {
            variants.forEach(variant => {
                variant.isDefault = variant.nodeId === defaultVariant.nodeId;
            });
        }

        return variants;
    }

    /**
     * Extract variant information from a component node
     */
    private extractVariantInfo(componentNode: FigmaNode): ComponentVariant {
        const nodeAny = componentNode as any;

        return {
            nodeId: componentNode.id,
            name: componentNode.name,
            properties: this.parseVariantProperties(componentNode.name),
            isDefault: false // Will be set later by determineDefaultVariant
        };
    }

    /**
     * Parse variant properties from component name
     * Figma variant names are typically in format: "Property=Value, Property2=Value2"
     */
    private parseVariantProperties(componentName: string): Record<string, string> {
        const properties: Record<string, string> = {};

        try {
            // Split by comma to get individual property=value pairs
            const pairs = componentName.split(',').map(pair => pair.trim());

            pairs.forEach(pair => {
                const [property, value] = pair.split('=').map(str => str.trim());
                if (property && value) {
                    properties[property] = value;
                }
            });

            // If no properties found, treat the whole name as a single property
            if (Object.keys(properties).length === 0) {
                properties['variant'] = componentName;
            }

        } catch (error) {
            // Fallback: treat component name as single variant property
            properties['variant'] = componentName;
        }

        return properties;
    }

    /**
     * Determine which variant should be considered the default
     */
    determineDefaultVariant(variants: ComponentVariant[]): ComponentVariant | null {
        if (variants.length === 0) {
            return null;
        }

        // Strategy 1: Look for variants with "default" in name or properties
        const defaultByName = variants.find(variant =>
            variant.name.toLowerCase().includes('default') ||
            Object.values(variant.properties).some(value =>
                value.toLowerCase().includes('default')
            )
        );

        if (defaultByName) {
            return defaultByName;
        }

        // Strategy 2: Look for variants with "primary" in name or properties
        const primaryVariant = variants.find(variant =>
            variant.name.toLowerCase().includes('primary') ||
            Object.values(variant.properties).some(value =>
                value.toLowerCase().includes('primary')
            )
        );

        if (primaryVariant) {
            return primaryVariant;
        }

        // Strategy 3: Look for common default-like values
        const defaultValues = ['normal', 'regular', 'medium', 'enabled', 'active', 'standard'];
        const defaultByValue = variants.find(variant =>
            Object.values(variant.properties).some(value =>
                defaultValues.includes(value.toLowerCase())
            )
        );

        if (defaultByValue) {
            return defaultByValue;
        }

        // Strategy 4: Look for first variant that has state=enabled, type=primary, etc.
        const prioritizedVariant = variants.find(variant => {
            const props = variant.properties;
            return (
                (props.state && props.state.toLowerCase() === 'enabled') ||
                (props.type && props.type.toLowerCase() === 'primary') ||
                (props.size && props.size.toLowerCase() === 'medium')
            );
        });

        if (prioritizedVariant) {
            return prioritizedVariant;
        }

        // Fallback: Return first variant
        return variants[0];
    }

    /**
     * Check if variant selection should be prompted to user
     */
    shouldPromptForVariantSelection(variants: ComponentVariant[]): boolean {
        return variants.length > 3;
    }

    /**
     * Get variant selection prompt information
     */
    getVariantSelectionInfo(variants: ComponentVariant[]): {
        totalCount: number;
        variantNames: string[];
        variantProperties: Record<string, Set<string>>;
        defaultVariant?: ComponentVariant;
    } {
        const variantNames = variants.map(v => v.name);
        const defaultVariant = variants.find(v => v.isDefault);

        // Collect all unique property keys and their possible values
        const variantProperties: Record<string, Set<string>> = {};

        variants.forEach(variant => {
            Object.entries(variant.properties).forEach(([key, value]) => {
                if (!variantProperties[key]) {
                    variantProperties[key] = new Set();
                }
                variantProperties[key].add(value);
            });
        });

        return {
            totalCount: variants.length,
            variantNames,
            variantProperties,
            defaultVariant
        };
    }

    /**
     * Filter variants by user selection criteria
     */
    filterVariantsBySelection(
        variants: ComponentVariant[],
        selection: {
            variantNames?: string[];
            properties?: Record<string, string>;
            includeDefault?: boolean;
        }
    ): ComponentVariant[] {
        let filtered = variants;

        // Filter by variant names if specified
        if (selection.variantNames && selection.variantNames.length > 0) {
            filtered = filtered.filter(variant =>
                selection.variantNames!.some(name =>
                    variant.name.toLowerCase().includes(name.toLowerCase())
                )
            );
        }

        // Filter by specific properties if specified
        if (selection.properties && Object.keys(selection.properties).length > 0) {
            filtered = filtered.filter(variant => {
                return Object.entries(selection.properties!).every(([key, value]) => {
                    return variant.properties[key] &&
                        variant.properties[key].toLowerCase() === value.toLowerCase();
                });
            });
        }

        // Include default if requested
        if (selection.includeDefault) {
            const defaultVariant = variants.find(v => v.isDefault);
            if (defaultVariant && !filtered.includes(defaultVariant)) {
                filtered.push(defaultVariant);
            }
        }

        return filtered;
    }

    /**
     * Compare variants to identify differences
     * Useful for understanding what changes between variants
     */
    compareVariants(variants: ComponentVariant[]): {
        commonProperties: Record<string, string>;
        differentProperties: Record<string, Set<string>>;
        uniqueProperties: Record<string, Record<string, string>>;
    } {
        const commonProperties: Record<string, string> = {};
        const differentProperties: Record<string, Set<string>> = {};
        const uniqueProperties: Record<string, Record<string, string>> = {};

        if (variants.length === 0) {
            return {commonProperties, differentProperties, uniqueProperties};
        }

        // Get all property keys from all variants
        const allPropertyKeys = new Set<string>();
        variants.forEach(variant => {
            Object.keys(variant.properties).forEach(key => allPropertyKeys.add(key));
        });

        // Analyze each property
        allPropertyKeys.forEach(propertyKey => {
            const values = new Set<string>();
            const variantsByValue: Record<string, string[]> = {};

            variants.forEach(variant => {
                const value = variant.properties[propertyKey];
                if (value) {
                    values.add(value);
                    if (!variantsByValue[value]) {
                        variantsByValue[value] = [];
                    }
                    variantsByValue[value].push(variant.name);
                }
            });

            // If all variants have the same value for this property, it's common
            if (values.size === 1 && variants.every(v => v.properties[propertyKey])) {
                commonProperties[propertyKey] = Array.from(values)[0];
            }
            // If variants have different values, it's a differentiating property
            else if (values.size > 1) {
                differentProperties[propertyKey] = values;
            }
            // If only some variants have this property, it's unique to those variants
            else {
                variants.forEach(variant => {
                    if (variant.properties[propertyKey]) {
                        if (!uniqueProperties[variant.name]) {
                            uniqueProperties[variant.name] = {};
                        }
                        uniqueProperties[variant.name][propertyKey] = variant.properties[propertyKey];
                    }
                });
            }
        });

        return {commonProperties, differentProperties, uniqueProperties};
    }

    /**
     * Generate summary of variant analysis
     */
    generateVariantSummary(variants: ComponentVariant[]): string {
        if (variants.length === 0) {
            return 'No variants found in component set.';
        }

        const defaultVariant = variants.find(v => v.isDefault);
        const comparison = this.compareVariants(variants);

        let summary = `Found ${variants.length} variants:\n`;

        // List all variants
        variants.forEach((variant, index) => {
            const defaultMark = variant.isDefault ? ' (default)' : '';
            summary += `${index + 1}. ${variant.name}${defaultMark}\n`;
        });

        // Show differentiating properties
        if (Object.keys(comparison.differentProperties).length > 0) {
            summary += '\nVariant properties:\n';
            Object.entries(comparison.differentProperties).forEach(([prop, values]) => {
                summary += `- ${prop}: ${Array.from(values).join(', ')}\n`;
            });
        }

        // Show common properties
        if (Object.keys(comparison.commonProperties).length > 0) {
            summary += '\nShared properties:\n';
            Object.entries(comparison.commonProperties).forEach(([prop, value]) => {
                summary += `- ${prop}: ${value}\n`;
            });
        }

        return summary;
    }
}