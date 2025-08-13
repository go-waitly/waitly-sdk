/**
 * Waitlist SDK - Client JavaScript/TypeScript to manage waitlists
 * @version 1.0.2
 */

export interface WaitlyConfig {
  waitlistId: string;
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  headers?: Record<string, string>;
}

export interface WaitlyEntry {
  email: string;
  referredByCode?: string;
  utm?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface WaitlyEntryResponse {
  id: string;
  email: string;
}

export interface WaitlyStats {
  totalEntries: number;
}

export interface WaitlyError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export class WaitlyClient {
  private config: Required<WaitlyConfig>;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: WaitlyConfig) {
    if (!config.waitlistId) {
      throw new Error('waitlistId is required');
    }
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }

    this.config = {
      waitlistId: config.waitlistId,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || 'https://www.gowaitly.com',
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      headers: config.headers || {},
    };
  }

  /**
   * Create a new entry in the waitlist
   * @param entry - Entry data
   * @returns Promise with the entry details
   */
  async createWaitlyEntry(entry: WaitlyEntry): Promise<WaitlyEntryResponse> {
    if (!entry.email) {
      throw new Error('Email is required');
    }
    if (!this.isValidEmail(entry.email)) {
      throw new Error('Invalid email format');
    }

    const endpoint = `/api/waitlists/${this.config.waitlistId}/entries`;

    try {
      const response = await this.request<WaitlyEntryResponse>('POST', endpoint, {
        email: entry.email.toLowerCase().trim(),
        referredByCode: entry.referredByCode,
        utm: entry.utm,
        metadata: entry.metadata,
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get the number of entries in the waitlist
   * @param options - Filtering options (optional)
   * @returns Promise with the statistics
   */
  async getWaitlyEntriesCount(): Promise<number | WaitlyStats> {
    const endpoint = `/api/waitlists/${this.config.waitlistId}/count`;

    try {
      const response = await this.request<WaitlyStats | { count: number }>('GET', endpoint);

      return 'totalEntries' in response
        ? (response as WaitlyStats).totalEntries
        : (response as { count: number }).count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if an email is already registered
   * @param email - Email to check
   * @returns Promise<boolean>
   */
  async checkEmailExists(email: string): Promise<boolean> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const endpoint = `/api/waitlists/${this.config.waitlistId}/check`;

    try {
      const response = await this.request<{ exists: boolean }>('POST', endpoint, {
        email: email.toLowerCase().trim(),
      });
      return response.exists;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Cancel all requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  // Méthodes privées

  private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const requestId = `${method}-${endpoint}-${Date.now()}`;

    // Créer un AbortController pour cette requête
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    // Timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.timeout);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'X-SDK-Version': '1.0.0',
        'X-Waitlist-ID': this.config.waitlistId,
        ...this.config.headers,
      },
      signal: abortController.signal,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    let lastError: any;

    // Retry logic
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options);

        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
          }));

          // Ne pas retry pour les erreurs client (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw { statusCode: response.status, ...error };
          }

          lastError = { statusCode: response.status, ...error };

          // Retry avec backoff exponentiel pour les erreurs serveur
          if (attempt < this.config.retryAttempts - 1) {
            await this.delay(Math.pow(2, attempt) * 1000);
            continue;
          }
        }

        const data = await response.json();
        return data as T;
      } catch (error: any) {
        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);

        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        lastError = error;

        // Retry avec backoff pour les erreurs réseau
        if (attempt < this.config.retryAttempts - 1 && !error.statusCode) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    throw lastError;
  }

  private handleError(error: any): WaitlyError {
    if (error.statusCode === 400) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid request data',
        details: error.details,
        statusCode: 400,
      };
    }

    if (error.statusCode === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
        statusCode: 401,
      };
    }

    if (error.statusCode === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Waitlist not found',
        statusCode: 404,
      };
    }

    if (error.statusCode === 409) {
      return {
        code: 'DUPLICATE_ENTRY',
        message: error.message || 'Email already registered',
        statusCode: 409,
      };
    }

    if (error.statusCode === 429) {
      return {
        code: 'RATE_LIMIT',
        message: 'Too many requests',
        statusCode: 429,
      };
    }

    if (error.message === 'Request timeout') {
      return {
        code: 'TIMEOUT',
        message: 'Request timeout',
        statusCode: 0,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error,
      statusCode: error.statusCode || 0,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createWaitlyClient(config: WaitlyConfig): WaitlyClient {
  return new WaitlyClient(config);
}
