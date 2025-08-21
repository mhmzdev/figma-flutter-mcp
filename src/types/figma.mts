// src/types/figma.mts

export interface FigmaFile {
    document: FigmaNode;
    components: {[key: string]: FigmaComponent};
    styles: {[key: string]: FigmaStyle};
    name: string;
    lastModified: string;
    version: string;
    role: string;
    editorType: string;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    visible?: boolean;
    children?: FigmaNode[];
    fills?: FigmaFill[];
    strokes?: FigmaStroke[];
    effects?: FigmaEffect[];
    backgroundColor?: FigmaColor;
    style?: FigmaTextStyle;
    constraints?: FigmaConstraints;
    absoluteBoundingBox?: FigmaBoundingBox;
    layoutMode?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    itemSpacing?: number;
}

export interface FigmaComponent {
    key: string;
    name: string;
    description: string;
    documentationLinks?: Array<{
        uri: string;
    }>;
}

export interface FigmaStyle {
    key: string;
    name: string;
    styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
    description: string;
}

export interface FigmaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface FigmaFill {
    type: string;
    color?: FigmaColor;
    gradientStops?: Array<{
        color: FigmaColor;
        position: number;
    }>;
    visible?: boolean;
}

export interface FigmaStroke {
    type: string;
    color: FigmaColor;
    strokeWeight?: number;
}

export interface FigmaEffect {
    type: string;
    color?: FigmaColor;
    offset?: {x: number; y: number};
    radius: number;
    spread?: number;
    visible?: boolean;
}

export interface FigmaTextStyle {
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    letterSpacing: number;
    lineHeightPx: number;
    textAlignHorizontal: string;
    textAlignVertical: string;
}

export interface FigmaConstraints {
    vertical: string;
    horizontal: string;
}

export interface FigmaBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FigmaPageInfo {
    id: string;
    name: string;
    type: string;
}

export interface FigmaFileInfo {
    name: string;
    lastModified: string;
    version: string;
    role: string;
    editorType: string;
    componentCount: number;
    styleCount: number;
    pageCount: number;
}