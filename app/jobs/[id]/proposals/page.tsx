"use client";

import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    DollarSign,
    User,
    Loader2,
    ExternalLink,
    AlertCircle,
    Calendar,
    ChevronRight,
    MessageSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import type { Job, Profile, Proposal } from "@/types";
import Link from "next/link";
import { toast } from "sonner";

type ProposalWithFreelancer = Proposal & {
    profiles: Profile;
};

export default function JobProposalsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [job, setJob] = useState<Job | null>(null);
    const [proposals, setProposals] = useState<ProposalWithFreelancer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/auth/login');
                    return;
                }
                setCurrentUser(user);

                // Fetch Job details to check ownership
                const { data: jobData, error: jobError } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (jobError) throw jobError;

                if (jobData.client_id !== user.id) {
                    setError("You don't have permission to view proposals for this job.");
                    setLoading(false);
                    return;
                }

                setJob(jobData);

                // Fetch Proposals
                const { data: proposalsData, error: proposalsError } = await supabase
                    .from('proposals')
                    .select('*, profiles(*)')
                    .eq('job_id', id)
                    .order('created_at', { ascending: false });

                if (proposalsError) throw proposalsError;
                setProposals(proposalsData || []);

            } catch (err: any) {
                console.error("Error fetching proposals:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id, router]);

    const handleAcceptProposal = async (proposalId: string, freelancerId: string) => {
        if (!confirm("Are you sure you want to accept this proposal? This will set the job status to 'In Progress'.")) return;

        try {
            setActionLoading(proposalId);

            // 1. Update proposal status to 'accepted'
            const { error: pError } = await supabase
                .from('proposals')
                .update({ status: 'accepted' })
                .eq('id', proposalId);

            if (pError) throw pError;

            // 2. Update job status to 'in-progress'
            const { error: jError } = await supabase
                .from('jobs')
                .update({ status: 'in-progress' })
                .eq('id', id);

            if (jError) throw jError;

            toast.success("Student hired successfully!");

            // 3. Reject other proposals (optional but good for MVP clarity)
            const { error: rError } = await supabase
                .from('proposals')
                .update({ status: 'rejected' })
                .eq('job_id', id)
                .neq('id', proposalId);

            if (rError) console.error("Error rejecting other proposals:", rError);

            // Refresh data
            setTimeout(() => {
                router.refresh();
                window.location.reload();
            }, 1000);

        } catch (err: any) {
            console.error("Error accepting proposal:", err);
            toast.error("Failed to accept proposal: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                <Navbar />
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-zinc-500 font-medium">Loading proposals...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black px-4">
                <Navbar />
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Access Denied</h2>
                    <p className="mt-2 text-zinc-500">{error}</p>
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

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto max-w-5xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8">

                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to job details
                        </button>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                                    Proposals
                                </h1>
                                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                                    Manage applications for <span className="font-semibold text-primary">"{job?.title}"</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-zinc-500">Status:</span>
                                <span className={`capitalize ${job?.status === 'open' ? 'text-green-600' : 'text-primary'}`}>
                                    {job?.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Proposals List */}
                    <div className="flex flex-col gap-6">
                        {proposals.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-zinc-200 py-24 text-center dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                                <MessageSquare className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">No proposals yet</h3>
                                <p className="text-zinc-500">Wait for students to discover your gig and apply.</p>
                            </div>
                        ) : (
                            proposals.map((proposal, index) => (
                                <motion.div
                                    key={proposal.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`group relative overflow-hidden rounded-3xl border bg-white p-6 shadow-xl shadow-black/5 transition-all dark:bg-zinc-950 ${proposal.status === 'accepted'
                                        ? 'border-primary ring-2 ring-primary/10'
                                        : 'border-zinc-200 dark:border-zinc-800'
                                        }`}
                                >
                                    {proposal.status === 'accepted' && (
                                        <div className="absolute top-0 right-0 rounded-bl-2xl bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                            Selected
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-6 md:flex-row">
                                        {/* Freelancer Info */}
                                        <div className="flex shrink-0 flex-col gap-4 md:w-64">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <User className="h-6 w-6" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-50">
                                                        {proposal.profiles?.full_name}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {proposal.profiles?.university || 'Verified Student'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 md:flex md:flex-col">
                                                <div className="flex flex-col gap-0.5 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/50">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bid Amount</span>
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-50">${proposal.bid_amount}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/50">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Est. Time</span>
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-50">{proposal.estimated_days} Days</span>
                                                </div>
                                            </div>

                                            <button className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors">
                                                View Profile <ExternalLink className="h-3 w-3" />
                                            </button>
                                        </div>

                                        {/* Cover Letter & Actions */}
                                        <div className="flex flex-1 flex-col justify-between gap-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cover Letter</span>
                                                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                    {proposal.cover_letter}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-zinc-100 pt-6 dark:border-zinc-900">
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>Applied on {new Date(proposal.created_at).toLocaleDateString()}</span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button className="rounded-full p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                                                        <XCircle className="h-6 w-6" />
                                                    </button>
                                                    {proposal.status === 'accepted' ? (
                                                        <button
                                                            disabled
                                                            className="flex items-center gap-2 rounded-full bg-green-50 px-6 py-2.5 text-sm font-bold text-green-600 dark:bg-green-900/20"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Hired
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAcceptProposal(proposal.id, proposal.freelancer_id)}
                                                            disabled={!!actionLoading || job?.status !== 'open'}
                                                            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                                        >
                                                            {actionLoading === proposal.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                    Hire Student
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
