"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "student" as "student" | "client"
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // University Email Validation - Only compulsory for Students
        if (form.role === "student") {
            const universityDomains = [".edu"];
            const isUniversityEmail = universityDomains.some(domain => form.email.toLowerCase().endsWith(domain));

            if (!isUniversityEmail) {
                setError("Students must use their university email address (.edu) to join the community.");
                toast.error("University Email Required");
                setLoading(false);
                return;
            }
        }

        try {
            const { data, error: signupError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.fullName,
                        role: form.role,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (signupError) throw signupError;

            if (data?.user) {
                toast.success("Account created! Please check your email.");
                router.push("/auth/login?message=Check your email to confirm your account.");
            }
        } catch (err: any) {
            console.error("Signup error:", err);
            toast.error(err.message || "Something went wrong during signup");
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                            Create your account
                        </h1>
                        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                            Join the student freelance community
                        </p>
                    </div>

                    <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                        <form onSubmit={handleSignup} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">I want to...</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, role: "student" })}
                                        className={`rounded-xl border py-3 text-sm font-bold transition-all ${form.role === "student"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
                                            }`}
                                    >
                                        Find Gigs
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, role: "client" })}
                                        className={`rounded-xl border py-3 text-sm font-bold transition-all ${form.role === "client"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
                                            }`}
                                    >
                                        Hire Students
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        required
                                        type="text"
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">
                                    {form.role === "student" ? "Student Email" : "Email Address"}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        required
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder={form.role === "student" ? "email@university.edu" : "email@example.com"}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                                    />
                                </div>
                                {form.role === "student" && (
                                    <p className="text-[10px] font-medium text-zinc-400 italic">
                                        * Must be a valid .edu address
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">Password</label>
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
                                className="group mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                            >
                                {loading ? (
                                    <Loading size={24} text="" />
                                ) : (
                                    <>
                                        Get Started
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-sm text-zinc-500">
                            Already have an account?{" "}
                            <Link href="/auth/login" className="font-bold text-primary hover:text-primary/90">
                                Log in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
