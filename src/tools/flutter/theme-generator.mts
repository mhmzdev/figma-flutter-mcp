// src/tools/flutter/simple-theme-generator.mts
import {writeFile, mkdir} from 'fs/promises';
import {join} from 'path';
import type {ThemeColor} from '../../extractors/theme.mjs';

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
        const timestamp = new Date().toISOString().split('T')[0];

        let content = `// Generated AppColors from Figma theme frame
// Generated on: ${timestamp}
// Total colors: ${colors.length}

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

        // Add convenience getters for common colors
        content += this.generateConvenienceGetters(colors);

        content += `}\n`;
        return content;
    }

    private generateConvenienceGetters(colors: ThemeColor[]): string {
        let getters = `  // Convenience getters for common theme colors
`;

        const commonMappings = [
            {getter: 'primary', patterns: ['primary']},
            {getter: 'secondary', patterns: ['secondary']},
            {getter: 'background', patterns: ['background', 'surface']},
            {getter: 'onBackground', patterns: ['backgroundlight', 'onbackground']},
            {getter: 'error', patterns: ['danger', 'error']},
            {getter: 'success', patterns: ['success']},
            {getter: 'warning', patterns: ['warning']}
        ];

        commonMappings.forEach(mapping => {
            const matchingColor = colors.find(color =>
                mapping.patterns.some(pattern =>
                    color.name.toLowerCase().includes(pattern.toLowerCase())
                )
            );

            if (matchingColor) {
                const constantName = this.toDartConstantName(matchingColor.name);
                getters += `  static Color get ${mapping.getter} => ${constantName};
`;
            }
        });

        return getters + '\n';
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