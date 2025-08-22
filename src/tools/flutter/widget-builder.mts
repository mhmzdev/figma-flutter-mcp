// tools/flutter/widget-builder.mts
import type {FigmaNode} from "../../types/figma.mjs";
import type {DeveloperProfile} from "../profile.mjs";
import {analyzeNodeStructure, toPascalCase} from "./utils.mjs";
import {
    generateContainerWidget,
    generateTextWidget,
    generateRectangleWidget,
    generateCircleWidget,
    generateComponentWidget
} from "./generators.mjs";

// Backward-compatible signature:
// - generateFlutterWidget(node, true)
// - generateFlutterWidget(node, extractedData, profile, true)
export function generateFlutterWidget(
    node: FigmaNode,
    arg2?: boolean | any,
    arg3?: DeveloperProfile | any,
    arg4?: boolean
): string {
    let extractedData: any | undefined;
    let profile: DeveloperProfile | undefined;
    let isPrivate = false;

    if (typeof arg2 === 'boolean') {
        isPrivate = arg2;
    } else {
        extractedData = arg2;
        profile = arg3 as DeveloperProfile | undefined;
        isPrivate = Boolean(arg4);
    }

    const structure = analyzeNodeStructure(node);
    const className = isPrivate ? `_${toPascalCase(node.name)}` : toPascalCase(node.name);

    let widgetCode = '';

    switch (node.type) {
        case 'FRAME':
        case 'GROUP':
            widgetCode = generateContainerWidget(node);
            break;
        case 'TEXT':
            widgetCode = generateTextWidget(node);
            break;
        case 'RECTANGLE':
            widgetCode = generateRectangleWidget(node);
            break;
        case 'ELLIPSE':
            widgetCode = generateCircleWidget(node);
            break;
        case 'COMPONENT':
        case 'INSTANCE':
            widgetCode = generateComponentWidget(node);
            break;
        default:
            widgetCode = `// Unsupported node type: ${node.type}\nContainer(\n  child: Text('${node.name}'),\n)`;
    }

    const imports = isPrivate ? [] : ["import 'package:flutter/material.dart';"];

    const header = profile && profile.hasTheme && profile.themeNotes
        ? `// Using project theme hints: ${profile.themeNotes}\n`
        : '';

    return `${imports.join('\n')}${imports.length > 0 ? '\n\n' : ''}${header}class ${className} extends StatelessWidget {
  const ${className}({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ${widgetCode};
  }
}`;
}