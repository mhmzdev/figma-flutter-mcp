// tools/flutter/index.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FigmaService} from "../../services/figma.mjs";
import {getFigmaToken} from "../config.mjs";
import {generateFlutterWidget} from "./widget-builder.mjs";
import {generateProjectStructure} from "./project-structure.mjs";
import {getDeveloperProfile} from "../profile.mjs";
import {registerFlutterAssetTools} from "./assets.mjs";

export function registerFlutterTools(server: McpServer) {
    // Register Flutter asset management tools
    registerFlutterAssetTools(server);

    // Tool: Generate Flutter Widget (classic name)
    // server.registerTool(
    //     "generate_flutter_widget",
    //     {
    //         title: "Generate Flutter Widget",
    //         description: "Generate Flutter widget code with proper project structure from a specific Figma node",
    //         inputSchema: {
    //             fileId: z.string().describe("Figma file ID"),
    //             nodeId: z.string().describe("Node ID to convert to Flutter widget"),
    //             projectStructure: z.boolean().optional().default(true).describe("Generate with proper project structure")
    //         }
    //     },
    //     async ({fileId, nodeId, projectStructure = true}) => {
    //         const token = getFigmaToken();
    //         if (!token) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: "❌ Error: Figma access token not configured."
    //                 }]
    //             };
    //         }

    //         try {
    //             const figmaService = new FigmaService(token);
    //             const node = await figmaService.getNode(fileId, nodeId);
    //             const profile = getDeveloperProfile();

    //             if (projectStructure) {
    //                 const files = generateProjectStructure([node]);

    //                 let output = `✅ Flutter widget generated for: ${node.name}\n\n`;
    //                 if (profile) {
    //                     output += `🧑‍💻 Using developer profile (updated ${profile.updatedAt}).\n`;
    //                     if (profile.hasTheme && profile.themeNotes) {
    //                         output += `🎨 Theme hints: ${profile.themeNotes}\n`;
    //                     }
    //                     if (profile.projectStructureDocPath) {
    //                         output += `📄 Structure doc: ${profile.projectStructureDocPath}\n`;
    //                     }
    //                     output += `\n`;
    //                 }

    //                 if (files.length === 0) {
    //                     output += `\`\`\`dart\n${generateFlutterWidget(node)}\n\`\`\``;
    //                 } else {
    //                     output += `📁 Generated ${files.length} file(s):\n\n`;
    //                     files.forEach(file => {
    //                         output += `📄 **${file.path}**:\n\`\`\`dart\n${file.content}\n\`\`\`\n\n`;
    //                     });
    //                 }

    //                 return {
    //                     content: [{type: "text", text: output}]
    //                 };
    //             } else {
    //                 const flutterCode = generateFlutterWidget(node);
    //                 let output = `✅ Flutter widget generated for: ${node.name}\n\n`;
    //                 if (profile) {
    //                     output += `🧑‍💻 Using developer profile (updated ${profile.updatedAt}).\n`;
    //                     if (profile.hasTheme && profile.themeNotes) {
    //                         output += `🎨 Theme hints: ${profile.themeNotes}\n`;
    //                     }
    //                     if (profile.projectStructureDocPath) {
    //                         output += `📄 Structure doc: ${profile.projectStructureDocPath}\n`;
    //                     }
    //                     output += `\n`;
    //                 }
    //                 output += `\`\`\`dart\n${flutterCode}\n\`\`\``;
    //                 return { content: [{ type: "text", text: output }] };
    //             }
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `❌ Error generating widget: ${error instanceof Error ? error.message : String(error)}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Tool: Generate Complete Project Structure
    // server.registerTool(
    //     "generate_flutter_project_structure",
    //     {
    //         title: "Generate Flutter Project Structure",
    //         description: "Generate complete Flutter project structure with screens and widgets from a Figma page",
    //         inputSchema: {
    //             fileId: z.string().describe("Figma file ID"),
    //             pageId: z.string().optional().describe("Page ID (optional, uses first page if not provided)"),
    //             maxComponents: z.number().optional().default(10).describe("Maximum number of components to process (default: 10)")
    //         }
    //     },
    //     async ({fileId, pageId, maxComponents = 10}) => {
    //         const token = getFigmaToken();
    //         if (!token) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: "❌ Error: Figma access token not configured."
    //                 }]
    //             };
    //         }

    //         try {
    //             const figmaService = new FigmaService(token);

    //             let actualPageId = pageId;
    //             if (!actualPageId) {
    //                 // Get the file to find the first page
    //                 const file = await figmaService.getFile(fileId);
    //                 const firstPage = file.document.children?.[0];
    //                 if (!firstPage) {
    //                     return {
    //                         content: [{
    //                             type: "text",
    //                             text: "❌ Error: No pages found in the Figma file."
    //                         }]
    //                     };
    //                 }
    //                 actualPageId = firstPage.id;
    //             }

    //             const page = await figmaService.getPage(fileId, actualPageId);

    //             // Get top-level children (main components)
    //             const topLevelNodes = page.children?.slice(0, maxComponents) || [];

    //             const files = generateProjectStructure(topLevelNodes);

    //             let output = `✅ Generated Flutter project structure from page: ${page.name}\n\n`;
    //             output += `📊 Summary:\n`;
    //             output += `- Total files: ${files.length}\n`;
    //             output += `- Screens: ${files.filter(f => f.path.includes('/screens/')).length}\n`;
    //             output += `- Global widgets: ${files.filter(f => f.path.includes('/ui/widgets/')).length}\n`;
    //             output += `- Screen-specific widgets: ${files.filter(f => f.path.includes('/widgets/_')).length}\n\n`;

    //             // Group files by type
    //             const screens = files.filter(f => f.path.includes('_screen.dart'));
    //             const globalWidgets = files.filter(f => f.path.includes('/ui/widgets/') && !f.path.includes('/_'));
    //             const privateWidgets = files.filter(f => f.path.includes('/widgets/_'));

    //             if (screens.length > 0) {
    //                 output += `🖥️ **Screens:**\n`;
    //                 screens.forEach(file => {
    //                     output += `\n📄 **${file.path}**:\n\`\`\`dart\n${file.content}\n\`\`\`\n`;
    //                 });
    //             }

    //             if (globalWidgets.length > 0) {
    //                 output += `\n🌐 **Global Widgets:**\n`;
    //                 globalWidgets.forEach(file => {
    //                     output += `\n📄 **${file.path}**:\n\`\`\`dart\n${file.content}\n\`\`\`\n`;
    //                 });
    //             }

    //             if (privateWidgets.length > 0) {
    //                 output += `\n🔒 **Screen-Specific Widgets:**\n`;
    //                 privateWidgets.slice(0, 5).forEach(file => { // Show only first 5 to avoid overwhelming
    //                     output += `\n📄 **${file.path}**:\n\`\`\`dart\n${file.content}\n\`\`\`\n`;
    //                 });

    //                 if (privateWidgets.length > 5) {
    //                     output += `\n... and ${privateWidgets.length - 5} more screen-specific widgets\n`;
    //                 }
    //             }

    //             return {
    //                 content: [{type: "text", text: output}]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `❌ Error generating project structure: ${error instanceof Error ? error.message : String(error)}`
    //                 }]
    //             };
    //         }
    //     }
    // );
}
