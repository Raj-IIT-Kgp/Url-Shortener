"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecentLink {
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    createdAt: string;
}

const STORAGE_KEY = "snip-recent-links";
const MAX_RECENT = 5;

export function saveRecentLink(link: RecentLink) {
    if (typeof window === "undefined") return;
    const existing: RecentLink[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [link, ...existing.filter((l) => l.shortCode !== link.shortCode)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function RecentLinks() {
    const [links, setLinks] = useState<RecentLink[]>([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLinks(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(stored.length > 0);
    }, []);

    // Listen for storage updates from same tab
    useEffect(() => {
        const handler = () => {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLinks(stored);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(stored.length > 0);
        };
        window.addEventListener("snip-recent-updated", handler);
        return () => window.removeEventListener("snip-recent-updated", handler);
    }, []);

    if (!visible || links.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mt-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
                Recent Links
            </h3>
            <div className="flex flex-col gap-2">
                {links.map((link) => (
                    <div
                        key={link.shortCode}
                        className="glass-light rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                    >
                        <div className="min-w-0">
                            <a
                                href={link.shortUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-[var(--color-accent-light)] hover:underline block truncate"
                            >
                                {link.shortUrl}
                            </a>
                            <p className="text-xs text-[var(--color-text-dim)] truncate mt-0.5">
                                {link.originalUrl}
                            </p>
                        </div>
                        <Link
                            href={`/${link.shortCode}/stats`}
                            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors whitespace-nowrap shrink-0"
                        >
                            Stats →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
