"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { registerUser } from "@/lib/api";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await registerUser(email, password);
            login(data);
            toast("Account created successfully", "success");
            router.push("/dashboard");
        } catch (err: any) {
            toast(err.message || "An error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
            <h1 className="text-2xl font-bold mb-6 text-center text-slate-900 dark:text-white">Create an Account</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                    <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Min 6 characters"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50"
                >
                    {loading ? "Creating..." : "Sign Up"}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    Log in
                </Link>
            </p>
        </div>
    );
}
