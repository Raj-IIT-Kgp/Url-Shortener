"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getMyUrls, deleteUrl, UserUrl, getApiKey, generateApiKey } from "@/lib/api";
import { Key, Copy, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Trash2, ExternalLink, BarChart2 } from "lucide-react";

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [urls, setUrls] = useState<UserUrl[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasApiKey, setHasApiKey] = useState(false);
    // plaintext key — only set immediately after generation, never persisted
    const [newApiKey, setNewApiKey] = useState<string | null>(null);
    const [apiKeyLoading, setApiKeyLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        const fetchInitialData = async () => {
            try {
                const [urlsData, apiData] = await Promise.all([getMyUrls(), getApiKey()]);
                setUrls(urlsData);
                setHasApiKey(apiData.hasApiKey);
            } catch (err) {
                console.error(err);
                toast("Failed to load dashboard data", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [user, router, toast]);

    const handleGenerateApiKey = async () => {
        setApiKeyLoading(true);
        setNewApiKey(null);
        try {
            const data = await generateApiKey();
            setNewApiKey(data.apiKey);
            setHasApiKey(true);
            toast("New API key generated — copy it now, it won't be shown again", "success");
        } catch {
            toast("Failed to generate API key", "error");
        } finally {
            setApiKeyLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast("Copied to clipboard", "success");
    };

    const handleDelete = async (code: string) => {
        if (!confirm("Are you sure you want to delete this URL?")) return;
        
        try {
            await deleteUrl(code);
            setUrls(urls.filter(u => u.shortCode !== code));
            toast("URL has been removed", "success");
        } catch (err) {
            toast("Failed to delete URL", "error");
        }
    };

    if (loading) {
        return <div className="text-center mt-20 text-[var(--color-text-muted)]">Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-[var(--color-text)]">My URLs</h1>
                <Link
                    href="/"
                    className="bg-[var(--color-primary)] hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Create New
                </Link>
            </div>

            {urls.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <p className="text-[var(--color-text-muted)] mb-4">You haven&apos;t created any URLs yet.</p>
                    <Link href="/" className="text-[var(--color-primary)] hover:underline">Go shorten one!</Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {urls.map(url => (
                        <div key={url.id} className="glass rounded-xl p-5 glow-accent shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-lg text-[var(--color-primary)]">
                                        /{url.shortCode}
                                    </span>
                                    <span className="text-xs glass-light text-[var(--color-text-muted)] px-2 py-1 rounded-full">
                                        {url.clicks} clicks
                                    </span>
                                </div>
                                <p className="text-[var(--color-text-muted)] text-sm truncate max-w-md">
                                    {url.originalUrl}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <a
                                    href={`/${url.shortCode}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-[var(--color-text-dim)] hover:text-[var(--color-primary)] glass-light rounded-lg transition-colors tooltip-trigger"
                                    title="Visit"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                                <Link
                                    href={`/${url.shortCode}/stats`}
                                    className="p-2 text-[var(--color-text-dim)] hover:text-[var(--color-primary)] glass-light rounded-lg transition-colors tooltip-trigger"
                                    title="Stats"
                                >
                                    <BarChart2 className="w-5 h-5" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(url.shortCode)}
                                    className="p-2 text-[var(--color-text-dim)] hover:text-[var(--color-error)] glass-light rounded-lg transition-colors ml-auto sm:ml-2 tooltip-trigger"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-12 glass rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-[var(--color-primary)]" />
                    <h2 className="text-xl font-bold text-[var(--color-text)]">Developer API Settings</h2>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                    Use your API key to interact with our platform programmatically. Include it in your requests as an `x-api-key` header.
                </p>

                {newApiKey && (
                    <div className="mb-4 p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-sm text-[var(--color-warning)]">
                        Copy your key now — it will never be shown again.
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full font-mono text-sm p-3 glass-light border border-[var(--color-border)] rounded-lg truncate text-[var(--color-text)]">
                        {newApiKey ?? (hasApiKey ? "••••••••••••••••  (key active)" : "No API key generated yet")}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {newApiKey && (
                            <button
                                onClick={() => copyToClipboard(newApiKey)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 glass hover:bg-[var(--color-surface-light)] text-[var(--color-text)] rounded-lg transition-colors font-medium border border-[var(--color-border)]"
                            >
                                <Copy className="w-4 h-4" /> Copy
                            </button>
                        )}
                        <button
                            onClick={handleGenerateApiKey}
                            disabled={apiKeyLoading}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
                            {hasApiKey ? "Regenerate" : "Generate"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
