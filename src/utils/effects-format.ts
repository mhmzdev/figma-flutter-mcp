import type { FigmaEffect } from '../types/figma.js';
import { categorizeEffects } from '../extractors/components/extractor.js';
import type { CategorizedEffects } from '../extractors/components/types.js';

/**
 * Format categorized effects for MCP text reports.
 * Source is node.effects (Figma API), not the Design panel label.
 */
export function formatCategorizedEffects(
    effects: CategorizedEffects | undefined,
    indent: string = ''
): string {
    if (!effects) {
        return '';
    }

    let output = '';

    effects.dropShadows.forEach((shadow, index) => {
        output += `${indent}- Drop shadow ${index + 1}: ${shadow.hex} ` +
            `opacity ${Math.round(shadow.opacity * 100)}% ` +
            `offset(${shadow.offset.x}, ${shadow.offset.y}) ` +
            `blur ${shadow.radius}px`;
        if (shadow.spread) {
            output += ` spread ${shadow.spread}px`;
        }
        output += `\n`;
    });

    effects.innerShadows.forEach((shadow, index) => {
        output += `${indent}- Inner shadow ${index + 1}: ${shadow.hex} ` +
            `opacity ${Math.round(shadow.opacity * 100)}% ` +
            `offset(${shadow.offset.x}, ${shadow.offset.y}) ` +
            `blur ${shadow.radius}px`;
        if (shadow.spread) {
            output += ` spread ${shadow.spread}px`;
        }
        output += `\n`;
    });

    effects.blurs.forEach((blur, index) => {
        output += `${indent}- Blur ${index + 1}: ${blur.type} radius ${blur.radius}px\n`;
    });

    return output;
}

/**
 * Format raw Figma effects array for structure-overview style reports.
 */
export function formatFigmaEffects(
    effects: FigmaEffect[] | undefined,
    indent: string = ''
): string {
    if (!effects || effects.length === 0) {
        return '';
    }

    return formatCategorizedEffects(categorizeEffects(effects), indent);
}
