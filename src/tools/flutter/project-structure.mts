// tools/flutter/project-structure.mts
import type {FigmaNode} from "../../types/figma.mjs";
import type {FlutterFile, ScreenStructure} from "./types.mjs";
import {isScreenNode, isGlobalWidget, analyzeNodeStructure, toSnakeCase, toPascalCase} from "./utils.mjs";
import {generateFlutterWidget} from "./widget-builder.mjs";
import {generateContainerWidget} from "./generators.mjs";

export function generateProjectStructure(nodes: FigmaNode[]): FlutterFile[] {
    const files: FlutterFile[] = [];

    for (const node of nodes) {
        const structure = analyzeNodeStructure(node);

        if (isScreenNode(node)) {
            // Generate screen file
            const screenPath = `lib/ui/screens/${structure.screenName}/${structure.screenName}_screen.dart`;
            const screenContent = generateScreenFile(node, structure);
            files.push({path: screenPath, content: screenContent});

            // Generate related widgets for this screen
            if (node.children) {
                for (const child of node.children.slice(0, 3)) {
                    if (child.type !== 'TEXT' && child.name.length > 1) {
                        const widgetName = toSnakeCase(child.name);
                        const widgetPath = `lib/ui/screens/${structure.screenName}/widgets/_${widgetName}.dart`;
                        const widgetContent = generateFlutterWidget(child, true);
                        files.push({path: widgetPath, content: widgetContent});
                    }
                }
            }
        } else if (isGlobalWidget(node)) {
            // Generate global widget
            const widgetName = toSnakeCase(node.name);
            const widgetPath = `lib/ui/widgets/${widgetName}/${widgetName}.dart`;
            const widgetContent = generateFlutterWidget(node, false);
            files.push({path: widgetPath, content: widgetContent});
        }
    }

    return files;
}

export function generateScreenFile(node: FigmaNode, structure: ScreenStructure): string {
    const className = `${toPascalCase(structure.screenName)}Screen`;
    const widgetImports = structure.relatedWidgets
        .map(widget => `import 'widgets/_${widget}.dart';`)
        .join('\n');

    const screenContent = generateContainerWidget(node);

    return `import 'package:flutter/material.dart';
${widgetImports}

class ${className} extends StatelessWidget {
  const ${className}({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${structure.mainWidget}'),
      ),
      body: SafeArea(
        child: ${screenContent},
      ),
    );
  }
}`;
}