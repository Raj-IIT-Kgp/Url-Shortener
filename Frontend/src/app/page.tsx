"use client";

import { useState, useEffect, useRef } from "react";
import { createShortUrl, type CreateUrlResponse } from "@/lib/api";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { RecentLinks, saveRecentLink } from "@/components/RecentLinks";
import Image from "next/image";

export default function Home() {
    const [url, setUrl] = useState("");
    const [customAlias, setCustomAlias] = useState("");
    const [maxClicks, setMaxClicks] = useState("");
    const [password, setPassword] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [result, setResult] = useState<CreateUrlResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const urlInputRef = useRef<HTMLInputElement>(null);
    const { toasts, toast, dismiss } = useToast();

    // ── Cmd/Ctrl+K focuses the input
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                urlInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResult(null);
        setShowQr(false);
        setLoading(true);

        try {
            const data = await createShortUrl(
                url,
                customAlias || undefined,
                maxClicks ? parseInt(maxClicks) : undefined,
                password || undefined,
                undefined, // expiresAt
                webhookUrl || undefined,
            );
            setResult(data);
            setUrl("");
            setCustomAlias("");
            setMaxClicks("");
            setPassword("");
            setWebhookUrl("");
            setShowAdvanced(false);

            // Save to recent links
            saveRecentLink({
                shortCode: data.shortCode,
                shortUrl: data.shortUrl,
                originalUrl: url,
                createdAt: new Date().toISOString(),
            });
            window.dispatchEvent(new Event("snip-recent-updated"));

            toast("Short URL created successfully! 🎉", "success");
        } catch (err: unknown) {
            toast(err instanceof Error ? err.message : "Something went wrong", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.shortUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast("Copied to clipboard!", "success", 2000);
        } catch {
            toast("Failed to copy", "error");
        }
    };

    const handleShare = async () => {
        if (!result) return;
        if (navigator.share) {
            try {
                await navigator.share({ title: "Snip Short URL", url: result.shortUrl });
            } catch {}
        } else {
            await handleCopy();
        }
    };

    return (
        <>
            <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-sm text-[var(--color-text-muted)] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                        Powered by Kafka &amp; Redis
                    </div>
                    <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
                        <span className="gradient-text">Shorten</span> your links,{" "}
                        <br className="hidden sm:block" />
                        <span className="gradient-text">amplify</span> your reach
                    </h1>
                    <p className="text-lg text-[var(--color-text-muted)] max-w-lg mx-auto">
                        Create lightning-fast short URLs with QR codes, geo analytics, passwords, and self-destruct links.
                    </p>
                    <p className="text-xs text-[var(--color-text-dim)] mt-2">
                        Press <kbd className="px-1.5 py-0.5 rounded glass-light font-mono text-[10px]">⌘K</kbd> to focus
                    </p>
                </div>

                {/* URL Input Form */}
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-2xl glass rounded-2xl p-4 glow transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                >
                    <div className="flex flex-col gap-3">
                        <input
                            ref={urlInputRef}
                            id="url-input"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste your long URL here..."
                            required
                            className="w-full px-5 py-4 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-lg rounded-xl focus:bg-[var(--color-surface-light)] transition-colors duration-200 border border-transparent focus:border-[var(--color-border)]"
                        />

                        {/* Advanced toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] text-left transition-colors cursor-pointer pl-1"
                        >
                            {showAdvanced ? "▾" : "▸"} Advanced options
                        </button>

                        {showAdvanced && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={customAlias}
                                    onChange={(e) => setCustomAlias(e.target.value)}
                                    placeholder="Custom alias (4-10 chars)"
                                    minLength={4}
                                    maxLength={10}
                                    pattern="[a-zA-Z0-9-]+"
                                    className="px-4 py-3 bg-[var(--color-surface-light)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-sm rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)]"
                                />
                                <input
                                    type="number"
                                    value={maxClicks}
                                    onChange={(e) => setMaxClicks(e.target.value)}
                                    placeholder="Max clicks (self-destruct)"
                                    min={1}
                                    className="px-4 py-3 bg-[var(--color-surface-light)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-sm rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)]"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password protect (optional)"
                                    minLength={4}
                                    className="px-4 py-3 bg-[var(--color-surface-light)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-sm rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)] sm:col-span-2"
                                />
                                <input
                                    type="url"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="Webhook URL (optional) - POST on click"
                                    className="px-4 py-3 bg-[var(--color-surface-light)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-sm rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)] sm:col-span-2"
                                />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-8 py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl text-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Shortening...
                                    </span>
                                ) : (
                                    "Shorten URL"
                                )}
                            </button>
                            <Link
                                href="/bulk"
                                className="px-4 py-4 glass-light rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary-light)] transition-colors flex items-center whitespace-nowrap"
                            >
                                Bulk ↗
                            </Link>
                        </div>
                    </div>
                </form>

                {/* Result */}
                {result && (
                    <div className="mt-6 w-full max-w-2xl glass rounded-2xl p-6 glow-accent animate-[fadeIn_0.4s_ease-out]">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-[var(--color-text-muted)]">Your shortened URL is ready 🎉</p>
                            <div className="flex gap-2 text-xs">
                                {result.hasPassword && <span className="px-2 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)]">🔒 Protected</span>}
                                {result.maxClicks && <span className="px-2 py-0.5 rounded-full bg-[var(--color-error)]/15 text-[var(--color-error)]">💣 {result.maxClicks} clicks</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <a
                                href={result.shortUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-border)] font-mono text-[var(--color-accent-light)] truncate text-lg hover:underline transition-all block"
                            >
                                {result.shortUrl}
                            </a>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer text-sm text-white shrink-0"
                                style={{
                                    background: copied
                                        ? "var(--color-success)"
                                        : "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
                                }}
                            >
                                {copied ? "✓" : "Copy"}
                            </button>
                            <button
                                onClick={handleShare}
                                className="px-4 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer text-sm text-white shrink-0 glass-light hover:scale-[1.04]"
                            >
                                Share
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-4 text-sm text-[var(--color-text-dim)]">
                                <Link
                                    href={`/${result.shortCode}/stats`}
                                    className="hover:text-[var(--color-primary-light)] transition-colors underline underline-offset-4"
                                >
                                    View Analytics →
                                </Link>
                            </div>
                            {result.qrCode && (
                                <button
                                    type="button"
                                    onClick={() => setShowQr((v) => !v)}
                                    className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors cursor-pointer"
                                >
                                    {showQr ? "Hide QR" : "Show QR ▾"}
                                </button>
                            )}
                        </div>

                        {showQr && result.qrCode && (
                            <div className="mt-4 flex flex-col items-center gap-3 pt-4 border-t border-[var(--color-border)]">
                                <Image
                                    src={result.qrCode}
                                    alt="QR Code"
                                    width={160}
                                    height={160}
                                    className="rounded-xl"
                                    unoptimized
                                />
                                <a
                                    href={result.qrCode}
                                    download={`qr-${result.shortCode}.png`}
                                    className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors underline"
                                >
                                    Download QR PNG
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Recent Links */}
                <RecentLinks />

                {/* Features Section */}
                <div className="mt-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { icon: "⚡", title: "Blazing Fast", desc: "Redis-cached redirects with sub-millisecond response times" },
                        { icon: "🛡️", title: "Spam Guard", desc: "Integrated with Google Safe Browsing API to block malicious links" },
                        { icon: "🪝", title: "Webhooks", desc: "Real-time POST notifications to your server on every link click" },
                    ].map((feature) => (
                        <div
                            key={feature.title}
                            className="glass-light rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:glow"
                        >
                            <div className="text-3xl mb-3">{feature.icon}</div>
                            <h3 className="font-semibold text-[var(--color-text)] mb-1">{feature.title}</h3>
                            <p className="text-sm text-[var(--color-text-muted)]">{feature.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <footer className="mt-20 text-sm text-[var(--color-text-dim)]">
                    Built with Next.js, NestJS, Kafka, Redis &amp; PostgreSQL
                </footer>
            </main>
        </>
    );
}
