// tools/flutter/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFlutterAssetTools} from "./assets/assets.js";
import {registerSvgAssetTools} from "./assets/svg-assets.js";
import {registerComponentTools} from "./components/component-tool.js";
import {registerScreenTools} from "./screens/screen-tool.js";

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

