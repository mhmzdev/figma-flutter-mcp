// src/tools/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFlutterTools} from "./flutter/index.js";
import {registerThemeTools} from "./flutter/theme/colors/theme-tool.js";
import {registerTypographyTools} from "./flutter/theme/typography/typography-tool.js";

export function registerAllTools(server: McpServer, figmaApiKey: string) {
    console.error('🛠️ Tools Debug - Starting tool registration...');

    // Register all tool categories
    registerFlutterTools(server, figmaApiKey);
    console.error('🛠️ Tools Debug - Flutter tools registered');

    registerThemeTools(server, figmaApiKey);
    console.error('🛠️ Tools Debug - Theme tools registered');

    registerTypographyTools(server, figmaApiKey);
    console.error('🛠️ Tools Debug - Typography tools registered');

    console.log("📋 Registered tool categories:");
    console.log("  🚀 Flutter tools - Widgets, Screens");
    console.log("  🏞️ Export assets - Images, SVGs");
    console.log("  🎨 Theme tools - Colors, Typography");
    console.log("  📝 Typography tools - Fonts, Sizes");

    console.error('🛠️ Tools Debug - All tools registration complete');
}