"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthResponse, refreshTokenApi, logoutApi } from "@/lib/api";

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (data: AuthResponse) => void;
    logout: () => Promise<void>;
    refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: () => {},
    logout: async () => {},
    refreshAccessToken: async () => null,
});

function parseJwtExp(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return typeof payload.exp === "number" ? payload.exp : null;
    } catch {
        return null;
    }
}

function isTokenExpired(token: string): boolean {
    const exp = parseJwtExp(token);
    if (exp === null) return false;
    return Date.now() / 1000 > exp - 30; // treat as expired 30 s early
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const applySession = (data: AuthResponse) => {
        setUser(data.user);
        setToken(data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.access_token);
    };

    const clearSession = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        // Note: refresh_token cookie is httpOnly — only the server can clear it
    };

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser && !isTokenExpired(storedToken)) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch {
                clearSession();
            }
            return;
        }

        // Access token missing or expired — try the httpOnly refresh cookie silently
        refreshTokenApi()
            .then(applySession)
            .catch(clearSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (data: AuthResponse) => {
        applySession(data);
    };

    const logout = useCallback(async () => {
        await logoutApi().catch(() => {}); // server clears cookie + blocklists jti
        clearSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        try {
            const data = await refreshTokenApi();
            applySession(data);
            return data.access_token;
        } catch {
            clearSession();
            return null;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
