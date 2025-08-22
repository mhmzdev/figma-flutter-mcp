// // src/extractors/theme-frame-extractor.mts
// import type {FigmaNode} from '../types/figma.mjs';

// export interface ThemeColor {
//     name: string;
//     hex: string;
//     nodeId: string;
// }

// export class ThemeFrameExtractor {
//     /**
//      * Extract colors from a theme frame containing color swatches with text labels
//      */
//     extractColorsFromThemeFrame(frameNode: FigmaNode): ThemeColor[] {
//         const colors: ThemeColor[] = [];

//         // Find all child nodes in the frame
//         if (!frameNode.children) {
//             return colors;
//         }

//         // Look for color swatches (rectangles/frames) with text labels
//         frameNode.children.forEach(child => {
//             const colorInfo = this.extractColorFromNode(child);
//             if (colorInfo) {
//                 colors.push(colorInfo);
//             }
//         });

//         return colors;
//     }

//     private extractColorFromNode(node: FigmaNode): ThemeColor | null {
//         // Check if this node has a solid fill (color swatch)
//         const colorHex = this.getNodeColor(node);
//         if (!colorHex) {
//             return null;
//         }

//         // Get the color name from the node name or any text children
//         const colorName = this.getColorName(node);
//         if (!colorName) {
//             return null;
//         }

//         return {
//             name: colorName,
//             hex: colorHex,
//             nodeId: node.id
//         };
//     }

//     private getNodeColor(node: FigmaNode): string | null {
//         // Check node fills for solid color
//         if (node.fills && Array.isArray(node.fills)) {
//             for (const fill of node.fills) {
//                 if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
//                     return this.rgbaToHex(fill.color);
//                 }
//             }
//         }

//         // Check children for color rectangles/frames
//         if (node.children) {
//             for (const child of node.children) {
//                 if (child.type === 'RECTANGLE' || child.type === 'FRAME') {
//                     const childColor = this.getNodeColor(child);
//                     if (childColor) {
//                         return childColor;
//                     }
//                 }
//             }
//         }

//         return null;
//     }

//     private getColorName(node: FigmaNode): string | null {
//         // First, try to get name from text children
//         const textName = this.findTextInNode(node);
//         if (textName) {
//             return this.cleanColorName(textName);
//         }

//         // Fallback to node name if it looks like a color name
//         if (node.name && this.isColorName(node.name)) {
//             return this.cleanColorName(node.name);
//         }

//         return null;
//     }

//     private findTextInNode(node: FigmaNode): string | null {
//         // Check if this node is text
//         if (node.type === 'TEXT' && node.name) {
//             return node.name;
//         }

//         // Check children for text nodes
//         if (node.children) {
//             for (const child of node.children) {
//                 if (child.type === 'TEXT' && child.name) {
//                     return child.name;
//                 }
//                 // Recursively check nested children
//                 const nestedText = this.findTextInNode(child);
//                 if (nestedText) {
//                     return nestedText;
//                 }
//             }
//         }

//         return null;
//     }

//     private isColorName(name: string): boolean {
//         const colorKeywords = [
//             'primary', 'secondary', 'accent', 'background', 'surface',
//             'text', 'foreground', 'danger', 'error', 'success', 'warning',
//             'info', 'light', 'dark', 'grey', 'gray', 'white', 'black'
//         ];

//         const lowerName = name.toLowerCase();
//         return colorKeywords.some(keyword => lowerName.includes(keyword));
//     }

//     private cleanColorName(name: string): string {
//         // Remove common prefixes and clean up the name
//         return name
//             .replace(/^(color|Color)[\s\-_]*/i, '')
//             .replace(/[\s\-_]*(color|Color)$/i, '')
//             .trim()
//             .replace(/\s+/g, ' ')
//             .split(' ')
//             .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//             .join('');
//     }

//     private rgbaToHex(color: {r: number; g: number; b: number; a?: number}): string {
//         const r = Math.round(color.r * 255);
//         const g = Math.round(color.g * 255);
//         const b = Math.round(color.b * 255);

//         return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
//     }
// }