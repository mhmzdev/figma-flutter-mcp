// tools/flutter/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFlutterAssetTools} from "./assets/assets.mjs";
import {registerSvgAssetTools} from "./assets/svg-assets.mjs";

export function registerFlutterTools(server: McpServer) {
    // Register Flutter asset management tools
    registerFlutterAssetTools(server);

    // Register SVG asset management tools
    registerSvgAssetTools(server);
}

