const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface CreateUrlResponse {
    shortCode: string;
    shortUrl: string;
    qrCode: string | null;
    hasPassword: boolean;
    maxClicks: number | null;
}

export interface UrlStats {
    shortCode: string;
    originalUrl: string;
    totalClicks: number;
    dbClicks: number;
    pendingClicks: number;
    createdAt: string;
    expiresAt: string | null;
    maxClicks: number | null;
    hasPassword: boolean;
    qrCode: string | null;
    browsers: { label: string; count: number }[];
    devices: { label: string; count: number }[];
    countries: { label: string; count: number }[];
}

export interface UserUrl {
    id: string;
    shortCode: string;
    originalUrl: string;
    clicks: number;
    createdAt: string;
    expiresAt: string | null;
    maxClicks: number | null;
}

export interface AuthResponse {
    access_token: string;
    user: { id: string; email: string, apiKey?: string };
}

function getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    // We can run in browser or server. If browser, get token from localStorage
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }
    return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
            const err = await res.json();
            msg = Array.isArray(err.message) ? err.message.join(", ") : (err.message ?? msg);
        } catch {}
        throw new Error(msg);
    }
    return res.json() as Promise<T>;
}

export async function createShortUrl(
    originalUrl: string,
    customAlias?: string,
    maxClicks?: number,
    password?: string,
    expiresAt?: string,
    webhookUrl?: string
): Promise<CreateUrlResponse> {
    const res = await fetch(`${API_URL}/url`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            originalUrl,
            ...(customAlias ? { customAlias } : {}),
            ...(maxClicks ? { maxClicks } : {}),
            ...(password ? { password } : {}),
            ...(expiresAt ? { expiresAt } : {}),
            ...(webhookUrl ? { webhookUrl } : {}),
        }),
    });
    return handleResponse<CreateUrlResponse>(res);
}

export async function getStats(code: string): Promise<UrlStats> {
    const res = await fetch(`${API_URL}/url/${code}/stats`, { headers: getHeaders() });
    return handleResponse<UrlStats>(res);
}

export async function verifyPassword(
    code: string,
    password: string
): Promise<{ valid: boolean; originalUrl?: string }> {
    const res = await fetch(`${API_URL}/url/${code}/unlock`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ password }),
    });
    return handleResponse<{ valid: boolean; originalUrl?: string }>(res);
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
}

export async function getMyUrls(): Promise<UserUrl[]> {
    const res = await fetch(`${API_URL}/url/my-links`, { headers: getHeaders() });
    return handleResponse<UserUrl[]>(res);
}

export async function deleteUrl(code: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/url/${code}`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
}

export async function getApiKey(): Promise<{ apiKey: string }> {
    const res = await fetch(`${API_URL}/auth/api-key`, { headers: getHeaders() });
    return handleResponse<{ apiKey: string }>(res);
}

export async function generateApiKey(): Promise<{ apiKey: string }> {
    const res = await fetch(`${API_URL}/auth/api-key/generate`, {
        method: "POST",
        headers: getHeaders(),
    });
    return handleResponse<{ apiKey: string }>(res);
}

