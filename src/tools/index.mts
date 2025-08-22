// src/tools/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFigmaTools} from "./figma.mjs";
import {registerFlutterTools} from "./flutter/index.mjs";

export function registerAllTools(server: McpServer) {
    // Register all tool categories
    registerFigmaTools(server);
    registerFlutterTools(server);

    console.log("📋 Registered tool categories:");
    console.log("  🎨 Figma tools");
    console.log("  🚀 Flutter tools");
}

export {getFigmaToken} from "./config.mjs";