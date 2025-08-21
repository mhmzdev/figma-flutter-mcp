// utils/retry.mts

import {FigmaError, FigmaRateLimitError, FigmaNetworkError} from '../types/errors.mjs';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: (error: Error) => boolean;
}

export interface RetryState {
    attempt: number;
    totalElapsed: number;
    lastError?: Error;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: (error: Error): boolean => {
        // Retry on network errors and rate limits, but not auth or parse errors
        return (error instanceof FigmaNetworkError) ||
            (error instanceof FigmaRateLimitError) ||
            (error instanceof FigmaError && error.statusCode && error.statusCode >= 500) || false;
    }
};

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = {...DEFAULT_OPTIONS, ...options};
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Don't retry if this is the last attempt
            if (attempt === opts.maxAttempts) {
                break;
            }

            // Don't retry if error is not retryable
            if (!opts.retryableErrors(lastError)) {
                break;
            }

            // Calculate delay
            let delay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1);

            // Handle rate limit specific delay
            if (lastError instanceof FigmaRateLimitError && lastError.retryAfter) {
                delay = lastError.retryAfter * 1000; // Convert to ms
            }

            // Cap the delay
            delay = Math.min(delay, opts.maxDelayMs);

            console.log(`Attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`);

            await sleep(delay);
        }
    }

    throw lastError!;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function for logging retry state
export function logRetryAttempt(state: RetryState, error: Error): void {
    console.warn(`Retry attempt ${state.attempt} failed after ${state.totalElapsed}ms: ${error.message}`);
}