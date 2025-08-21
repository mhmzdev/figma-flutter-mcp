// src/tools/profile.mts
import {z} from "zod";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";

export interface DeveloperProfile {
    hasTheme: boolean;
    themeNotes?: string;
    projectStructureDocPath?: string;
    screenWithoutFormExample?: string;
    screenWithFormExample?: string;
    additionalNotes?: string;
    updatedAt: string;
}

let developerProfile: DeveloperProfile | null = null;

export function registerProfileTools(server: McpServer) {
    // Start wizard: return questions to answer
    server.registerTool(
        "start_profile_wizard",
        {
            title: "Start Developer Profile Wizard",
            description: "Shows questions to capture theme and project structure preferences",
            inputSchema: {}
        },
        async () => {
            const questions = [
                "1) Do you already have a theme setup? (colors, spacing, typography). If yes, briefly describe how to use it (e.g., theme accessors, naming).",
                "2) Provide two project structure examples: a) a screen without forms; b) a screen with forms (show expected directories/file naming).",
                "3) Path to a markdown doc in your repo that explains project structure (e.g., project-structure.md), if available.",
                "4) Any constraints or conventions (state mgmt, folder naming, private vs public widgets)."
            ].join("\n");

            return {
                content: [{
                    type: "text",
                    text: `🧑‍💻 Developer Profile Wizard\n\nPlease answer the following before generation:\n\n${questions}\n\nWhen ready, call 'submit_profile_answers'.`
                }]
            };
        }
    );

    // Submit answers and persist in-memory for the session
    server.registerTool(
        "submit_profile_answers",
        {
            title: "Submit Developer Profile Answers",
            description: "Save your theme and project structure preferences for this session",
            inputSchema: {
                hasTheme: z.boolean().describe("Whether a theme setup exists"),
                themeNotes: z.string().optional().describe("How to use the theme (accessors, examples)"),
                projectStructureDocPath: z.string().optional().describe("Path to project-structure markdown file"),
                screenWithoutFormExample: z.string().optional().describe("Example path/naming for a screen without forms"),
                screenWithFormExample: z.string().optional().describe("Example path/naming for a screen with forms"),
                additionalNotes: z.string().optional().describe("Any additional conventions or constraints")
            }
        },
        async ({hasTheme, themeNotes, projectStructureDocPath, screenWithoutFormExample, screenWithFormExample, additionalNotes}) => {
            developerProfile = {
                hasTheme,
                themeNotes,
                projectStructureDocPath,
                screenWithoutFormExample,
                screenWithFormExample,
                additionalNotes,
                updatedAt: new Date().toISOString()
            };

            return {
                content: [{
                    type: "text",
                    text: "✅ Developer profile saved for this session. Generation tools will reference it."
                }]
            };
        }
    );

    // Get current profile
    server.registerTool(
        "get_profile",
        {
            title: "Get Developer Profile",
            description: "Returns the currently saved profile if any",
            inputSchema: {}
        },
        async () => {
            if (!developerProfile) {
                return {
                    content: [{type: "text", text: "ℹ️ No developer profile set for this session."}]
                };
            }
            return {
                content: [{type: "text", text: JSON.stringify(developerProfile, null, 2)}]
            };
        }
    );

    // Clear profile
    server.registerTool(
        "clear_profile",
        {
            title: "Clear Developer Profile",
            description: "Clears the saved developer profile",
            inputSchema: {}
        },
        async () => {
            developerProfile = null;
            return {
                content: [{type: "text", text: "🧹 Developer profile cleared."}]
            };
        }
    );
}

export function getDeveloperProfile(): DeveloperProfile | null {
    return developerProfile;
}


