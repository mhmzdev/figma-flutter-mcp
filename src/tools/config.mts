// src/tools/config.mts
export function getFigmaToken(): string | null {
    return process.env.FIGMA_API_KEY || null;
}