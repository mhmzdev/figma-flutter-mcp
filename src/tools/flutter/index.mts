// tools/flutter/index.mts
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerFlutterAssetTools} from "./assets/assets.mjs";
import {registerSvgAssetTools} from "./assets/svg-assets.mjs";
import {registerComponentTools} from "./components/component-tool.mjs";
import {registerScreenTools} from "./screens/screen-tool.mjs";

export function registerFlutterTools(server: McpServer) {
    // Register Flutter asset management tools
    registerFlutterAssetTools(server);

    // Register SVG asset management tools
    registerSvgAssetTools(server);

    // Register component analysis tools
    registerComponentTools(server);

    // Register screen analysis tools
    registerScreenTools(server);
}

