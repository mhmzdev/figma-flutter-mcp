import { randomUUID } from "node:crypto";
import express, { type Request, type Response } from "express";
import { Server } from "http";
import cors from "cors";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {registerAllTools} from "./tools/index.js";
import { Logger } from "./utils/logger.js";

export function createServer(figmaApiKey: string) {
    const server = new McpServer({
        name: "figma-flutter-mcp",
        version: process.env.npm_package_version || "0.0.1"
    });

    registerAllTools(server, figmaApiKey);
    return server;
}

// Create a server instance that can handle per-user API keys
export function createServerForUser(figmaApiKey: string) {
    return createServer(figmaApiKey);
}

let httpServer: Server | null = null;
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
};

// Store MCP server instances per session (for per-user API keys)
const sessionServers = {} as Record<string, McpServer>;

// Helper function to extract Figma API key from request
function extractFigmaApiKey(req: Request, fallbackApiKey?: string): string | null {
  // Try to get from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get from custom header
  const figmaApiKey = req.headers['x-figma-api-key'] as string;
  if (figmaApiKey) {
    return figmaApiKey;
  }
  
  // Try to get from query parameter (less secure, but convenient for testing)
  const queryApiKey = req.query.figmaApiKey as string;
  if (queryApiKey) { 
    return queryApiKey;
  }
  
  // Fall back to server-wide API key (only for non-remote HTTP mode)
  return fallbackApiKey || null;
}

export async function startMcpServer(figmaApiKey: string): Promise<void> {
    try {
        const server = createServer(figmaApiKey);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Figma-to-Flutter MCP Server connected via stdio");
    } catch (error) {
        console.error("Failed to start MCP server:", error);
        process.exit(1);
    }
}

export async function startHttpServer(port: number, figmaApiKey?: string): Promise<void> {
  // For remote mode, we don't create a single server instance
  // Instead, we create per-user servers based on their API keys
  // For non-remote HTTP mode, we use the provided API key
  const app = express();

  // Configure CORS to expose Mcp-Session-Id header for browser-based clients
  app.use(cors({
    origin: '*', // Allow all origins - adjust as needed for production
    exposedHeaders: ['Mcp-Session-Id']
  }));

  // Parse JSON requests for the Streamable HTTP endpoint only, will break SSE endpoint
  app.use("/mcp", express.json());

  // Modern Streamable HTTP endpoint
  app.post("/mcp", async (req, res) => {
    Logger.log("Received StreamableHTTP request");
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    // Extract Figma API key from request
    const userFigmaApiKey = extractFigmaApiKey(req, figmaApiKey);
    if (!userFigmaApiKey) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Unauthorized: Figma API key required. You must provide your own Figma API key via Authorization header (Bearer token), X-Figma-Api-Key header, or figmaApiKey query parameter. Get your API key from: https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens",
        },
        id: null,
      });
      return;
    }
    
    let transport: StreamableHTTPServerTransport;
    let mcpServer: McpServer;

    if (sessionId && transports.streamable[sessionId]) {
      // Reuse existing transport and server
      Logger.log("Reusing existing StreamableHTTP transport for sessionId", sessionId);
      transport = transports.streamable[sessionId];
      mcpServer = sessionServers[sessionId];
    } else if (isInitializeRequest(req.body)) {
      Logger.log("New initialization request for StreamableHTTP");
      
      // Create new server instance for this user's API key
      mcpServer = createServerForUser(userFigmaApiKey);
      
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true, // Enable JSON response mode for better remote compatibility
        onsessioninitialized: (newSessionId) => {
          // Store the transport and server by session ID
          transports.streamable[newSessionId] = transport;
          sessionServers[newSessionId] = mcpServer;
          Logger.log("Session initialized with ID:", newSessionId);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports.streamable[transport.sessionId];
          delete sessionServers[transport.sessionId];
        }
      };
      await mcpServer.connect(transport);
    } else if (sessionId) {
      // Session ID provided but transport not found - create new one
      Logger.log("Creating new transport for existing sessionId", sessionId);
      
      // Create new server instance for this user's API key
      mcpServer = createServerForUser(userFigmaApiKey);
      
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
        enableJsonResponse: true, // Enable JSON response mode for better remote compatibility
        onsessioninitialized: (newSessionId) => {
          transports.streamable[newSessionId] = transport;
          sessionServers[newSessionId] = mcpServer;
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports.streamable[transport.sessionId];
          delete sessionServers[transport.sessionId];
        }
      };
      await mcpServer.connect(transport);
    } else {
      // Invalid request
      Logger.log("Invalid request:", req.body);
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;
    const progressToken = req.body.params?._meta?.progressToken;
    let progress = 0;
    if (progressToken) {
      Logger.log(
        `Setting up progress notifications for token ${progressToken} on session ${sessionId}`,
      );
      progressInterval = setInterval(async () => {
        Logger.log("Sending progress notification", progress);
        await mcpServer.server.notification({
          method: "notifications/progress",
          params: {
            progress,
            progressToken,
          },
        });
        progress++;
      }, 1000);
    }

    Logger.log("Handling StreamableHTTP request");
    await transport.handleRequest(req, res, req.body);

    if (progressInterval) {
      clearInterval(progressInterval);
    }
    Logger.log("StreamableHTTP request handled");
  });

  // Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.streamable[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    console.log(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports.streamable[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling session termination:", error);
      if (!res.headersSent) {
        res.status(500).send("Error processing session termination");
      }
    }
  };

  // Handle GET requests for server-to-client notifications via SSE
  app.get("/mcp", handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete("/mcp", handleSessionRequest);

  httpServer = app.listen(port, () => {
    Logger.log(`HTTP server listening on port ${port}`);
    Logger.log(`StreamableHTTP endpoint available at http://localhost:${port}/mcp`);
  });

  process.on("SIGINT", async () => {
    Logger.log("Shutting down server...");

    // Close all active transports to properly clean up resources
    await closeTransports(transports.streamable);

    Logger.log("Server shutdown complete");
    process.exit(0);
  });
}

async function closeTransports(
  transports: Record<string, StreamableHTTPServerTransport>,
) {
  for (const sessionId in transports) {
    try {
      await transports[sessionId]?.close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
}

export async function stopHttpServer(): Promise<void> {
  if (!httpServer) {
    throw new Error("HTTP server is not running");
  }

  return new Promise((resolve, reject) => {
    httpServer!.close((err: Error | undefined) => {
      if (err) {
        reject(err);
        return;
      }
      httpServer = null;
      const closing = Object.values(transports.streamable).map((transport) => {
        return transport.close();
      });
      Promise.all(closing).then(() => {
        resolve();
      });
    });
  });
}