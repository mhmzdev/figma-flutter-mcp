// tools/flutter/generators.mts
import type {FigmaNode} from "../../types/figma.mjs";
import {rgbaToHex, getFontWeight} from "./utils.mjs";

export function generateContainerWidget(node: FigmaNode): string {
    const bounds = node.absoluteBoundingBox;
    const fills = node.fills?.[0];

    let containerProps: string[] = [];

    if (bounds) {
        containerProps.push(`width: ${bounds.width}`);
        containerProps.push(`height: ${bounds.height}`);
    }

    let decoration = '';
    if (fills?.color) {
        decoration = `decoration: BoxDecoration(
      color: ${rgbaToHex(fills.color)},
      borderRadius: BorderRadius.circular(8),
    ),`;
    }

    let children = '';
    if (node.children && node.children.length > 0) {
        const childWidgets = node.children.slice(0, 3).map(child =>
            `// TODO: Add ${child.name} widget\n        Container(child: Text('${child.name}'))`
        );
        children = `child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ${childWidgets.join(',\n        ')}
      ],
    ),`;
    }

    const props = containerProps.length > 0 ? containerProps.join(',\n    ') + ',' : '';

    return `Container(
    ${props}
    padding: const EdgeInsets.all(16),
    ${decoration}
    ${children}
  )`;
}

export function generateTextWidget(node: FigmaNode): string {
    const style = node.style;
    const fills = node.fills?.[0];

    let textStyleProps: string[] = [];

    if (style?.fontSize) {
        textStyleProps.push(`fontSize: ${style.fontSize}`);
    }

    if (style?.fontWeight) {
        textStyleProps.push(`fontWeight: ${getFontWeight(style.fontWeight)}`);
    }

    if (style?.fontFamily) {
        textStyleProps.push(`fontFamily: '${style.fontFamily}'`);
    }

    if (fills?.color) {
        textStyleProps.push(`color: ${rgbaToHex(fills.color)}`);
    }

    const styleString = textStyleProps.length > 0 ?
        `style: TextStyle(
      ${textStyleProps.join(',\n      ')}
    ),` : '';

    return `Text(
    '${node.name}',
    ${styleString}
  )`;
}

export function generateRectangleWidget(node: FigmaNode): string {
    const bounds = node.absoluteBoundingBox;
    const fills = node.fills?.[0];

    let containerProps: string[] = [];

    if (bounds) {
        containerProps.push(`width: ${bounds.width}`);
        containerProps.push(`height: ${bounds.height}`);
    }

    let decoration = '';
    if (fills?.color) {
        decoration = `decoration: BoxDecoration(
      color: ${rgbaToHex(fills.color)},
      borderRadius: BorderRadius.circular(8),
    ),`;
    }

    const props = containerProps.length > 0 ? containerProps.join(',\n    ') + ',' : '';

    return `Container(
    ${props}
    ${decoration}
  )`;
}

export function generateCircleWidget(node: FigmaNode): string {
    const bounds = node.absoluteBoundingBox;
    const fills = node.fills?.[0];

    let size = 50;
    if (bounds) {
        size = Math.min(bounds.width, bounds.height);
    }

    let decoration = 'decoration: BoxDecoration(shape: BoxShape.circle';

    if (fills?.color) {
        decoration += `, color: ${rgbaToHex(fills.color)}`;
    }

    decoration += '),';

    return `Container(
    width: ${size},
    height: ${size},
    ${decoration}
  )`;
}

export function generateComponentWidget(node: FigmaNode): string {
    return generateContainerWidget(node);
}