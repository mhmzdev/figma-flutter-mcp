// src/tools/flutter/typography-generator.mts

import {mkdir, writeFile} from 'fs/promises';
import {join} from 'path';
import type {
    TypographyStyle,
    TypographyDefinition,
    TypographyGenerationOptions
} from '../../../../extractors/typography/types.js';

/**
 * Flutter typography generator for AppText classes
 */
export class TypographyGenerator {
    /**
     * Generate AppText class from theme typography
     */
    async generateAppText(
        typography: TypographyStyle[],
        outputDir: string,
        options: TypographyGenerationOptions = {}
    ): Promise<string> {
        // Ensure output directory exists
        await mkdir(outputDir, {recursive: true});

        // Determine primary font family
        const fontFamilies = new Set(typography.map(t => t.fontFamily));
        const primaryFontFamily = this.determinePrimaryFontFamily(typography);
        const familyVariableName = options.familyVariableName || 'fontFamily';

        // Generate AppText class
        const appTextContent = this.generateAppTextClass(
            typography,
            primaryFontFamily,
            familyVariableName,
            options
        );

        // Write AppText file
        const appTextPath = join(outputDir, 'app_text.dart');
        await writeFile(appTextPath, appTextContent);

        // Generate text theme if requested
        if (options.generateTextTheme) {
            const textThemeContent = this.generateTextThemeClass(
                typography,
                primaryFontFamily,
                familyVariableName,
                options
            );
            const textThemePath = join(outputDir, 'text_theme.dart');
            await writeFile(textThemePath, textThemeContent);
        }

        return appTextPath;
    }

    /**
     * Generate AppText class from typography library
     */
    async generateAppTextFromLibrary(
        typographyLibrary: TypographyDefinition[],
        outputDir: string,
        options: TypographyGenerationOptions = {}
    ): Promise<string> {
        // Convert TypographyDefinition to TypographyStyle format
        const typography: TypographyStyle[] = typographyLibrary.map(def => ({
            name: def.name,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            fontWeight: def.fontWeight,
            lineHeight: def.lineHeight,
            letterSpacing: def.letterSpacing,
            nodeId: def.id
        }));

        return this.generateAppText(typography, outputDir, options);
    }

    /**
     * Generate AppText class content
     */
    private generateAppTextClass(
        typography: TypographyStyle[],
        primaryFontFamily: string,
        familyVariableName: string,
        options: TypographyGenerationOptions
    ): string {
        const className = 'AppText';
        const imports = new Set(['package:flutter/material.dart']);

        let content = '';

        // File header
        content += this.generateFileHeader('AppText - Typography styles for the app');

        // Imports
        imports.forEach(imp => {
            content += `import '${imp}';\n`;
        });
        content += '\n';

        // Class definition
        content += `/// Typography styles for the app\n`;
        content += `/// Generated from Figma design system\n`;
        content += `class ${className} {\n`;
        content += `  ${className}._();\n\n`;

        // Font family variable
        if (primaryFontFamily && primaryFontFamily !== 'default') {
            content += `  /// Primary font family used throughout the app\n`;
            content += `  static const String ${familyVariableName} = '${primaryFontFamily}';\n\n`;
        }

        // Generate text styles
        typography.forEach(style => {
            const dartName = this.generateDartPropertyName(style.name);
            content += this.generateTextStyleProperty(style, dartName, familyVariableName, options);
        });

        content += '}\n';

        return content;
    }

    /**
     * Generate TextTheme class content
     */
    private generateTextThemeClass(
        typography: TypographyStyle[],
        primaryFontFamily: string,
        familyVariableName: string,
        options: TypographyGenerationOptions
    ): string {
        let content = '';

        // File header
        content += this.generateFileHeader('TextTheme - Material Design text theme');

        // Imports
        content += "import 'package:flutter/material.dart';\n";
        content += "import 'app_text.dart';\n\n";

        // Class definition
        content += `/// Material Design text theme\n`;
        content += `/// Generated from Figma design system\n`;
        content += `class AppTextTheme {\n`;
        content += `  AppTextTheme._();\n\n`;

        // Generate text theme
        content += `  /// Get Material Design text theme\n`;
        content += `  static TextTheme get textTheme {\n`;
        content += `    return TextTheme(\n`;

        // Map typography to Material Design text theme properties
        const materialMapping = this.mapToMaterialTextTheme(typography);
        Object.entries(materialMapping).forEach(([materialProperty, style], index, entries) => {
            if (style) {
                const dartName = this.generateDartPropertyName(style.name);
                content += `      ${materialProperty}: AppText.${dartName},\n`;
            }
        });

        content += `    );\n`;
        content += `  }\n`;
        content += '}\n';

        return content;
    }

    /**
     * Generate individual text style property
     */
    private generateTextStyleProperty(
        style: TypographyStyle,
        dartName: string,
        familyVariableName: string,
        options: TypographyGenerationOptions
    ): string {
        let content = '';

        // Documentation comment
        content += `  /// ${style.name} text style\n`;
        content += `  /// Font: ${style.fontFamily}, Size: ${style.fontSize}px, Weight: ${style.fontWeight}\n`;
        content += `  static const TextStyle ${dartName} = TextStyle(\n`;

        // Font family
        if (style.fontFamily && style.fontFamily !== 'default') {
            if (familyVariableName && style.fontFamily === this.determinePrimaryFontFamily([style])) {
                content += `    fontFamily: ${familyVariableName},\n`;
            } else {
                content += `    fontFamily: '${style.fontFamily}',\n`;
            }
        }

        // Font size
        content += `    fontSize: ${style.fontSize},\n`;

        // Font weight
        const flutterWeight = this.mapFontWeightToFlutter(style.fontWeight);
        content += `    fontWeight: ${flutterWeight},\n`;

        // Line height (if different from default and option enabled)
        if (options.includeLineHeight !== false && style.lineHeight) {
            const lineHeightRatio = style.lineHeight / style.fontSize;
            if (lineHeightRatio !== 1.2) { // Only include if not default
                content += `    height: ${lineHeightRatio.toFixed(2)},\n`;
            }
        }

        // Letter spacing (if not zero and option enabled)
        if (options.includeLetterSpacing !== false && style.letterSpacing && style.letterSpacing !== 0) {
            content += `    letterSpacing: ${style.letterSpacing},\n`;
        }

        content += `  );\n\n`;

        return content;
    }

    /**
     * Generate file header with documentation
     */
    private generateFileHeader(description: string): string {
        const timestamp = new Date().toISOString();
        return `// ${description}\n// Generated on ${timestamp}\n// This file was automatically generated from Figma design system\n\n`;
    }

    /**
     * Generate Dart-safe property name
     */
    private generateDartPropertyName(styleName: string): string {
        return styleName
            .charAt(0).toLowerCase() + styleName.slice(1)
            .replace(/[^a-zA-Z0-9]/g, '')
            .replace(/^\d/, '_$&'); // Prefix with underscore if starts with number
    }

    /**
     * Map font weight to Flutter FontWeight
     */
    private mapFontWeightToFlutter(weight: number): string {
        const weightMap: {[key: number]: string} = {
            100: 'FontWeight.w100',
            200: 'FontWeight.w200',
            300: 'FontWeight.w300',
            400: 'FontWeight.w400',
            500: 'FontWeight.w500',
            600: 'FontWeight.w600',
            700: 'FontWeight.w700',
            800: 'FontWeight.w800',
            900: 'FontWeight.w900'
        };

        // Find closest weight
        const weights = Object.keys(weightMap).map(Number).sort((a, b) => a - b);
        let closestWeight = weights[0];
        let minDiff = Math.abs(weight - closestWeight);

        for (const w of weights) {
            const diff = Math.abs(weight - w);
            if (diff < minDiff) {
                minDiff = diff;
                closestWeight = w;
            }
        }

        return weightMap[closestWeight] || 'FontWeight.w400';
    }

    /**
     * Determine primary font family from typography list
     */
    private determinePrimaryFontFamily(typography: TypographyStyle[]): string {
        if (typography.length === 0) return 'default';

        // Count usage of each font family
        const familyCount = new Map<string, number>();
        typography.forEach(style => {
            const count = familyCount.get(style.fontFamily) || 0;
            familyCount.set(style.fontFamily, count + 1);
        });

        // Find most used font family
        let maxCount = 0;
        let primaryFamily = typography[0].fontFamily;
        familyCount.forEach((count, family) => {
            if (count > maxCount) {
                maxCount = count;
                primaryFamily = family;
            }
        });

        return primaryFamily === 'default' ? 'Roboto' : primaryFamily;
    }

    /**
     * Map typography styles to Material Design text theme properties
     */
    private mapToMaterialTextTheme(typography: TypographyStyle[]): {[key: string]: TypographyStyle | null} {
        const mapping: {[key: string]: TypographyStyle | null} = {
            displayLarge: null,
            displayMedium: null,
            displaySmall: null,
            headlineLarge: null,
            headlineMedium: null,
            headlineSmall: null,
            titleLarge: null,
            titleMedium: null,
            titleSmall: null,
            bodyLarge: null,
            bodyMedium: null,
            bodySmall: null,
            labelLarge: null,
            labelMedium: null,
            labelSmall: null
        };

        // Sort typography by size (largest first)
        const sortedTypography = [...typography].sort((a, b) => b.fontSize - a.fontSize);

        // Map based on size and name patterns
        sortedTypography.forEach(style => {
            const name = style.name.toLowerCase();
            const size = style.fontSize;

            if (size >= 32 && !mapping.displayLarge) {
                mapping.displayLarge = style;
            } else if (size >= 28 && !mapping.displayMedium) {
                mapping.displayMedium = style;
            } else if (size >= 24 && !mapping.displaySmall) {
                mapping.displaySmall = style;
            } else if (size >= 22 && !mapping.headlineLarge) {
                mapping.headlineLarge = style;
            } else if (size >= 20 && !mapping.headlineMedium) {
                mapping.headlineMedium = style;
            } else if (size >= 18 && !mapping.headlineSmall) {
                mapping.headlineSmall = style;
            } else if (size >= 16) {
                if (name.includes('title') && !mapping.titleLarge) {
                    mapping.titleLarge = style;
                } else if (!mapping.bodyLarge) {
                    mapping.bodyLarge = style;
                }
            } else if (size >= 14) {
                if (name.includes('title') && !mapping.titleMedium) {
                    mapping.titleMedium = style;
                } else if (!mapping.bodyMedium) {
                    mapping.bodyMedium = style;
                }
            } else if (size >= 12) {
                if (name.includes('title') && !mapping.titleSmall) {
                    mapping.titleSmall = style;
                } else if (name.includes('label') && !mapping.labelLarge) {
                    mapping.labelLarge = style;
                } else if (!mapping.bodySmall) {
                    mapping.bodySmall = style;
                }
            } else if (size >= 11 && !mapping.labelMedium) {
                mapping.labelMedium = style;
            } else if (!mapping.labelSmall) {
                mapping.labelSmall = style;
            }
        });

        return mapping;
    }
}
