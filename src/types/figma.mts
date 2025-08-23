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
    // Text-specific properties
    characters?: string; // Actual text content for TEXT nodes
    characterStyleOverrides?: number[];
    styleOverrideTable?: {[key: string]: FigmaTextStyle};
}

export interface FigmaComponent {
    key: string;
    file_key: string;
    node_id: string;
    thumbnail_url: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        handle: string;
        img_url: string;
    };
    containing_frame?: {
        name: string;
        node_id: string;
    };
}

export interface FigmaComponentSet {
    key: string;
    file_key: string;
    node_id: string;
    thumbnail_url: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        handle: string;
        img_url: string;
    };
    containing_frame?: {
        name: string;
        node_id: string;
    };
}

export interface FigmaStyle {
    key: string;
    file_key: string;
    node_id: string;
    style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
    thumbnail_url: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        handle: string;
        img_url: string;
    };
    sort_position: string;
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
    visible?: boolean;
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

// Image Export Types
export interface ImageExportOptions {
    format?: 'png' | 'jpg' | 'svg' | 'pdf';
    scale?: number; // 1, 2, 3, 4 for PNG/JPG
    svgIncludeId?: boolean;
    svgSimplifyStroke?: boolean;
    svgOutlineText?: boolean;
    useAbsoluteBounds?: boolean;
    version?: string;
}

export interface ImageExportResponse {
    err?: string;
    images: {[nodeId: string]: string | null};
}

export interface ImageFillsResponse {
    err?: string;
    meta: {
        images: {[imageRef: string]: string};
    };
}

// Responses
export interface ComponentResponse {
    meta: {
        components: FigmaComponent[];
    };
}

export interface ComponentSetResponse {
    meta: {
        component_sets: FigmaComponentSet[];
    };
}

export interface StylesResponse {
    meta: {
        styles: FigmaStyle[];
    };
}

// Single Node Response
export interface NodeResponse {
    nodes: {
        [nodeId: string]: {
            document: FigmaNode;
            components?: {[key: string]: FigmaComponent};
            styles?: {[key: string]: FigmaStyle};
        };
    };
}

// Page Response  
export interface PageResponse {
    document: FigmaNode;
    components?: {[key: string]: FigmaComponent};
    styles?: {[key: string]: FigmaStyle};
}