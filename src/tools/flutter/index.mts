// tools/flutter/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFlutterAssetTools} from "./assets/assets.mjs";
import {registerSvgAssetTools} from "./assets/svg-assets.mjs";
import {registerComponentTools} from "./components/component-tool.mjs";
import {registerScreenTools} from "./screens/screen-tool.mjs";

export function registerFlutterTools(server: McpServer, figmaApiKey: string) {
    // Register Flutter asset management tools
    registerFlutterAssetTools(server, figmaApiKey);

    // Register SVG asset management tools
    registerSvgAssetTools(server, figmaApiKey);

    // Register component analysis tools
    registerComponentTools(server, figmaApiKey);

    // Register screen analysis tools
    registerScreenTools(server, figmaApiKey);
}

