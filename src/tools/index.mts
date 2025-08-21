// src/tools/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFigmaTools} from "./figma.mjs";
import {registerFlutterTools} from "./flutter/index.mjs";
import {registerProfileTools} from "./profile.mjs";

export function registerAllTools(server: McpServer) {
    // Register all tool categories
    registerFigmaTools(server);
    registerFlutterTools(server);
    registerProfileTools(server);

    console.log("📋 Registered tool categories:");
    console.log("  🎨 Figma tools");
    console.log("  🚀 Flutter tools");
    console.log("  👤 Profile tools");
}

export {getFigmaToken} from "./config.mjs";