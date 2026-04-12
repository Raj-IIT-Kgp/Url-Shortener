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
    const [apiKey, setApiKey] = useState<string | null>(null);
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
                setApiKey(apiData.apiKey);
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
        try {
            const data = await generateApiKey();
            setApiKey(data.apiKey);
            toast("New API Key generated!", "success");
        } catch (err) {
            toast("Failed to generate API Key", "error");
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
        return <div className="text-center mt-20 text-slate-500">Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My URLs</h1>
                <Link
                    href="/"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Create New
                </Link>
            </div>

            {urls.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400 mb-4">You haven't created any URLs yet.</p>
                    <Link href="/" className="text-indigo-600 hover:underline">Go shorten one!</Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {urls.map(url => (
                        <div key={url.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
                                        /{url.shortCode}
                                    </span>
                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full">
                                        {url.clicks} clicks
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-md">
                                    {url.originalUrl}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <a
                                    href={`/${url.shortCode}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 rounded-lg transition-colors tooltip-trigger"
                                    title="Visit"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                                <Link
                                    href={`/${url.shortCode}/stats`}
                                    className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 rounded-lg transition-colors tooltip-trigger"
                                    title="Stats"
                                >
                                    <BarChart2 className="w-5 h-5" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(url.shortCode)}
                                    className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-lg transition-colors ml-auto sm:ml-2 tooltip-trigger"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-xl font-bold dark:text-white">Developer API Settings</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Use your API key to interact with our platform programmatically. Include it in your requests as an `x-api-key` header.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full font-mono text-sm p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg selection:bg-indigo-100 dark:selection:bg-indigo-900 truncate">
                        {apiKey || "No API key generated yet"}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {apiKey && (
                            <button
                                onClick={() => copyToClipboard(apiKey)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-700"
                            >
                                <Copy className="w-4 h-4" /> Copy
                            </button>
                        )}
                        <button
                            onClick={handleGenerateApiKey}
                            disabled={apiKeyLoading}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
                            {apiKey ? "Regenerate" : "Generate"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
