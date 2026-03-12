"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

import { jobSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { SkillInput } from "@/components/SkillInput";

export default function CreateJobPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        title: "",
        budget: "",
        category: "Development",
        description: "",
        skills: [] as string[]
    });

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Check if profile exists to avoid FK error
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (profileError || !profile) {
                    console.error("Profile check failed:", profileError);
                    setError("Your profile hasn't been set up yet. Try logging out and back in, or contact support.");
                }
            }
        };
        checkUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFormErrors({});

        if (!userId) {
            setError("You must be logged in to post a job.");
            setLoading(false);
            return;
        }

        try {
            // Zod Validation
            const validationResult = jobSchema.safeParse({
                ...form,
                budget: parseFloat(form.budget || "0"),
                skills_required: form.skills
            });

            if (!validationResult.success) {
                const errors: Record<string, string> = {};
                validationResult.error.issues.forEach(issue => {
                    const path = issue.path[0] as string;
                    errors[path] = issue.message;
                });
                setFormErrors(errors);
                setLoading(false);
                return;
            }

            // Verify profile exists before inserting
            const { data: profileCheck, error: profileCheckError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (profileCheckError || !profileCheck) {
                throw new Error(`Profile not found. Please try logging out and back in.`);
            }

            const { error: insertError } = await supabase
                .from('jobs')
                .insert([{
                    ...validationResult.data,
                    client_id: userId,
                    status: 'open'
                }]);

            if (insertError) throw insertError;

            router.push("/jobs");
        } catch (err: any) {
            console.error("Error creating job:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-6">
                <button
                    onClick={() => router.back()}
                    className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                </button>

                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Post a new <span className="text-primary">opportunity.</span>
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Find talented students on campus to help you with your project.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    )}

                    {!userId && (
                        <div className="rounded-2xl bg-yellow-50 p-6 border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/20">
                            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                                ⚠️ Authentication Required
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                You are not logged in. You can fill out the form, but you'll need to sign in to submit.
                            </p>
                            <button
                                onClick={() => router.push('/auth/login')}
                                className="mt-4 text-sm font-bold underline text-yellow-900 dark:text-yellow-100"
                            >
                                Go to Login
                            </button>
                        </div>
                    )}

                    <motion.form
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Job Title</label>
                            <input
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. React Developer for Campus App"
                                className={`rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-primary/10 dark:bg-zinc-900 dark:text-zinc-100 ${formErrors.title ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-primary dark:border-zinc-800"}`}
                            />
                            {formErrors.title && <p className="text-xs font-medium text-red-500">{formErrors.title}</p>}
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Budget ($)</label>
                                <input
                                    required
                                    type="number"
                                    value={form.budget}
                                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                    placeholder="250"
                                    className={`rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-primary/10 dark:bg-zinc-900 dark:text-zinc-100 ${formErrors.budget ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-primary dark:border-zinc-800"}`}
                                />
                                {formErrors.budget && <p className="text-xs font-medium text-red-500">{formErrors.budget}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Category</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                                >
                                    <option>Development</option>
                                    <option>Design</option>
                                    <option>Writing</option>
                                    <option>Tutoring</option>
                                    <option>Marketing</option>
                                    <option>Photography</option>
                                    <option>Events</option>
                                    <option>Delivery & Errands</option>
                                    <option>Music & Audio</option>
                                    <option>Data & Research</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Description</label>
                            <textarea
                                required
                                rows={5}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Tell us about the project, the scope of work, and what you're looking for..."
                                className={`rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-primary/10 dark:bg-zinc-900 dark:text-zinc-100 ${formErrors.description ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-primary dark:border-zinc-800"}`}
                            />
                            {formErrors.description && <p className="text-xs font-medium text-red-500">{formErrors.description}</p>}
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Required Skills</label>
                            <SkillInput
                                selectedSkills={form.skills}
                                onAddSkill={(skill) => setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }))}
                                onRemoveSkill={(skill) => setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))}
                                placeholder="What skills should the student have? (e.g. Photoshop, Typing)"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black py-4 font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    Post Job
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-2 rounded-2xl bg-primary/5 p-4">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <p className="text-xs text-primary/80">
                                Your job will be visible to all verified students on campus instantly.
                            </p>
                        </div>
                    </motion.form>
                </div>
            </main>
        </div>
    );
}
