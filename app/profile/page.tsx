"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    GraduationCap,
    Briefcase,
    Calendar,
    Settings,
    LogOut,
    PenSquare,
    CheckCircle2,
    Clock,
    PlusCircle,
    MapPin,
    Trash2,
    ShieldCheck,
    Github,
    Linkedin,
    Globe,
    Camera,
    Save,
    X as CloseIcon,
    Loader2,
    Star
} from "lucide-react";
import { Loading } from "@/components/Loading";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import type { Profile, Job, Proposal, Review } from "@/types";
import Link from "next/link";
import { toast } from "sonner";
import { uploadToCloudinary, getOptimizedImageUrl } from "@/lib/cloudinary";
import { SkillInput } from "@/components/SkillInput";

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [userJobs, setUserJobs] = useState<Job[]>([]);
    const [userProposals, setUserProposals] = useState<(Proposal & { jobs: Job })[]>([]);
    const [userReviews, setUserReviews] = useState<(
        Review & { reviewer: Profile; jobs?: Pick<Job, "title"> | null }
    )[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'reviews'>('overview');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: "",
        tagline: "",
        bio: "",
        university: "",
        skills: [] as string[],
        social_links: {
            github: "",
            linkedin: "",
            portfolio: ""
        }
    });

    // Rating State
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedJobForRating, setSelectedJobForRating] = useState<(Job & { profiles: Profile }) | null>(null);
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    useEffect(() => {
        async function fetchProfileData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push("/auth/login");
                    return;
                }

                // Fetch Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;
                setProfile(profileData);
                setEditForm({
                    full_name: profileData.full_name || "",
                    tagline: profileData.tagline || "",
                    bio: profileData.bio || "",
                    university: profileData.university || "",
                    skills: profileData.skills || [],
                    social_links: {
                        github: profileData.social_links?.github || "",
                        linkedin: profileData.social_links?.linkedin || "",
                        portfolio: profileData.social_links?.portfolio || "",
                    }
                });

                // If Client, fetch their jobs
                if (profileData.role === 'client') {
                    const { data: jobsData } = await supabase
                        .from('jobs')
                        .select('*')
                        .eq('client_id', user.id)
                        .eq('is_deleted', false)
                        .order('created_at', { ascending: false });
                    setUserJobs(jobsData || []);
                }

                // If Student, fetch their proposals
                if (profileData.role === 'student') {
                    const { data: proposalsData, error: proposalError } = await supabase
                        .from('proposals')
                        .select(`
                            *,
                            jobs (
                                *,
                                profiles:client_id (*)
                            )
                        `)
                        .eq('freelancer_id', user.id)
                        .order('created_at', { ascending: false });

                    if (proposalError) throw proposalError;
                    setUserProposals(proposalsData as any || []);
                }

                // Fetch Reviews — filter by receiver_id AND the role they were reviewed as
                const { data: reviewsData, error: reviewsError } = await supabase
                    .from('reviews')
                    .select('*, jobs(title), reviewer:profiles!reviewer_id(*)')
                    .eq('receiver_id', user.id)
                    .eq('receiver_role', profileData.role)
                    .order('created_at', { ascending: false });

                if (reviewsError) {
                    console.error("Error fetching reviews for current user's profile:", reviewsError);
                } else {
                    setUserReviews(reviewsData as any || []);
                }

            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfileData();
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success("Signed out successfully");
        router.push("/");
        router.refresh();
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        try {
            setIsUploadingAvatar(true);
            const url = await uploadToCloudinary(file);

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: url })
                .eq('id', profile.id);

            if (error) throw error;

            setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
            toast.success("Avatar updated successfully");
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast.error("Failed to upload avatar");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            setIsUpdating(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editForm.full_name,
                    tagline: editForm.tagline,
                    bio: editForm.bio,
                    university: editForm.university,
                    skills: editForm.skills,
                    social_links: editForm.social_links,
                })
                .eq('id', profile.id);

            if (error) throw error;

            setProfile(prev => prev ? {
                ...prev,
                full_name: editForm.full_name,
                tagline: editForm.tagline,
                bio: editForm.bio,
                university: editForm.university,
                skills: editForm.skills,
                social_links: editForm.social_links
            } : null);

            setIsEditModalOpen(false);
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm("Are you sure you want to delete this gig? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('jobs')
                .update({ is_deleted: true })
                .eq('id', jobId);

            if (error) throw error;

            toast.success("Gig deleted successfully");
            setUserJobs(prev => prev.filter(job => job.id !== jobId));
        } catch (error) {
            console.error("Error deleting job:", error);
            toast.error("Failed to delete the gig. Please try again.");
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJobForRating || !profile) return;

        try {
            setIsSubmittingReview(true);
            const { error } = await supabase
                .from('reviews')
                .insert({
                    reviewer_id: profile.id, // The student is the reviewer
                    receiver_id: selectedJobForRating.client_id, // The client is the receiver
                    receiver_role: 'client',
                    job_id: selectedJobForRating.id,
                    rating: rating,
                    comment: reviewComment
                });

            if (error) throw error;

            toast.success("Review submitted successfully!");
            setShowRatingModal(false);
            setSelectedJobForRating(null);
            setRating(5);
            setReviewComment("");
            // Optionally, refresh reviews or update local state
            // For now, just close the modal and show success.
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error("Failed to submit review. Please try again.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                <Navbar />
                <Loading text={null} />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-primary/30 selection:text-primary">
            <Navbar />

            {/* Premium Background Elements */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="mesh-gradient absolute inset-0 opacity-40 dark:opacity-20" />
                <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
            </div>

            <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Sidebar: Profile Summary */}
                    <aside className="lg:col-span-4 flex flex-col gap-8">
                        {/* Profile Card */}
                        <div className="glass-card premium-shadow rounded-[2.5rem] p-8 border border-white/20 dark:border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-lg active-scale"
                                >
                                    <PenSquare className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center text-center gap-6">
                                <div className="relative">
                                    <div className="h-32 w-32 rounded-[2rem] bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-1 shadow-2xl shadow-primary/20">
                                        <div className="h-full w-full rounded-[1.8rem] bg-white dark:bg-zinc-950 flex items-center justify-center p-2 overflow-hidden relative">
                                            {isUploadingAvatar && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                                </div>
                                            )}
                                            {profile.avatar_url ? (
                                                <img
                                                    src={getOptimizedImageUrl(profile.avatar_url, 400, 400)}
                                                    alt={profile.full_name}
                                                    className="h-full w-full object-cover rounded-[1.5rem]"
                                                />
                                            ) : (
                                                <User className="h-16 w-16 text-primary/40" />
                                            )}
                                        </div>
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/5 transition-colors">
                                        <Camera className="h-5 w-5 text-primary" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                                    </label>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                        {profile.full_name}
                                    </h1>
                                    {profile.tagline && (
                                        <p className="text-sm font-semibold text-primary/80 dark:text-primary/60">
                                            {profile.tagline}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary border border-primary/20">
                                            {profile.role}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-xs font-medium italic">
                                    "{profile.bio || "No biography provided. Let the community know who you are!"}"
                                </p>

                                {/* Social Links Quick Access */}
                                {profile.social_links && (Object.values(profile.social_links).some(link => link)) && (
                                    <div className="flex gap-4 pt-2">
                                        {profile.social_links.github && (
                                            <a href={profile.social_links.github} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors">
                                                <Github className="h-5 w-5" />
                                            </a>
                                        )}
                                        {profile.social_links.linkedin && (
                                            <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors">
                                                <Linkedin className="h-5 w-5" />
                                            </a>
                                        )}
                                        {profile.social_links.portfolio && (
                                            <a href={profile.social_links.portfolio} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors">
                                                <Globe className="h-5 w-5" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div className="w-full flex flex-col gap-3 pt-4">
                                    <button className="flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group/btn">
                                        <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
                                        Account Settings
                                    </button>
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600 hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-red-900/20 transition-all hover:border-red-200"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Info Card */}
                        <div className="glass-card premium-shadow rounded-[2rem] p-6 border border-white/20 dark:border-white/10">
                            <h3 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                Details
                            </h3>
                            <div className="flex flex-col gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-800/50">
                                        <GraduationCap className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">University</span>
                                        <span className="text-sm font-bold dark:text-zinc-200">{profile.university}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-800/50">
                                        <Mail className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Verification</span>
                                        <span className="text-sm font-bold dark:text-zinc-200">Verified Marketplace Member</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-800/50">
                                        <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Member Since</span>
                                        <span className="text-sm font-bold dark:text-zinc-200">{new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills Section (Students Only) */}
                        {profile.role === 'student' && (
                            <div className="glass-card premium-shadow rounded-[2rem] p-6 border border-white/20 dark:border-white/10">
                                <h3 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills && profile.skills.length > 0 ? (
                                        profile.skills.map((skill, i) => (
                                            <span key={i} className="rounded-xl bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/10">
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-zinc-400 italic">No skills added yet.</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Right Content Area */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        {/* Stats Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                {
                                    label: 'Rating',
                                    value: userReviews.length > 0
                                        ? (userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length).toFixed(1)
                                        : '5.0',
                                    icon: <Star className="h-5 w-5" />
                                },
                                {
                                    label: 'Completed',
                                    value: profile.role === 'client'
                                        ? userJobs.filter(j => j.status === 'completed').length.toString()
                                        : userProposals.filter(p => p.status === 'accepted' && p.jobs?.status === 'completed').length.toString(),
                                    icon: <Briefcase className="h-5 w-5" />
                                },
                                {
                                    label: profile.role === 'client' ? 'Active Gigs' : 'Applications',
                                    value: profile.role === 'client'
                                        ? userJobs.filter(j => j.status === 'open' || j.status === 'in-progress').length.toString()
                                        : userProposals.length.toString(),
                                    icon: <Clock className="h-5 w-5" />
                                },
                            ].map((stat, i) => (
                                <div key={i} className="glass-card premium-shadow rounded-3xl p-6 border border-white/20 dark:border-white/10 flex flex-col items-center justify-center gap-1 group/stat hover:scale-[1.02] transition-transform">
                                    <div className="text-primary opacity-50 group-hover:opacity-100 transition-opacity mb-2">{stat.icon}</div>
                                    <span className="text-2xl font-black text-zinc-900 dark:text-white">{stat.value}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{stat.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Tabs & Activity */}
                        <div className="glass-card premium-shadow rounded-[2.5rem] p-8 border border-white/20 dark:border-white/10 min-h-[500px]">
                            <div className="flex items-center gap-8 border-b border-zinc-200 dark:border-zinc-800 h-16">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`h-full text-sm font-black uppercase tracking-widest transition-all relative px-2 ${activeTab === 'overview' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    My Feed
                                    {activeTab === 'overview' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`h-full text-sm font-black uppercase tracking-widest transition-all relative px-2 ${activeTab === 'activity' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    {profile.role === 'client' ? 'Gigs Posted' : 'Applications'}
                                    {activeTab === 'activity' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('reviews')}
                                    className={`h-full text-sm font-black uppercase tracking-widest transition-all relative px-2 ${activeTab === 'reviews' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Reviews ({userReviews.length})
                                    {activeTab === 'reviews' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                            </div>

                            <div className="pt-8">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'overview' ? (
                                        <motion.div
                                            key="overview"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex flex-col gap-6"
                                        >
                                            <div className="p-8 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center gap-4">
                                                <div className="h-20 w-20 rounded-[1.5rem] bg-primary/5 flex items-center justify-center">
                                                    <Clock className="h-10 w-10 text-primary opacity-20" />
                                                </div>
                                                <h4 className="text-xl font-bold text-zinc-900 dark:text-white">Recent Updates</h4>
                                                <p className="text-zinc-500 text-sm max-w-sm">
                                                    You don't have any recent notifications or status changes. Keep active to build your campus reputation!
                                                </p>
                                                <Link href="/jobs" className="mt-2 rounded-2xl bg-zinc-900 dark:bg-white px-8 py-3 text-sm font-bold text-white dark:text-black hover:scale-105 transition-transform active-scale">
                                                    Explore Opportunities
                                                </Link>
                                            </div>
                                        </motion.div>
                                    ) : activeTab === 'activity' ? (
                                        <motion.div
                                            key="activity"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="flex flex-col gap-6"
                                        >
                                            {profile.role === 'client' ? (
                                                <>
                                                    {userJobs.length === 0 ? (
                                                        <div className="rounded-[2rem] border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
                                                            <Briefcase className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                                                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No active gigs found.</p>
                                                            <Link href="/jobs/create" className="mt-4 inline-flex items-center gap-2 font-black text-primary hover:gap-3 transition-all">
                                                                Build a project <PlusCircle className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        userJobs.map((job) => (
                                                            <div key={job.id} className="group relative">
                                                                <Link href={`/jobs/${job.id}`}>
                                                                    <div className="rounded-3xl border border-zinc-200/50 bg-white/50 dark:bg-zinc-900/50 dark:border-zinc-800/50 p-6 shadow-xl shadow-black/5 hover:border-primary/50 transition-all group-hover:-translate-y-1">
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex flex-col gap-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                                        <Briefcase className="h-4 w-4 text-primary" />
                                                                                    </div>
                                                                                    <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{job.title}</h4>
                                                                                </div>
                                                                                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                                    <span className="flex items-center gap-2"><Calendar className="h-3 w-3" /> {new Date(job.created_at).toLocaleDateString()}</span>
                                                                                    <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {job.location || 'Remote'}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col items-end gap-2 pr-12">
                                                                                <span className="text-xl font-black text-primary">${job.budget}</span>
                                                                                <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] border ${job.status === 'open' ? 'bg-green-100/50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-primary/5 text-primary border-primary/20'
                                                                                    }`}>
                                                                                    {job.status}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleDeleteJob(job.id);
                                                                    }}
                                                                    className="absolute top-6 right-6 p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                                    title="Remove Gig"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {userProposals.length === 0 ? (
                                                        <div className="rounded-[2rem] border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
                                                            <Briefcase className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                                                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No proposals sent.</p>
                                                            <Link href="/jobs" className="mt-4 inline-flex items-center gap-2 font-black text-primary hover:gap-3 transition-all">
                                                                Find opportunities <PlusCircle className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        userProposals.map((proposal) => (
                                                            <Link key={proposal.id} href={`/jobs/${proposal.job_id}`}>
                                                                <div className="group rounded-3xl border border-zinc-200/50 bg-white/50 dark:bg-zinc-900/50 dark:border-zinc-800/50 p-6 shadow-xl shadow-black/5 hover:border-primary/50 transition-all hover:-translate-y-1">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex flex-col gap-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                                    <PlusCircle className="h-4 w-4 text-primary" />
                                                                                </div>
                                                                                <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{proposal.jobs?.title}</h4>
                                                                            </div>
                                                                            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                                <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> Submitted {new Date(proposal.created_at).toLocaleDateString()}</span>
                                                                                <span className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> {proposal.jobs?.category}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-2">
                                                                            <span className="text-xl font-black text-primary">${proposal.bid_amount}</span>
                                                                            <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] border ${proposal.status === 'accepted'
                                                                                ? proposal.jobs?.status === 'completed'
                                                                                    ? 'bg-zinc-100/50 text-zinc-500 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800'
                                                                                    : 'bg-green-100/50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                                                                : proposal.status === 'pending'
                                                                                    ? 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                                                                                    : 'bg-red-50 text-red-600 border-red-200'
                                                                                }`}>
                                                                                {proposal.status === 'accepted'
                                                                                    ? proposal.jobs?.status === 'completed'
                                                                                        ? 'Completed'
                                                                                        : 'Hired / In Progress'
                                                                                    : proposal.status}
                                                                            </span>

                                                                            {proposal.status === 'accepted' && proposal.jobs?.status === 'completed' && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        setSelectedJobForRating(proposal.jobs as any);
                                                                                        setShowRatingModal(true);
                                                                                    }}
                                                                                    className="mt-2 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-primary hover:bg-primary transition-all hover:text-white"
                                                                                >
                                                                                    <Star className="h-2 w-2 fill-current" />
                                                                                    Rate Client
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))
                                                    )}
                                                </>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="reviews"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="flex flex-col gap-6"
                                        >
                                            {userReviews.length === 0 ? (
                                                <div className="rounded-[2rem] border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
                                                    <Star className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No reviews yet.</p>
                                                    <p className="text-zinc-400 text-sm mt-2">Complete gigs to start building your campus rating!</p>
                                                </div>
                                            ) : (
                                                userReviews.map((review) => (
                                                    <div key={review.id} className="glass-card premium-shadow rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-4">
                                                        <div className="flex items-center justify-between">
                                                            <Link href={`/profile/${review.reviewer_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                                    {review.reviewer?.avatar_url ? (
                                                                        <img src={getOptimizedImageUrl(review.reviewer.avatar_url, 100, 100)} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <User className="h-5 w-5 text-primary" />
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{review.reviewer?.full_name || 'Anonymous User'}</span>
                                                                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{new Date(review.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </Link>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3, 4, 5].map((num) => (
                                                                        <Star key={num} className={`h-4 w-4 ${review.rating >= num ? 'text-primary fill-current' : 'text-zinc-200 dark:text-zinc-800'}`} />
                                                                    ))}
                                                                </div>
                                                                {review.jobs?.title && (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{review.jobs.title}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-zinc-600 dark:text-zinc-400 text-sm italic font-medium">
                                                            "{review.comment || "No comment left."}"
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            {/* Profile Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditModalOpen(false)}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            className="fixed right-0 top-0 z-[60] h-full w-full max-w-md bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800"
                        >
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-6">
                                    <h2 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white">Edit Profile</h2>
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="rounded-xl p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <CloseIcon className="h-6 w-6 text-zinc-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {/* Name Field */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Full Name</label>
                                        <input
                                            type="text"
                                            value={editForm.full_name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="Your full name"
                                            required
                                        />
                                    </div>

                                    {/* Tagline Field */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Professional Headline (Tagline)</label>
                                        <input
                                            type="text"
                                            value={editForm.tagline}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, tagline: e.target.value.slice(0, 80) }))}
                                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="e.g. Creative UI/UX Designer | Next.js Developer"
                                        />
                                    </div>

                                    {/* University Field */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">University</label>
                                        <input
                                            type="text"
                                            value={editForm.university}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, university: e.target.value }))}
                                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="Your university"
                                            required
                                        />
                                    </div>

                                    {/* Skills Field (Student) */}
                                    {profile.role === 'student' && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Professional Skills</label>
                                            <SkillInput
                                                selectedSkills={editForm.skills}
                                                onAddSkill={(skill) => setEditForm(prev => ({ ...prev, skills: [...prev.skills, skill] }))}
                                                onRemoveSkill={(skill) => setEditForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))}
                                                placeholder="Search or add skills..."
                                            />
                                        </div>
                                    )}

                                    {/* Social Links */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Social & Links</label>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <input
                                                    type="url"
                                                    value={editForm.social_links.portfolio}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, social_links: { ...prev.social_links, portfolio: e.target.value } }))}
                                                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-12 pr-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                                    placeholder="Portfolio URL"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                                    <Globe className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="url"
                                                    value={editForm.social_links.github}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, social_links: { ...prev.social_links, github: e.target.value } }))}
                                                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-12 pr-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                                    placeholder="GitHub URL"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                                    <Github className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="url"
                                                    value={editForm.social_links.linkedin}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, social_links: { ...prev.social_links, linkedin: e.target.value } }))}
                                                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-12 pr-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                                    placeholder="LinkedIn URL"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                                    <Linkedin className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio Field */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Biography</label>
                                            <span className="text-[10px] text-zinc-400">{editForm.bio.length} / 250</span>
                                        </div>
                                        <textarea
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value.slice(0, 250) }))}
                                            rows={5}
                                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                                            placeholder="Tell the community about yourself..."
                                        />
                                    </div>
                                </form>

                                <div className="border-t border-zinc-200 dark:border-zinc-800 p-6">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={isUpdating}
                                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* Rating Modal */}
            <AnimatePresence>
                {showRatingModal && selectedJobForRating && (
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
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Rate {selectedJobForRating.profiles?.full_name || 'the client'}</h2>
                                    <p className="text-zinc-500 text-sm">
                                        How was your experience working for <span className="font-bold text-primary">{selectedJobForRating.profiles?.full_name || 'this client'}</span>?
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
                                            placeholder="Write a brief review about the collaboration..."
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
        </div >
    );
}
