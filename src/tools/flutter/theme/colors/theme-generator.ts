// src/tools/flutter/simple-theme-generator.mts
import {writeFile, mkdir} from 'fs/promises';
import {join} from 'path';
import type {ThemeColor, ThemeGenerationOptions} from '../../../../extractors/colors/index.js';

export class SimpleThemeGenerator {
    /**
     * Generate AppColors Dart class from theme colors
     */
    async generateAppColors(colors: ThemeColor[], outputPath: string, options: ThemeGenerationOptions = {}): Promise<string> {
        // Create output directory
        await mkdir(outputPath, {recursive: true});
        const filePath = join(outputPath, 'app_colors.dart');

        // Generate Dart content
        const content = this.generateDartContent(colors);

        await writeFile(filePath, content);

        // Generate ThemeData if requested
        if (options.generateThemeData) {
            await this.generateThemeData(colors, outputPath, options);
        }

        return filePath;
    }

    /**
     * Generate Flutter ThemeData from theme colors
     */
    async generateThemeData(colors: ThemeColor[], outputPath: string, options: ThemeGenerationOptions = {}): Promise<string> {
        const filePath = join(outputPath, 'app_theme.dart');
        const content = this.generateThemeDataContent(colors, options);

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

    private generateThemeDataContent(colors: ThemeColor[], options: ThemeGenerationOptions): string {
        const timestamp = new Date().toISOString().split('T')[0];
        const colorMap = this.createColorMap(colors);

        let content = `// Generated Flutter ThemeData from Figma theme frame

import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  // Light Theme
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
`;

        // Add ColorScheme if requested
        if (options.includeColorScheme !== false) {
            content += this.generateColorScheme(colorMap);
        }

        content += `    );
  }
}
`;

        return content;
    }

    private createColorMap(colors: ThemeColor[]): Map<string, string> {
        const colorMap = new Map<string, string>();

        colors.forEach(color => {
            const key = color.name.toLowerCase().replace(/\s+/g, '');
            colorMap.set(key, `AppColors.${this.toDartConstantName(color.name)}`);
        });

        return colorMap;
    }

    private generateColorScheme(colorMap: Map<string, string>): string {
        const primary = colorMap.get('primary') || 'AppColors.primary';
        const secondary = colorMap.get('secondary') || colorMap.get('accent') || 'Colors.blue.shade300';
        const background = colorMap.get('background') || colorMap.get('backgroundlight') || 'Colors.white';
        const surface = colorMap.get('surface') || background;
        const error = colorMap.get('error') || colorMap.get('danger') || 'Colors.red';

        return `      colorScheme: ColorScheme.fromSeed(
        seedColor: ${primary},
        brightness: Brightness.light,
        primary: ${primary},
        secondary: ${secondary},
        background: ${background},
        surface: ${surface},
        error: ${error},
      ),
`;
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