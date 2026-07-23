import type {FigmaNode} from '../types/figma.js';
import type {ComponentPropertyInfo} from '../extractors/components/types.js';

/**
 * Strip Figma property id suffix: "left icon2#90:42" → "left icon2"
 */
export function cleanComponentPropertyName(rawKey: string): string {
    const hashIndex = rawKey.indexOf('#');
    return hashIndex >= 0 ? rawKey.slice(0, hashIndex) : rawKey;
}

/**
 * Extract INSTANCE componentProperties for evidence (BOOLEAN / TEXT / etc.).
 * BOOLEAN toggles (e.g. show left/right icon) are critical for App Bar chrome.
 */
export function extractComponentProperties(node: FigmaNode): ComponentPropertyInfo[] {
    const raw = (node as any).componentProperties;
    if (!raw || typeof raw !== 'object') {
        return [];
    }

    const result: ComponentPropertyInfo[] = [];
    for (const [rawKey, prop] of Object.entries(raw as Record<string, any>)) {
        if (!prop || typeof prop !== 'object') continue;
        const type = String(prop.type || 'UNKNOWN');
        const value = prop.value;
        result.push({
            rawKey,
            name: cleanComponentPropertyName(rawKey),
            type,
            value: value as string | boolean | number
        });
    }

    return result;
}

/**
 * Format component properties for MCP text reports.
 */
export function formatComponentProperties(properties: ComponentPropertyInfo[] | undefined): string {
    if (!properties || properties.length === 0) {
        return '';
    }

    let output = `🎛️  Component Properties (${properties.length}):\n`;
    for (const prop of properties) {
        const display =
            typeof prop.value === 'boolean'
                ? prop.value
                    ? 'true'
                    : 'false'
                : String(prop.value);
        output += `   • ${prop.name} [${prop.type}] = ${display}\n`;
    }
    output += `\n`;
    return output;
}
