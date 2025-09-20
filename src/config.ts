import {config as loadEnv} from "dotenv";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {resolve} from "path";

export interface ServerConfig {
    figmaApiKey?: string;
    outputFormat: "yaml" | "json";
    isStdioMode: boolean;
    isHttpMode: boolean;
    isRemoteMode: boolean;
    httpPort: number;
    configSources: {
        figmaApiKey: "cli" | "env" | "none";
        envFile: "cli" | "default";
        stdio: "cli" | "env" | "default";
        http: "cli" | "env" | "default";
        remote: "cli" | "env" | "default";
        port: "cli" | "env" | "default";
    };
}

function maskApiKey(key: string): string {
    if (!key || key.length <= 4) return "****";
    return `****${key.slice(-4)}`;
}

interface CliArgs {
    "figma-api-key"?: string;
    env?: string;
    stdio?: boolean;
    http?: boolean;
    remote?: boolean;
    port?: number;
}

export function getServerConfig(): ServerConfig {
    // Parse command line arguments
    const argv = yargs(hideBin(process.argv))
        .options({
            "figma-api-key": {
                type: "string",
                description: "Your Figma API key (can also be set via FIGMA_API_KEY env var)",
            },
            env: {
                type: "string",
                description: "Path to custom .env file to load environment variables from",
            },
            stdio: {
                type: "boolean",
                description: "Run in stdio mode for MCP client communication",
                default: false,
            },
            http: {
                type: "boolean",
                description: "Run in HTTP mode for local testing",
                default: false,
            },
            remote: {
                type: "boolean",
                description: "Run in remote mode - users provide their own Figma API keys",
                default: false,
            },
            port: {
                type: "number",
                description: "Port number for HTTP server",
                default: 3333,
            },
        })
        .help()
        .version(process.env.npm_package_version || "0.0.1")
        .parseSync() as CliArgs;

    // Load environment variables from custom path or default
    let envFilePath: string;
    let envFileSource: "cli" | "default";

    if (argv.env) {
        envFilePath = resolve(argv.env);
        envFileSource = "cli";
    } else {
        envFilePath = resolve(process.cwd(), ".env");
        envFileSource = "default";
    }

    // Load .env file with override if custom path provided
    loadEnv({path: envFilePath, override: !!argv.env});

    const config: ServerConfig = {
        figmaApiKey: undefined,
        outputFormat: "json",
        isStdioMode: false,
        isHttpMode: false,
        isRemoteMode: false,
        httpPort: 3333,
        configSources: {
            figmaApiKey: "none",
            envFile: envFileSource,
            stdio: "default",
            http: "default",
            remote: "default",
            port: "default",
        },
    };

    // Handle FIGMA_API_KEY - Users must provide their own API key
    if (argv["figma-api-key"]) {
        config.figmaApiKey = argv["figma-api-key"];
        config.configSources.figmaApiKey = "cli";
    } else if (process.env.FIGMA_API_KEY) {
        config.figmaApiKey = process.env.FIGMA_API_KEY;
        config.configSources.figmaApiKey = "env";
    }
    // Users can provide API key via CLI args, .env file, or HTTP headers (in remote mode)

    // Handle stdio mode
    if (argv.stdio) {
        config.isStdioMode = true;
        config.configSources.stdio = "cli";
    } else if (process.env.NODE_ENV === "cli") {
        config.isStdioMode = true;
        config.configSources.stdio = "env";
    }

    // Handle HTTP mode
    if (argv.http) {
        config.isHttpMode = true;
        config.configSources.http = "cli";
    } else if (process.env.HTTP_MODE === "true") {
        config.isHttpMode = true;
        config.configSources.http = "env";
    }

    // Handle remote mode
    if (argv.remote) {
        config.isRemoteMode = true;
        config.isHttpMode = true; // Remote mode implies HTTP mode
        config.configSources.remote = "cli";
    } else if (process.env.REMOTE_MODE === "true") {
        config.isRemoteMode = true;
        config.isHttpMode = true; // Remote mode implies HTTP mode
        config.configSources.remote = "env";
    }

    // Handle port configuration
    if (argv.port) {
        config.httpPort = argv.port;
        config.configSources.port = "cli";
    } else if (process.env.HTTP_PORT) {
        config.httpPort = parseInt(process.env.HTTP_PORT, 10);
        config.configSources.port = "env";
    }

    // Validate configuration - Users must provide their own API key for ALL modes except remote
    if (!config.figmaApiKey && !config.isRemoteMode) {
        console.error("Error: FIGMA_API_KEY is required.");
        console.error("Please provide your Figma API key via one of these methods:");
        console.error("  1. CLI argument: --figma-api-key=YOUR_API_KEY");
        console.error("  2. Environment variable: FIGMA_API_KEY=YOUR_API_KEY in .env file");
        console.error("");
        console.error("Get your API key from: https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens");
        console.error("");
        console.error("Examples:");
        console.error("  npx figma-flutter-mcp --figma-api-key=YOUR_KEY --stdio");
        console.error("  echo 'FIGMA_API_KEY=YOUR_KEY' > .env && npx figma-flutter-mcp --stdio");
        console.error("  npx figma-flutter-mcp --remote  # Users provide keys via HTTP headers");
        process.exit(1);
    }

    // Log configuration sources (only in non-stdio mode)
    if (!config.isStdioMode) {
        console.log("\nConfiguration:");
        console.log(`- ENV_FILE: ${envFilePath} (source: ${config.configSources.envFile})`);
        if (config.figmaApiKey) {
            console.log(
                `- FIGMA_API_KEY: ${maskApiKey(config.figmaApiKey)} (source: ${config.configSources.figmaApiKey})`
            );
        } else {
            console.log(`- FIGMA_API_KEY: Not set - users will provide their own (source: ${config.configSources.figmaApiKey})`);
        }
        console.log(`- STDIO_MODE: ${config.isStdioMode} (source: ${config.configSources.stdio})`);
        console.log(`- HTTP_MODE: ${config.isHttpMode} (source: ${config.configSources.http})`);
        console.log(`- REMOTE_MODE: ${config.isRemoteMode} (source: ${config.configSources.remote})`);
        if (config.isHttpMode) {
            console.log(`- HTTP_PORT: ${config.httpPort} (source: ${config.configSources.port})`);
        }
        console.log(); // Empty line for better readability
    }

    return config;
}