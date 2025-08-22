// src/tools/figma.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../services/figma.mjs";
import {getFigmaToken} from "./config.mjs";


export function registerFigmaTools(server: McpServer) {
    // TODO: Add pure Figma tools here (fetch file, get nodes, export images, etc.)
    // The export_flutter_assets tool has been moved to src/tools/flutter/assets.mts


}