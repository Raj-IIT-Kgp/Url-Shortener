const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface CreateUrlResponse {
    shortCode: string;
    shortUrl: string;
}

export interface UrlStats {
    shortCode: string;
    originalUrl: string;
    totalClicks: number;
    dbClicks: number;
    pendingClicks: number;
    createdAt: string;
    expiresAt: string | null;
}

export async function createShortUrl(originalUrl: string): Promise<CreateUrlResponse> {
    const res = await fetch(`${API_URL}/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create short URL');
    }

    return res.json();
}

export async function getStats(code: string): Promise<UrlStats> {
    const res = await fetch(`${API_URL}/url/${code}/stats`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch stats');
    }

    return res.json();
}
