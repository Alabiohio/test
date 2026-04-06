"use client";

import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Briefcase, Calendar, Clock, DollarSign, MapPin, Share2, ShieldCheck, User, Loader2, X, Send, CheckCircle2, AlertCircle, Trash2, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Loading } from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import type { Job, Profile, Proposal } from "@/types";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import Link from "next/link";
import { Star } from "lucide-react";

type JobWithClient = Job & {
    profiles: Profile;
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [job, setJob] = useState<JobWithClient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Proposal States
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [form, setForm] = useState({
        coverLetter: "",
        bidAmount: "",
        estimatedDays: "3"
    });
    const [success, setSuccess] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

    // Rating / Completion States
    const [acceptedProposal, setAcceptedProposal] = useState<(Proposal & { profiles: Profile }) | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                // Fetch Job with client profile (left join, so profile is optional)
                const { data: jobData, error: jobError } = await supabase
                    .from('jobs')
                    .select(`
                        *,
                        profiles (
                            id,
                            full_name,
                            email,
                            university,
                            created_at
                        )
                    `)
                    .eq('id', id)
                    .eq('is_deleted', false)
                    .maybeSingle();

                if (jobError) {
                    throw new Error(jobError.message || 'Failed to fetch job details');
                }

                if (!jobData) {
                    throw new Error('Job not found');
                }

                setJob(jobData);

                if (jobData.budget) {
                    setForm(prev => ({ ...prev, bidAmount: jobData.budget.toString() }));
                }

                // Fetch current user and check if applied
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setCurrentUser(user);

                    // Check if user has applied
                    const { data: proposal } = await supabase
                        .from('proposals')
                        .select('id')
                        .eq('job_id', id)
                        .eq('freelancer_id', user.id)
                        .maybeSingle();

                    if (proposal) setHasApplied(true);

                    // Fetch accepted proposal for the job to show hiring status
                    const { data: acceptedProp } = await supabase
                        .from('proposals')
                        .select('*, profiles(*)')
                        .eq('job_id', id)
                        .eq('status', 'accepted')
                        .maybeSingle();

                    if (acceptedProp) setAcceptedProposal(acceptedProp as any);
                }
            } catch (err: any) {
                setError(err?.message || 'An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            router.push('/auth/login');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const { error: submitError } = await supabase
                .from('proposals')
                .insert([
                    {
                        job_id: id,
                        freelancer_id: currentUser.id,
                        cover_letter: form.coverLetter,
                        bid_amount: parseInt(form.bidAmount),
                        estimated_days: parseInt(form.estimatedDays),
                        status: 'pending'
                    }
                ]);

            if (submitError) throw submitError;

            toast.success("Proposal submitted successfully!");
            setSuccess(true);
            setHasApplied(true);
            setTimeout(() => {
                setShowApplyModal(false);
                setSuccess(false);
            }, 3000);
        } catch (err: any) {
            console.error("Error submitting proposal:", err);
            toast.error(err.message || "Failed to submit proposal");
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this gig? This action cannot be undone.")) return;

        setSubmitting(true);
        try {
            const { error: deleteError } = await supabase
                .from('jobs')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            toast.success("Gig deleted successfully");
            router.push('/profile');
            router.refresh();
        } catch (err: any) {
            console.error("Error deleting job:", err);
            toast.error(err.message || "Failed to delete the gig.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReport = async () => {
        if (!currentUser) {
            router.push('/auth/login');
            return;
        }

        const reason = window.prompt("Why are you reporting this gig? (e.g., suspicious, spam, inappropriate)");
        if (!reason) return;

        try {
            setIsReporting(true);
            const { error: reportError } = await supabase
                .from('reports')
                .insert([{
                    reporter_id: currentUser.id,
                    item_id: id,
                    item_type: 'job',
                    reason: reason
                }]);

            if (reportError) throw reportError;
            toast.success("Thank you. Our team will review this listing shortly.");
        } catch (err: any) {
            console.error("Error reporting job:", err);
            toast.error("Failed to submit report. Please try again.");
        } finally {
            setIsReporting(false);
        }
    };

    const handleCompleteJob = async () => {
        if (!confirm("Are you sure this work is satisfactory? This will approve the work and release funds to the student.")) return;

        setSubmitting(true);
        try {
            // Find orderId for this job - we know there's one if it's hired
            const { data: order } = await supabase
                .from('orders')
                .select('id')
                .eq('job_id', id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!order) throw new Error("No active order found for this gig.");

            const response = await fetch('/api/orders/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to approve work");

            setJob(prev => prev ? { ...prev, status: 'completed' } : null);
            setShowRatingModal(true);
            toast.success("Work approved and funds released!");
        } catch (err: any) {
            console.error("Error approving job:", err);
            toast.error(err.message || "Failed to approve the work.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitWork = async () => {
        if (!confirm("Are you ready to submit your work for review? The client will be notified to approve and release your payment.")) return;

        setSubmitting(true);
        try {
            const { data: order } = await supabase
                .from('orders')
                .select('id')
                .eq('job_id', id)
                .eq('freelancer_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!order) throw new Error("No active order found for your application.");

            const response = await fetch('/api/orders/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to submit work");

            setJob(prev => prev ? { ...prev, status: 'submitted' } : null);
            toast.success("Work submitted successfully! Client has been notified.");
        } catch (err: any) {
            console.error("Error submitting work:", err);
            toast.error(err.message || "Failed to submit work.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !acceptedProposal) return;

        setIsSubmittingReview(true);
        try {
            const { error: reviewError } = await supabase
                .from('reviews')
                .insert([{
                    job_id: id,
                    reviewer_id: currentUser.id,
                    receiver_id: acceptedProposal.freelancer_id,
                    receiver_role: 'student',
                    rating: rating,
                    comment: reviewComment
                }]);

            if (reviewError) throw reviewError;

            toast.success("Rating submitted! Thank you for your feedback.");
            setShowRatingModal(false);
        } catch (err: any) {
            console.error("Error submitting review:", err);
            toast.error(err.message || "Failed to submit rating. You might have already rated this job.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                <Navbar />
                <Loading text="Loading gig details..." />
            </div>
        );
    }

    if (error && !showApplyModal) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black px-4">
                <Navbar />
                <div className="max-w-md text-center">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Job not found</h2>
                    <p className="mt-2 text-zinc-500">The job you're looking for might have been removed or doesn't exist.</p>
                    <button
                        onClick={() => router.push('/jobs')}
                        className="mt-6 rounded-full bg-black px-6 py-2 text-white dark:bg-white dark:text-black"
                    >
                        Return to Jobs
                    </button>
                </div>
            </div>
        );
    }

    if (!job) return null;

    const isOwner = currentUser?.id === job.client_id;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-3">

                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <button
                            onClick={() => router.back()}
                            className="mb-6 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to search
                        </button>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            <div className="p-8 sm:p-12">
                                {acceptedProposal?.freelancer_id === currentUser?.id && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mb-8 rounded-3xl bg-primary/5 p-6 border border-primary/20 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <CheckCircle2 className="h-24 w-24 text-primary" />
                                        </div>
                                        <div className="h-16 w-16 rounded-[2rem] bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/30">
                                            <CheckCircle2 className="h-8 w-8" />
                                        </div>
                                        <div className="text-center sm:text-left relative z-10">
                                            <h4 className="text-xl font-black text-primary mb-1 tracking-tight">You're Hired for this Gig!</h4>
                                            <p className="text-sm font-medium text-primary/70 leading-relaxed">
                                                Great work! The client has selected your proposal. Start collaborating via <Link href={`/messages?user=${job.client_id}`} className="font-bold underline">Messages</Link> to get things moving.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                                            {job.category}
                                        </span>
                                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                                            {job.title}
                                        </h1>
                                        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-4 w-4" />
                                                Posted {new Date(job.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4" />
                                                {job.location || 'Remote'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="rounded-full border border-zinc-200 p-2.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900">
                                            <Share2 className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={handleReport}
                                            disabled={isReporting}
                                            title="Report this listing"
                                            className="rounded-full border border-zinc-200 p-2.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:border-zinc-800 dark:hover:bg-red-900/20 transition-all"
                                        >
                                            <Flag className={`h-5 w-5 ${isReporting ? 'animate-pulse' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-10 grid grid-cols-2 gap-4 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900/50 sm:grid-cols-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-zinc-500">Budget</span>
                                        <span className="text-lg font-bold">${job.budget}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-zinc-500">Status</span>
                                        <span className="text-lg font-bold capitalize">{job.status}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-zinc-500">Level</span>
                                        <span className="text-lg font-bold">Standard</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-zinc-500">Proposals</span>
                                        <span className="text-lg font-bold">New</span>
                                    </div>
                                </div>

                                <div className="prose prose-zinc dark:prose-invert max-w-none">
                                    <h3 className="text-xl font-bold">Job Description</h3>
                                    <div className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        {job.description}
                                    </div>
                                </div>

                                {job.skills_required && job.skills_required.length > 0 && (
                                    <div className="mt-12">
                                        <h3 className="mb-4 text-xl font-bold">Skills Required</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {job.skills_required.map(skill => (
                                                <span key={skill} className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar / Actions */}
                    <div className="flex flex-col gap-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="sticky top-24 flex flex-col gap-6"
                        >
                            {/* Apply Card */}
                             <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                                {hasApplied ? (
                                    acceptedProposal?.freelancer_id === currentUser?.id ? (
                                        <div className="flex flex-col gap-4">
                                            {job.status === 'in_progress' && (
                                                <button
                                                    onClick={handleSubmitWork}
                                                    disabled={submitting}
                                                    className="w-full rounded-2xl bg-primary py-4 text-center font-bold text-white hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                                    Submit Work
                                                </button>
                                            )}
                                            {job.status === 'submitted' && (
                                                <div className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
                                                    <Clock className="h-6 w-6 text-primary" />
                                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Awaiting Approval</span>
                                                    <p className="text-center text-[10px] text-zinc-400">
                                                        You've submitted your work. Your payment will be released once the client approves.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-50 p-4 dark:bg-green-900/20">
                                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                                            <span className="font-bold text-green-700 dark:text-green-300">Application Sent</span>
                                            <p className="text-center text-xs text-green-600/80 dark:text-green-400/80">
                                                The client has been notified. We'll let you know if they respond!
                                            </p>
                                        </div>
                                    )
                                ) : isOwner ? (
                                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary/10 p-4">
                                        <span className="font-bold text-primary">This is your job</span>
                                        <button
                                            onClick={() => router.push(`/jobs/${id}/proposals`)}
                                            className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-white hover:bg-primary/90"
                                        >
                                            View Proposals
                                        </button>
                                        {(job.status === 'in_progress' || job.status === 'submitted') && (
                                            <button
                                                onClick={handleCompleteJob}
                                                disabled={submitting || job.status === 'in_progress'}
                                                className={`w-full rounded-xl py-2 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${job.status === 'in_progress' ? 'bg-zinc-400 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-700'}`}
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                {job.status === 'in_progress' ? 'Hired - Awaiting Submission' : 'Approve & Release Funds'}
                                            </button>
                                        )}
                                        {job.status === 'completed' && acceptedProposal && (
                                            <button
                                                onClick={() => setShowRatingModal(true)}
                                                className="w-full rounded-xl bg-zinc-900 py-2 text-sm font-bold text-white hover:bg-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <Star className="h-4 w-4" />
                                                Rate Student
                                            </button>
                                        )}
                                        <button
                                            disabled={submitting}
                                            onClick={handleDelete}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Gig
                                        </button>
                                    </div>
                                ) : (
                                    job.status === 'open' ? (
                                        <button
                                            onClick={() => setShowApplyModal(true)}
                                            className="mb-4 w-full rounded-2xl bg-black py-4 text-center font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-all shadow-lg"
                                        >
                                            Submit a Proposal
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
                                            <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Gig is Closed</span>
                                            <p className="text-center text-[10px] text-zinc-400">
                                                {job.status === 'completed' ? 'This project has been completed.' : 'A freelancer has already been hired for this gig.'}
                                            </p>
                                        </div>
                                    )
                                )}
                                <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    Secure payment guaranteed by Campwork
                                </p>
                            </div>

                            {/* Client Info */}
                            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-400">About the Client</h4>
                                <Link href={`/profile/${job.client_id}`} className="group/client flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover/client:bg-primary group-hover/client:text-white transition-colors">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold group-hover/client:text-primary transition-colors">{job.profiles?.full_name || 'Alumni Member'}</span>
                                        <span className="text-xs text-zinc-500">{job.profiles?.university || 'Verified Campus User'}</span>
                                    </div>
                                </Link>
                                <div className="mt-6 flex flex-col gap-4 border-t border-zinc-100 pt-6 dark:border-zinc-900">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Member Since</span>
                                        <span className="font-medium">
                                            {job.profiles?.created_at ? new Date(job.profiles.created_at).getFullYear() : '2026'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Identity Verified</span>
                                        <span className="font-medium text-green-600">Yes</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </main>
            <Footer />

            {/* Proposal Modal */}
            <AnimatePresence>
                {showApplyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !submitting && setShowApplyModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            {success ? (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                                        <CheckCircle2 className="h-10 w-10" />
                                    </div>
                                    <h2 className="mb-2 text-2xl font-bold">Proposal Submitted!</h2>
                                    <p className="text-zinc-500">Your application has been sent to the client.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-8 flex items-center justify-between">
                                        <h2 className="text-2xl font-bold">Apply for this gig</h2>
                                        <button
                                            onClick={() => setShowApplyModal(false)}
                                            className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleApply} className="flex flex-col gap-6">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-semibold">Your Pitch</label>
                                            <textarea
                                                required
                                                rows={5}
                                                value={form.coverLetter}
                                                onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                                                placeholder="Tell the client why you're a great fit for this job..."
                                                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                                            />
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold">Bid Amount ($)</label>
                                                <input
                                                    required
                                                    type="number"
                                                    value={form.bidAmount}
                                                    onChange={(e) => setForm({ ...form, bidAmount: e.target.value })}
                                                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold">Est. Time (Days)</label>
                                                <input
                                                    required
                                                    type="number"
                                                    value={form.estimatedDays}
                                                    onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                                                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-800 dark:bg-zinc-900"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="flex items-center gap-2 text-sm text-red-600">
                                                <AlertCircle className="h-4 w-4" />
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <Loading size={24} text="" />
                                            ) : (
                                                <>
                                                    <Send className="h-5 w-5" />
                                                    Send Proposal
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rating Modal */}
            <AnimatePresence>
                {showRatingModal && acceptedProposal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRatingModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            <div className="flex flex-col items-center text-center gap-6">
                                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Star className="h-10 w-10 text-primary" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Rate {acceptedProposal.profiles?.full_name}</h2>
                                    <p className="text-zinc-500 text-sm">
                                        How was your experience working with <span className="font-bold text-primary">{acceptedProposal.profiles?.full_name}</span>?
                                    </p>
                                </div>

                                <form onSubmit={handleSubmitReview} className="w-full space-y-6">
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setRating(num)}
                                                className={`p-2 transition-all ${rating >= num ? 'text-primary' : 'text-zinc-200 dark:text-zinc-800 hover:text-primary/40'}`}
                                            >
                                                <Star className={`h-8 w-8 ${rating >= num ? 'fill-current' : ''}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Leave a comment</label>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            rows={4}
                                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                                            placeholder="Write a brief review about the work..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {isSubmittingReview ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Rating"}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
