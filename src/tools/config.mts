// src/tools/config.mts
export function getFigmaToken(): string | null {
    return process.env.FIGMA_FLUTTER_MCP || null;
}