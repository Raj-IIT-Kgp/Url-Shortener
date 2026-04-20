"use client";

import { useState, useEffect } from "react";
import { getStats, type UrlStats } from "@/lib/api";
import Link from "next/link";
import { use } from "react";
import Image from "next/image";

function ClicksChart({ data }: { data: { date: string; count: number }[] }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);

    // Show only every 5th label to avoid crowding
    const labeledIndices = new Set([0, 4, 9, 14, 19, 24, 29]);

    return (
        <div className="w-full max-w-3xl glass rounded-2xl p-6 mb-8">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-5">
                Clicks — Last 30 Days
            </h2>
            <div className="flex items-end gap-[3px] h-24">
                {data.map((d, i) => {
                    const pct = Math.round((d.count / max) * 100);
                    return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                                className="w-full rounded-sm transition-all duration-200"
                                style={{
                                    height: `${Math.max(pct, d.count > 0 ? 4 : 1)}%`,
                                    background: d.count > 0
                                        ? 'linear-gradient(to top, var(--color-primary-dark), var(--color-primary-light))'
                                        : 'var(--color-surface-light)',
                                }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                                    <p className="text-[var(--color-text)] font-semibold">{d.count} click{d.count !== 1 ? 's' : ''}</p>
                                    <p className="text-[var(--color-text-dim)]">{d.date}</p>
                                </div>
                                <div className="w-2 h-2 bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] rotate-45 -mt-1" />
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* X-axis labels */}
            <div className="flex items-end gap-[3px] mt-1">
                {data.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center">
                        {labeledIndices.has(i) && (
                            <span className="text-[9px] text-[var(--color-text-dim)]">
                                {d.date.slice(5)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function BreakdownBar({ items, total }: { items: { label: string; count: number }[]; total: number }) {
    if (!items || items.length === 0) return <p className="text-sm text-[var(--color-text-dim)]">No data yet</p>;
    return (
        <div className="flex flex-col gap-2.5">
            {items.map((item) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                    <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--color-text-muted)] truncate">{item.label}</span>
                            <span className="text-[var(--color-text-dim)]">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--color-surface-light)]">
                            <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function StatsPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const [stats, setStats] = useState<UrlStats | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showQr, setShowQr] = useState(false);

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
                    <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold transition-all hover:opacity-90">
                        ← Back to Home
                    </Link>
                </div>
            </main>
        );
    }

    if (!stats) return null;

    const statCards = [
        { label: "Total Clicks", value: stats.totalClicks, icon: "🖱️", color: "var(--color-primary-light)" },
    ];

    return (
        <main className="flex flex-col items-center min-h-screen px-4 py-16">
            {/* Back */}
            <div className="w-full max-w-3xl mb-8">
                <Link href="/" className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors text-sm">
                    ← Back to Shortener
                </Link>
            </div>

            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    Analytics for <span className="gradient-text">/{code}</span>
                </h1>
                <p className="text-[var(--color-text-muted)]">Real-time click tracking powered by Redis &amp; Kafka</p>
                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                    {stats.hasPassword && <span className="px-3 py-1 rounded-full text-xs bg-[var(--color-warning)]/15 text-[var(--color-warning)]">🔒 Password Protected</span>}
                    {stats.maxClicks && <span className="px-3 py-1 rounded-full text-xs bg-[var(--color-error)]/15 text-[var(--color-error)]">💣 Max {stats.maxClicks} clicks</span>}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="w-full max-w-sm mx-auto mb-8">
                {statCards.map((card) => (
                    <div key={card.label} className="glass rounded-2xl p-8 text-center transition-all duration-300 hover:scale-[1.03]">
                        <div className="text-4xl mb-4">{card.icon}</div>
                        <p className="text-5xl font-bold mb-2" style={{ color: card.color }}>{card.value}</p>
                        <p className="text-lg text-[var(--color-text-muted)]">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Clicks over time */}
            {stats.clicksPerDay && stats.clicksPerDay.some((d) => d.count > 0) && (
                <ClicksChart data={stats.clicksPerDay} />
            )}

            {/* Analytics Breakdown */}
            {stats.totalClicks > 0 && (
                <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { title: "Browsers", data: stats.browsers },
                        { title: "Devices", data: stats.devices },
                        { title: "Countries", data: stats.countries },
                    ].map(({ title, data }) => (
                        <div key={title} className="glass rounded-2xl p-5">
                            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">{title}</h2>
                            <BreakdownBar items={data} total={stats.totalClicks} />
                        </div>
                    ))}
                </div>
            )}

            {/* Details */}
            <div className="w-full max-w-3xl glass rounded-2xl p-6 glow mb-6">
                <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-muted)]">Details</h2>
                <div className="space-y-4">
                    {[
                        {
                            label: "Original URL",
                            value: (
                                <a href={stats.originalUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-light)] hover:underline truncate max-w-md text-right block">
                                    {stats.originalUrl}
                                </a>
                            ),
                        },
                        { label: "Short Code", value: <span className="font-mono text-[var(--color-primary-light)]">{stats.shortCode}</span> },
                        { label: "Created", value: new Date(stats.createdAt).toLocaleString() },
                        { label: "Expires", value: stats.expiresAt ? new Date(stats.expiresAt).toLocaleString() : "Never" },
                        ...(stats.maxClicks ? [{ label: "Max Clicks", value: `${stats.totalClicks} / ${stats.maxClicks}` }] : []),
                    ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)] last:border-0 last:pb-0">
                            <span className="text-sm text-[var(--color-text-dim)]">{label}</span>
                            <span className="text-[var(--color-text)]">{value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* QR Code */}
            {stats.qrCode && (
                <div className="w-full max-w-3xl glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--color-text-muted)]">QR Code</h2>
                        <button type="button" onClick={() => setShowQr((v) => !v)} className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] cursor-pointer">
                            {showQr ? "Hide" : "Show"}
                        </button>
                    </div>
                    {showQr && (
                        <div className="flex flex-col items-center gap-3">
                            <Image src={stats.qrCode} alt="QR Code" width={200} height={200} className="rounded-xl" unoptimized />
                            <a href={stats.qrCode} download={`qr-${code}.png`} className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] underline transition-colors">
                                Download PNG
                            </a>
                        </div>
                    )}
                </div>
            )}

            <footer className="mt-16 text-sm text-[var(--color-text-dim)]">
                Built with Next.js, NestJS, Kafka, Redis &amp; PostgreSQL
            </footer>
        </main>
    );
}
