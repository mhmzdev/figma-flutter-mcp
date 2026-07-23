import type { FigmaNode, FigmaStroke } from '../types/figma.js';
import type {
    PaddingInfo,
    StylingInfo,
    StrokeInfo,
    CornerRadii,
    LayoutInfo
} from '../extractors/components/types.js';
import { rgbaToHex } from '../extractors/components/extractor.js';

/**
 * Format padding for MCP text reports. Emits nothing when absent/zero.
 */
export function formatPadding(
    padding: PaddingInfo | undefined,
    indent: string = ''
): string {
    if (!padding) {
        return '';
    }

    const { top, right, bottom, left } = padding;
    if (top === 0 && right === 0 && bottom === 0 && left === 0) {
        return '';
    }

    if (padding.isUniform) {
        return `${indent}- Padding: ${top}px\n`;
    }

    return `${indent}- Padding: ${top}px ${right}px ${bottom}px ${left}px (TRBL)\n`;
}

/**
 * Format strokes / border including strokeAlign (e.g. INSIDE).
 */
export function formatStrokes(
    strokes: StrokeInfo[] | undefined,
    indent: string = '',
    cornerRadius?: number | CornerRadii
): string {
    if (!strokes || strokes.length === 0) {
        return '';
    }

    let output = '';
    strokes.forEach((stroke, index) => {
        const label = strokes.length > 1 ? ` ${index + 1}` : '';
        output += `${indent}- Border${label}: ${stroke.weight}px solid ${stroke.hex}`;
        if (stroke.align) {
            output += ` align ${stroke.align}`;
        }
        output += `\n`;
    });

    if (cornerRadius !== undefined) {
        output += formatCornerRadius(cornerRadius, indent);
    }

    return output;
}

export function formatCornerRadius(
    cornerRadius: number | CornerRadii | undefined,
    indent: string = ''
): string {
    if (cornerRadius === undefined) {
        return '';
    }

    if (typeof cornerRadius === 'number') {
        return `${indent}- Corner radius: ${cornerRadius}px\n`;
    }

    const r = cornerRadius;
    return `${indent}- Corner radius: ${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px\n`;
}

/**
 * Format extracted styling + layout padding for screen/component reports.
 */
export function formatVisualBoxEvidence(
    styling: Partial<StylingInfo> | undefined,
    layout: Partial<LayoutInfo> | undefined,
    indent: string = ''
): string {
    let output = '';
    output += formatPadding(layout?.padding, indent);
    output += formatStrokes(styling?.strokes, indent, styling?.cornerRadius);
    // Corner radius without strokes still matters for clips/fills.
    if ((!styling?.strokes || styling.strokes.length === 0) && styling?.cornerRadius !== undefined) {
        output += formatCornerRadius(styling.cornerRadius, indent);
    }
    return output;
}

/**
 * Format raw Figma node stroke/padding for inspect_screen_structure.
 */
export function formatFigmaNodeBoxEvidence(
    node: FigmaNode,
    indent: string = ''
): string {
    let output = '';

    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;
    if (top || right || bottom || left) {
        const isUniform = top === right && right === bottom && bottom === left;
        output += formatPadding({ top, right, bottom, left, isUniform }, indent);
    }

    const visibleStrokes = (node.strokes || []).filter(
        (s) => s.visible !== false && s.type === 'SOLID' && s.color
    );
    if (visibleStrokes.length > 0) {
        const strokes: StrokeInfo[] = visibleStrokes.map((stroke) =>
            strokePaintToStrokeInfo(stroke, node)
        );
        const cornerRadius =
            (node as FigmaNode & { cornerRadius?: number }).cornerRadius;
        output += formatStrokes(strokes, indent, cornerRadius);
    } else if ((node as FigmaNode & { cornerRadius?: number }).cornerRadius !== undefined) {
        output += formatCornerRadius(
            (node as FigmaNode & { cornerRadius?: number }).cornerRadius,
            indent
        );
    }

    return output;
}

export function strokePaintToStrokeInfo(
    stroke: FigmaStroke,
    node: FigmaNode
): StrokeInfo {
    return {
        type: stroke.type,
        color: stroke.color,
        hex: rgbaToHex(stroke.color),
        weight: node.strokeWeight ?? stroke.strokeWeight ?? 1,
        align: node.strokeAlign
    };
}
