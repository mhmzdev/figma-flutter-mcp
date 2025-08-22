// tools/flutter/asset-manager.mts
import {writeFile, mkdir, readFile} from 'fs/promises';
import {join, dirname} from 'path';

export interface AssetInfo {
    nodeId: string;
    nodeName: string;
    filename: string;
    path: string;
    size: string;
}

export async function createAssetsDirectory(projectPath: string): Promise<string> {
    const assetsDir = join(projectPath, 'assets', 'images');
    await mkdir(assetsDir, {recursive: true});
    return assetsDir;
}

export function generateAssetFilename(nodeName: string, format: string, scale: number, multiRes: boolean): string {
    // Clean the node name for filename
    const cleanName = nodeName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    if (multiRes && scale > 1) {
        return `${cleanName}@${scale}x.${format}`;
    }

    return `${cleanName}.${format}`;
}

export async function downloadImage(url: string, filepath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await mkdir(dirname(filepath), {recursive: true});
    await writeFile(filepath, Buffer.from(buffer));
}

export async function getFileStats(filepath: string): Promise<{size: string}> {
    try {
        const {size} = await import('fs').then(fs => fs.promises.stat(filepath));
        return {
            size: size > 1024 * 1024
                ? `${(size / 1024 / 1024).toFixed(1)}MB`
                : `${Math.round(size / 1024)}KB`
        };
    } catch {
        return {size: 'Unknown'};
    }
}

export async function updatePubspecAssets(pubspecPath: string, assets: Array<{path: string}>): Promise<void> {
    let pubspecContent: string;

    try {
        pubspecContent = await readFile(pubspecPath, 'utf-8');
    } catch {
        // If pubspec doesn't exist, create a basic one
        pubspecContent = `name: flutter_app
description: A Flutter application

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true
`;
    }

    // Extract existing assets from pubspec
    const existingAssets = new Set<string>();
    const assetMatch = pubspecContent.match(/assets:\s*\n((?:    - .*\n)*)/);
    if (assetMatch) {
        const existingAssetLines = assetMatch[1].match(/    - .*/g) || [];
        existingAssetLines.forEach(line => {
            const assetPath = line.replace(/^\s*-\s*/, '').trim();
            existingAssets.add(assetPath);
        });
    }

    // Add new assets to existing ones
    const newAssetPaths = assets.map(a => a.path);
    newAssetPaths.forEach(path => existingAssets.add(path));

    // Convert back to formatted lines
    const allAssetPaths = Array.from(existingAssets).sort().map(path => `    - ${path}`);

    if (pubspecContent.includes('assets:')) {
        // Replace existing assets section with merged assets
        pubspecContent = pubspecContent.replace(
            /assets:\s*\n(?:    - .*\n)*/,
            `assets:\n${allAssetPaths.join('\n')}\n`
        );
    } else if (pubspecContent.includes('flutter:')) {
        // Add assets to existing flutter section
        pubspecContent = pubspecContent.replace(
            'flutter:',
            `flutter:\n  assets:\n${allAssetPaths.join('\n')}`
        );
    } else {
        // Add flutter section with assets
        pubspecContent += `\nflutter:\n  assets:\n${allAssetPaths.join('\n')}\n`;
    }

    await writeFile(pubspecPath, pubspecContent);
}

export async function generateAssetConstants(assets: Array<{filename: string, nodeName: string}>, projectPath: string): Promise<string> {
    const constantsDir = join(projectPath, 'lib', 'constants');
    await mkdir(constantsDir, {recursive: true});

    const constantsPath = join(constantsDir, 'assets.dart');

    // Read existing constants if they exist
    const existingConstants = new Map<string, string>();
    try {
        const existingContent = await readFile(constantsPath, 'utf-8');
        // Extract existing constants using regex
        const constantMatches = existingContent.matchAll(/static const String (\w+) = '([^']+)';/g);
        for (const match of constantMatches) {
            existingConstants.set(match[1], match[2]);
        }
    } catch {
        // File doesn't exist, that's fine
    }

    // Generate unique asset names from new assets
    const uniqueAssets = assets.reduce((acc, asset) => {
        const baseName = asset.filename.replace(/@\d+x/, '').replace(/\.[^.]+$/, '');
        if (!acc[baseName]) {
            acc[baseName] = asset;
        }
        return acc;
    }, {} as Record<string, any>);

    // Add new constants to existing ones
    Object.entries(uniqueAssets).forEach(([baseName, asset]) => {
        const constantName = toCamelCase(asset.nodeName);
        const assetPath = `assets/images/${baseName}.png`; // Use base resolution
        existingConstants.set(constantName, assetPath);
    });

    // Generate the complete constants file
    let constantsContent = `// Generated asset constants\n// Do not edit manually\n\nclass Assets {\n`;

    // Sort constants alphabetically for consistency
    const sortedConstants = Array.from(existingConstants.entries()).sort(([a], [b]) => a.localeCompare(b));
    sortedConstants.forEach(([constantName, assetPath]) => {
        constantsContent += `  static const String ${constantName} = '${assetPath}';\n`;
    });

    constantsContent += `}\n`;

    await writeFile(constantsPath, constantsContent);
    return constantsPath;
}

export function groupAssetsByBaseName(assets: Array<{filename: string, nodeName: string, size: string}>): Record<string, Array<{filename: string, size: string}>> {
    return assets.reduce((acc, asset) => {
        const baseName = asset.filename.replace(/@\d+x/, '').replace(/\.[^.]+$/, '');
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push({
            filename: asset.filename,
            size: asset.size
        });
        return acc;
    }, {} as Record<string, Array<{filename: string, size: string}>>);
}

function toCamelCase(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .replace(/_(.)/g, (_, char) => char.toUpperCase());
}
