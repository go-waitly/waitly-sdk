/**
 * Waitlist SDK - Client JavaScript/TypeScript to manage waitlists
 * @version 1.0.0
 */
interface WaitlyConfig {
    waitlistId: string;
    apiKey: string;
    apiUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    headers?: Record<string, string>;
}
interface WaitlyEntry {
    email: string;
    name?: string;
    referralCode?: string;
    metadata?: Record<string, any>;
    source?: string;
    locale?: string;
}
interface WaitlyEntryResponse {
    success: boolean;
    entryId: string;
    position: number;
    referralLink: string;
    referralCode: string;
    estimatedWaitTime?: string;
    createdAt: string;
}
interface WaitlyStats {
    totalEntries: number;
    todayEntries: number;
    weekEntries: number;
    monthEntries: number;
    averageWaitTime?: string;
    conversionRate?: number;
    topReferrers?: Array<{
        referralCode: string;
        count: number;
    }>;
}
interface WaitlyError {
    code: string;
    message: string;
    details?: any;
    statusCode?: number;
}
declare class WaitlyClient {
    private config;
    private abortControllers;
    constructor(config: WaitlyConfig);
    /**
     * Create a new entry in the waitlist
     * @param entry - Entry data
     * @returns Promise with the entry details
     */
    createWaitlyEntry(entry: WaitlyEntry): Promise<WaitlyEntryResponse>;
    /**
     * Get the number of entries in the waitlist
     * @param options - Filtering options (optional)
     * @returns Promise with the statistics
     */
    getWaitlyEntriesCount(): Promise<number | WaitlyStats>;
    /**
     * Check if an email is already registered
     * @param email - Email to check
     * @returns Promise<boolean>
     */
    checkEmailExists(email: string): Promise<boolean>;
    /**
     * Cancel all requests
     */
    cancelAllRequests(): void;
    private request;
    private handleError;
    private isValidEmail;
    private delay;
}
declare function createWaitlyClient(config: WaitlyConfig): WaitlyClient;
declare const _default: {
    createWaitlyClient: typeof createWaitlyClient;
    WaitlyClient: typeof WaitlyClient;
};

export { WaitlyClient, type WaitlyConfig, type WaitlyEntry, type WaitlyEntryResponse, type WaitlyError, type WaitlyStats, createWaitlyClient, _default as default };
