export class Logger {
    static log(...args: any[]): void {
        console.error('[MCP Server]', ...args);
    }

    static error(...args: any[]): void {
        console.error('[MCP Server ERROR]', ...args);
    }

    static warn(...args: any[]): void {
        console.error('[MCP Server WARN]', ...args);
    }

    static info(...args: any[]): void {
        console.error('[MCP Server INFO]', ...args);
    }
}
