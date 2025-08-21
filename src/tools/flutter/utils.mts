// tools/flutter/utils.mts
import type {FigmaColor, FigmaNode} from "../../types/figma.mjs";
import type {ScreenStructure} from "./types.mjs";

export function rgbaToHex(color: FigmaColor): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a === 1) {
        return `Color(0xFF${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')})`;
    }

    return `Color.fromRGBO(${r}, ${g}, ${b}, ${a})`;
}

export function getFontWeight(weight: number): string {
    const weights: {[key: number]: string} = {
        100: 'FontWeight.w100',
        200: 'FontWeight.w200',
        300: 'FontWeight.w300',
        400: 'FontWeight.w400',
        500: 'FontWeight.w500',
        600: 'FontWeight.w600',
        700: 'FontWeight.w700',
        800: 'FontWeight.w800',
        900: 'FontWeight.w900',
    };
    return weights[weight] || 'FontWeight.normal';
}

export function toSnakeCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
}

export function toPascalCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .replace(/\s/g, '');
}

export function isScreenNode(node: FigmaNode): boolean {
    const screenKeywords = ['screen', 'page', 'view', 'welcome', 'login', 'register', 'feed', 'profile', 'chat', 'home', 'settings'];
    const nodeName = node.name.toLowerCase();
    return screenKeywords.some(keyword => nodeName.includes(keyword));
}

export function isGlobalWidget(node: FigmaNode): boolean {
    const globalKeywords = ['button', 'component', 'card', 'input', 'header', 'footer', 'navbar', 'dialog', 'modal'];
    const nodeName = node.name.toLowerCase();
    return globalKeywords.some(keyword => nodeName.includes(keyword)) && !isScreenNode(node);
}

export function analyzeNodeStructure(node: FigmaNode): ScreenStructure {
    const nodeName = node.name;
    const isScreen = isScreenNode(node);
    const isGlobal = isGlobalWidget(node);

    let screenName = '';
    let relatedWidgets: string[] = [];

    if (isScreen) {
        screenName = toSnakeCase(nodeName.replace(/screen|page|view/i, '').trim());
        // Get child components as related widgets
        if (node.children) {
            relatedWidgets = node.children
                .filter(child => child.type !== 'TEXT' && child.name.length > 1)
                .map(child => toSnakeCase(child.name))
                .slice(0, 5); // Limit to 5 related widgets
        }
    }

    return {
        screenName: screenName || toSnakeCase(nodeName),
        mainWidget: nodeName,
        relatedWidgets,
        isGlobalWidget: isGlobal,
        isScreen
    };
}