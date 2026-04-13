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
        } catch (err: unknown) {
            toast(err instanceof Error ? err.message : "An error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-8 glass rounded-2xl shadow-xl">
            <h1 className="text-2xl font-bold mb-6 text-center text-[var(--color-text)]">Create an Account</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-[var(--color-surface-light)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-dim)]"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Password</label>
                    <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-[var(--color-surface-light)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-dim)]"
                        placeholder="Min 6 characters"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50"
                >
                    {loading ? "Creating..." : "Sign Up"}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
                Already have an account?{" "}
                <Link href="/login" className="text-[var(--color-primary)] hover:underline">
                    Log in
                </Link>
            </p>
        </div>
    );
}
