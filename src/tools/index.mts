// src/tools/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFigmaTools} from "./figma.mjs";
import {registerFlutterTools} from "./flutter/index.mjs";
import {registerThemeTools} from "./flutter/theme/colors/theme-tool.mjs";
import {registerTypographyTools} from "./flutter/theme/typography/typography-tool.mjs";

export function registerAllTools(server: McpServer) {
    // Register all tool categories
    registerFigmaTools(server);
    registerFlutterTools(server);
    registerThemeTools(server);
    registerTypographyTools(server);
    
    console.log("📋 Registered tool categories:");
    console.log("  🎨 Figma tools");
    console.log("  🚀 Flutter tools");
    console.log("  📝 Typography tools");
}

export {getFigmaToken} from "./config.mjs";