// types/errors.mts
import type {Response} from 'node-fetch';

export class FigmaError extends Error {
    constructor(message: string, public code?: string, public statusCode?: number) {
        super(message);
        this.name = 'FigmaError';
    }
}

export class FigmaAuthError extends FigmaError {
    constructor(message: string = 'Invalid Figma access token') {
        super(message, 'AUTH_ERROR', 401);
        this.name = 'FigmaAuthError';
    }
}

export class FigmaNotFoundError extends FigmaError {
    constructor(resource: string, id: string) {
        super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
        this.name = 'FigmaNotFoundError';
    }
}

export class FigmaRateLimitError extends FigmaError {
    constructor(retryAfter?: number) {
        super(`Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter} seconds` : ''}`, 'RATE_LIMIT', 429);
        this.name = 'FigmaRateLimitError';
        this.retryAfter = retryAfter;
    }

    public retryAfter?: number;
}

export class FigmaNetworkError extends FigmaError {
    constructor(message: string, public originalError?: Error) {
        super(`Network error: ${message}`, 'NETWORK_ERROR');
        this.name = 'FigmaNetworkError';
    }
}

export class FigmaParseError extends FigmaError {
    constructor(message: string, public rawResponse?: any) {
        super(`Failed to parse Figma response: ${message}`, 'PARSE_ERROR');
        this.name = 'FigmaParseError';
    }
}

export function createFigmaError(response: Response, message?: string): FigmaError {
    const defaultMessage = message || `Figma API error: ${response.status} ${response.statusText}`;

    switch (response.status) {
        case 401:
        case 403:
            return new FigmaAuthError(defaultMessage);
        case 404:
            return new FigmaNotFoundError('Resource', 'unknown');
        case 429:
            const retryAfter = response.headers.get('Retry-After');
            return new FigmaRateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
        default:
            return new FigmaError(defaultMessage, 'API_ERROR', response.status);
    }
}