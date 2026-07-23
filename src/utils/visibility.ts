import type {FigmaNode} from '../types/figma.js';

/**
 * Whether the node itself is explicitly hidden in Figma (`visible: false`).
 * Missing `visible` means visible (Figma REST default).
 */
export function isNodeExplicitlyHidden(node: Pick<FigmaNode, 'visible'>): boolean {
    return node.visible === false;
}

/**
 * Whether the node has its own drawn content (text / visible fills / strokes),
 * independent of children.
 */
export function hasOwnVisualContent(node: FigmaNode): boolean {
    if (node.type === 'TEXT' && typeof (node as any).characters === 'string') {
        return (node as any).characters.length > 0;
    }

    const fills = node.fills || [];
    if (fills.some((fill: any) =>
        fill.visible !== false &&
        (fill.type === 'SOLID' ||
            fill.type === 'IMAGE' ||
            fill.type === 'GRADIENT_LINEAR' ||
            fill.type === 'GRADIENT_RADIAL' ||
            fill.type === 'GRADIENT_ANGULAR' ||
            fill.type === 'GRADIENT_DIAMOND')
    )) {
        return true;
    }

    const strokes = node.strokes || [];
    return strokes.some((stroke: any) => stroke.visible !== false);
}

/**
 * Effective visibility for Flutter evidence:
 * - `visible: false` nodes are excluded (unless includeHidden)
 * - containers whose children are all hidden AND that have no own visual
 *   content are excluded (covers App Bar icon slots with hidden icons)
 */
export function isEffectivelyVisible(
    node: FigmaNode,
    includeHidden: boolean = false
): boolean {
    if (!includeHidden && isNodeExplicitlyHidden(node)) {
        return false;
    }

    if (!node.children || node.children.length === 0) {
        return true;
    }

    const hasVisibleChild = node.children.some((child) =>
        isEffectivelyVisible(child, includeHidden)
    );
    if (hasVisibleChild) {
        return true;
    }

    return hasOwnVisualContent(node);
}

/**
 * Filter children for analysis / inspect output.
 */
export function filterEffectivelyVisibleChildren(
    children: FigmaNode[] | undefined,
    includeHidden: boolean = false
): FigmaNode[] {
    if (!children || children.length === 0) {
        return [];
    }
    if (includeHidden) {
        return children;
    }
    return children.filter((child) => isEffectivelyVisible(child, false));
}
