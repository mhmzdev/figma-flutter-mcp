// src/tools/flutter/simple-theme-generator.mts
import {writeFile, mkdir} from 'fs/promises';
import {join} from 'path';
import type {ThemeColor} from '../../extractors/colors/index.mjs';

export class SimpleThemeGenerator {
    /**
     * Generate AppColors Dart class from theme colors
     */
    async generateAppColors(colors: ThemeColor[], outputPath: string): Promise<string> {
        // Create output directory
        await mkdir(outputPath, {recursive: true});
        const filePath = join(outputPath, 'app_colors.dart');

        // Generate Dart content
        const content = this.generateDartContent(colors);

        await writeFile(filePath, content);
        return filePath;
    }

    private generateDartContent(colors: ThemeColor[]): string {

        let content = `// Generated AppColors from Figma theme frame

import 'package:flutter/material.dart';

class AppColors {
`;

        // Generate color constants
        colors.forEach(color => {
            const constantName = this.toDartConstantName(color.name);
            content += `  /// ${color.name}
  static const Color ${constantName} = Color(0xFF${color.hex.substring(1)});

`;
        });

        content += `}\n`;
        return content;
    }

    private toDartConstantName(name: string): string {
        // Convert to camelCase for Dart constants
        return name
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(word => word.length > 0)
            .map((word, index) => {
                if (index === 0) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('');
    }
}