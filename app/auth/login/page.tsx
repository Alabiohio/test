"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(searchParams.get("message"));
    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            });

            if (loginError) throw loginError;

            toast.success("Welcome back!");
            router.push("/jobs");
            router.refresh();
        } catch (err: any) {
            console.error("Login error:", err);
            toast.error(err.message || "Invalid credentials");
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
            {message && (
                <div className="mb-6 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary dark:text-primary-foreground border border-primary/20">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {message}
                </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            required
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="email@university.edu"
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold">Password</label>
                        <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
                            Forgot?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            required
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 flex items-center justify-center gap-2 rounded-xl bg-black py-3.5 font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-lg shadow-black/5"
                >
                    {loading ? (
                        <Loading size={24} text="" />
                    ) : (
                        <>
                            Log In
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="font-bold text-primary hover:text-primary/90">
                    Sign up
                </Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto flex max-w-7xl items-center justify-center px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Welcome back
                        </h1>
                        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                            Log in to your Campwork account
                        </p>
                    </div>

                    <Suspense fallback={
                        <div className="flex items-center justify-center rounded-3xl border border-zinc-200 bg-white p-12 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                            <Loading text="Preparing login..." />
                        </div>
                    }>
                        <LoginForm />
                    </Suspense>
                </motion.div>
            </main>
        </div>
    );
}
