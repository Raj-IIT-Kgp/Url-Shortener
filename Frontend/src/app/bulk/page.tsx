"use client";

import { useState } from "react";
import Link from "next/link";
import { createShortUrl, type CreateUrlResponse } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { saveRecentLink } from "@/components/RecentLinks";

interface BulkResult {
    input: string;
    result?: CreateUrlResponse;
    error?: string;
}

export default function BulkPage() {
    const [input, setInput] = useState("");
    const [results, setResults] = useState<BulkResult[]>([]);
    const [loading, setLoading] = useState(false);
    const { toasts, toast, dismiss } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = input
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && l.startsWith("http"));

        if (lines.length === 0) {
            toast("Please enter at least one valid URL (must start with http)", "error");
            return;
        }
        if (lines.length > 20) {
            toast("Maximum 20 URLs at a time", "error");
            return;
        }

        setLoading(true);
        setResults([]);

        const processed: BulkResult[] = [];
        for (const url of lines) {
            try {
                const result = await createShortUrl(url);
                processed.push({ input: url, result });
                saveRecentLink({
                    shortCode: result.shortCode,
                    shortUrl: result.shortUrl,
                    originalUrl: url,
                    createdAt: new Date().toISOString(),
                });
            } catch (err: unknown) {
                processed.push({ input: url, error: err instanceof Error ? err.message : "Failed" });
            }
        }

        window.dispatchEvent(new Event("snip-recent-updated"));
        setResults(processed);
        setLoading(false);

        const success = processed.filter((r) => r.result).length;
        const failed = processed.filter((r) => r.error).length;
        toast(`Done! ${success} shortened${failed ? `, ${failed} failed` : ""}`, success > 0 ? "success" : "error");
    };

    const copyAll = async () => {
        const text = results.filter((r) => r.result).map((r) => `${r.input} → ${r.result!.shortUrl}`).join("\n");
        await navigator.clipboard.writeText(text);
        toast("All short URLs copied!", "success", 2000);
    };

    return (
        <>
            <main className="flex flex-col items-center min-h-screen px-4 py-16">
                <div className="w-full max-w-2xl mb-8">
                    <Link href="/" className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors text-sm">
                        ← Back to Shortener
                    </Link>
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                        <span className="gradient-text">Bulk</span> URL Shortener
                    </h1>
                    <p className="text-[var(--color-text-muted)]">Paste up to 20 URLs (one per line) and shorten them all at once.</p>
                </div>

                <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={"https://example.com/long-path-1\nhttps://example.com/long-path-2\nhttps://another.com/long-url"}
                        rows={8}
                        className="w-full px-5 py-4 glass rounded-2xl text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-sm font-mono resize-none focus:border-[var(--color-primary)] border border-[var(--color-border)] focus:border-[var(--color-primary)] transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl text-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Processing...
                            </span>
                        ) : "Shorten All"}
                    </button>
                </form>

                {results.length > 0 && (
                    <div className="w-full max-w-2xl mt-8 glass rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--color-text-muted)]">Results</h2>
                            <button onClick={copyAll} className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors cursor-pointer">
                                Copy all →
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {results.map((r, i) => (
                                <div key={i} className={`rounded-xl p-4 border ${r.result ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5" : "border-[var(--color-error)]/30 bg-[var(--color-error)]/5"}`}>
                                    <p className="text-xs text-[var(--color-text-dim)] truncate mb-1">{r.input}</p>
                                    {r.result ? (
                                        <div className="flex items-center gap-2">
                                            <a href={r.result.shortUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-[var(--color-accent-light)] hover:underline flex-1 truncate">
                                                {r.result.shortUrl}
                                            </a>
                                            <Link href={`/${r.result.shortCode}/stats`} className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)]">
                                                Stats →
                                            </Link>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--color-error)]">✕ {r.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
