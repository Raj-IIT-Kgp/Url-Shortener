"use client";

import React from 'react';
import Link from 'next/link';
import { 
    ShieldCheck, 
    Zap, 
    Key, 
    Webhook, 
    BarChart3, 
    MousePointer2, 
    RefreshCcw, 
    Globe,
    ExternalLink,
    Terminal
} from 'lucide-react';

const GuidePage = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-16 py-10">
            {/* Header section */}
            <div className="text-center space-y-6">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 mb-4">
                    Product Guide
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                    Master your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-400">Links</span>
                </h1>
                <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
                    Everything you need to know about Snip, from basic shortening to advanced webhook integrations and developer APIs.
                </p>
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Basic Shortening */}
                <div className="glass p-8 rounded-2xl transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="p-3 bg-indigo-500/10 rounded-xl w-fit mb-6">
                        <Zap className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Basic Shortening</h2>
                    <ul className="space-y-3 text-[var(--color-text-muted)]">
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>Paste any long URL to generate a unique 6-character short code.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>Each link comes with a pre-rendered QR code for offline use.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>Click analytics begin tracking instantly after creation.</span>
                        </li>
                    </ul>
                </div>

                {/* 2. Security & Phishing Protection */}
                <div className="glass p-8 rounded-2xl transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mb-6">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Spam Guard</h2>
                    <p className="text-[var(--color-text-muted)] mb-4 text-sm leading-relaxed">
                        Every URL is scanned against Google&apos;s global Safe Browsing database. Malicious sites are blocked automatically.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono bg-[var(--color-surface-light)] p-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        🛡️ Scan: malware, phishing, social engineering
                    </div>
                </div>

                {/* 3. Developer API Keys */}
                <div className="glass p-8 rounded-2xl transform transition-all duration-300 hover:scale-[1.02] md:col-span-2">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 space-y-4">
                            <div className="p-3 bg-fuchsia-500/10 rounded-xl w-fit">
                                <Key className="w-6 h-6 text-fuchsia-500" />
                            </div>
                            <h2 className="text-2xl font-bold">Developer Platform</h2>
                            <p className="text-[var(--color-text-muted)] leading-relaxed">
                                Need to shorten URLs from your own app? Use our Developer API Keys to bypass standard login requirements. You can generate, revoke, and monitor your keys from the Dashboard settings.
                            </p>
                            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-500 hover:underline">
                                Go to Dashboard Keys <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="flex-1 w-full bg-slate-950 rounded-xl p-4 border border-slate-800 text-slate-300 font-mono text-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                <Terminal className="w-4 h-4" />
                                <span>Programmatic Usage</span>
                            </div>
                            <pre className="overflow-x-auto">
{`curl -X POST /api/url \\
  -H "x-api-key: snip_your_key" \\
  -d '{"url": "..."}'`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* 4. Real-time Webhooks */}
                <div className="glass p-8 rounded-2xl border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                    <div className="p-3 bg-orange-500/10 rounded-xl w-fit mb-6">
                        <Webhook className="w-6 h-6 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Webhooks</h2>
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-6">
                        Enter a Webhook URL during link creation to receive a real-time HTTP POST whenever your link is clicked.
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
                            <span>Payload Metadata</span>
                            <span>v1.0</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--color-surface-light)] rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 w-[85%]"></div>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-dim)] italic">Includes Geo-IP, Browser, and OS data.</p>
                    </div>
                </div>

                {/* 5. Click Analytics */}
                <div className="glass p-8 rounded-2xl">
                    <div className="p-3 bg-cyan-500/10 rounded-xl w-fit mb-6">
                        <BarChart3 className="w-6 h-6 text-cyan-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Deep Analytics</h2>
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-6">
                        Our analytics dashboard separates <b>DB Clicks</b> (permanent storage) from <b>Pending Clicks</b> (live event stream) for maximum transparency.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--color-surface-light)] p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-indigo-500">Fast</div>
                            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Cache Hits</div>
                        </div>
                        <div className="bg-[var(--color-surface-light)] p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-cyan-600">Live</div>
                            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Events</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Final CTA */}
            <div className="glass p-12 rounded-3xl text-center space-y-8 bg-indigo-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <h2 className="text-3xl font-bold relative">Ready to shorten?</h2>
                <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
                    <Link href="/" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">
                        Create a Link
                    </Link>
                    <Link href="/register" className="px-8 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl font-bold hover:bg-[var(--color-surface-light)] transition-all">
                        Join Platform
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;
