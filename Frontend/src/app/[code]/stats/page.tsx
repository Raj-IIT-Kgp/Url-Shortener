"use client";

import { useState, useEffect } from "react";
import { getStats, type UrlStats } from "@/lib/api";
import Link from "next/link";
import { use } from "react";

export default function StatsPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const [stats, setStats] = useState<UrlStats | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStats(code)
            .then(setStats)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [code]);

    if (loading) {
        return (
            <main className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-10 w-10 text-[var(--color-primary)]" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-[var(--color-text-muted)]">Loading analytics...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex flex-col items-center justify-center min-h-screen px-4">
                <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="text-5xl mb-4">😢</div>
                    <h2 className="text-xl font-semibold mb-2">URL Not Found</h2>
                    <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold transition-all hover:opacity-90"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </main>
        );
    }

    if (!stats) return null;

    const statCards = [
        {
            label: "Total Clicks",
            value: stats.totalClicks,
            icon: "🖱️",
            color: "var(--color-primary-light)",
        },
        {
            label: "Synced to DB",
            value: stats.dbClicks,
            icon: "💾",
            color: "var(--color-success)",
        },
        {
            label: "Pending in Redis",
            value: stats.pendingClicks,
            icon: "⏳",
            color: "var(--color-warning)",
        },
    ];

    return (
        <main className="flex flex-col items-center min-h-screen px-4 py-16">
            {/* Back link */}
            <div className="w-full max-w-3xl mb-8">
                <Link
                    href="/"
                    className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors text-sm"
                >
                    ← Back to Shortener
                </Link>
            </div>

            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    Analytics for <span className="gradient-text">/{code}</span>
                </h1>
                <p className="text-[var(--color-text-muted)]">
                    Real-time click tracking powered by Redis & BullMQ
                </p>
            </div>

            {/* Stat Cards */}
            <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03]"
                    >
                        <div className="text-3xl mb-2">{card.icon}</div>
                        <p
                            className="text-4xl font-bold mb-1"
                            style={{ color: card.color }}
                        >
                            {card.value}
                        </p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {card.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Details Card */}
            <div className="w-full max-w-3xl glass rounded-2xl p-6 glow">
                <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-muted)]">Details</h2>
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
                        <span className="text-sm text-[var(--color-text-dim)]">Original URL</span>
                        <a
                            href={stats.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-accent-light)] hover:underline truncate max-w-md text-right"
                        >
                            {stats.originalUrl}
                        </a>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
                        <span className="text-sm text-[var(--color-text-dim)]">Short Code</span>
                        <span className="font-mono text-[var(--color-primary-light)]">{stats.shortCode}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
                        <span className="text-sm text-[var(--color-text-dim)]">Created</span>
                        <span className="text-[var(--color-text)]">
                            {new Date(stats.createdAt).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm text-[var(--color-text-dim)]">Expires</span>
                        <span className="text-[var(--color-text)]">
                            {stats.expiresAt
                                ? new Date(stats.expiresAt).toLocaleString()
                                : "Never"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-16 text-sm text-[var(--color-text-dim)]">
                Built with Next.js, NestJS, Redis & PostgreSQL
            </footer>
        </main>
    );
}
