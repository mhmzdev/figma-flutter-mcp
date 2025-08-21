// tools/flutter/widget-builder.mts
import type {FigmaNode} from "../../types/figma.mjs";
import {analyzeNodeStructure, toPascalCase} from "./utils.mjs";
import {
    generateContainerWidget,
    generateTextWidget,
    generateRectangleWidget,
    generateCircleWidget,
    generateComponentWidget
} from "./generators.mjs";

export function generateFlutterWidget(node: FigmaNode, isPrivate: boolean = false): string {
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

    return `${imports.join('\n')}${imports.length > 0 ? '\n\n' : ''}class ${className} extends StatelessWidget {
  const ${className}({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ${widgetCode};
  }
}`;
}