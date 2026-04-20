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
    clicksPerDay: { date: string; count: number }[];
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

// access_token in body; refresh_token is set as httpOnly cookie by the server
export interface AuthResponse {
    access_token: string;
    user: { id: string; email: string; hasApiKey?: boolean };
}

function getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
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
        headers: getAuthHeaders(),
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
    const res = await fetch(`${API_URL}/url/${code}/stats`, { headers: getAuthHeaders() });
    return handleResponse<UrlStats>(res);
}

export async function verifyPassword(
    code: string,
    password: string
): Promise<{ valid: boolean; originalUrl?: string }> {
    const res = await fetch(`${API_URL}/url/${code}/unlock`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ password }),
    });
    return handleResponse<{ valid: boolean; originalUrl?: string }>(res);
}

// credentials: 'include' sends the httpOnly refresh_token cookie to /auth/* endpoints
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
}

// Silently exchange the httpOnly refresh cookie for a new access token
export async function refreshTokenApi(): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    return handleResponse<AuthResponse>(res);
}

// Clears the refresh cookie server-side and blocklists the current access token
export async function logoutApi(): Promise<void> {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers,
        credentials: "include",
    });
}

export async function getMyUrls(): Promise<UserUrl[]> {
    const res = await fetch(`${API_URL}/url/my-links`, { headers: getAuthHeaders() });
    return handleResponse<UserUrl[]>(res);
}

export async function deleteUrl(code: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/url/${code}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
}

export async function getApiKey(): Promise<{ hasApiKey: boolean }> {
    const res = await fetch(`${API_URL}/auth/api-key`, { headers: getAuthHeaders() });
    return handleResponse<{ hasApiKey: boolean }>(res);
}

export async function generateApiKey(): Promise<{ apiKey: string }> {
    const res = await fetch(`${API_URL}/auth/api-key/generate`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    return handleResponse<{ apiKey: string }>(res);
}
