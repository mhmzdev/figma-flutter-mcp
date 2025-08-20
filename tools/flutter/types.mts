// tools/flutter/types.mts

export interface FlutterFile {
    path: string;
    content: string;
}

export interface ScreenStructure {
    screenName: string;
    mainWidget: string;
    relatedWidgets: string[];
    isGlobalWidget: boolean;
    isScreen: boolean;
}

export interface WidgetGenerationOptions {
    isPrivate: boolean;
    className: string;
    filePath: string;
    imports: string[];
}