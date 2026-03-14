"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    GraduationCap,
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    MapPin,
    Github,
    Linkedin,
    Globe,
    Star,
    MessageSquare,
    ArrowLeft
} from "lucide-react";
import { Loading } from "@/components/Loading";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import type { Profile, Job, Proposal, Review } from "@/types";
import Link from "next/link";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [userJobs, setUserJobs] = useState<Job[]>([]);
    const [userProposals, setUserProposals] = useState<(Proposal & { jobs: Job })[]>([]);
    const [userReviews, setUserReviews] = useState<(
        Review & { reviewer: Profile; jobs?: Pick<Job, "title"> | null }
    )[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'reviews'>('overview');
    const [direction, setDirection] = useState(0);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const handleTabChange = (newTab: 'overview' | 'activity' | 'reviews') => {
        const tabs: ('overview' | 'activity' | 'reviews')[] = ['overview', 'activity', 'reviews'];
        const oldIndex = tabs.indexOf(activeTab);
        const newIndex = tabs.indexOf(newTab);
        setDirection(newIndex > oldIndex ? 50 : -50);
        setActiveTab(newTab);
    };

    useEffect(() => {
        async function fetchProfileData() {
            try {
                setLoading(true);

                // Get current user to see if it's their own profile
                const { data: { user: authUser } } = await supabase.auth.getUser();
                setCurrentUser(authUser);

                // Fetch Public Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (profileError) {
                    console.error("Profile not found:", profileError);
                    setProfile(null);
                    return;
                }

                setProfile(profileData);

                // If Client, fetch their open/completed jobs
                if (profileData.role === 'client') {
                    const { data: jobsData } = await supabase
                        .from('jobs')
                        .select('*')
                        .eq('client_id', id)
                        .eq('is_deleted', false)
                        .order('created_at', { ascending: false });
                    setUserJobs(jobsData || []);
                }

                // If Student, fetch their proposals for context (maybe just completed ones for public view)
                if (profileData.role === 'student') {
                    const { data: proposalsData } = await supabase
                        .from('proposals')
                        .select('*, jobs(*)')
                        .eq('freelancer_id', id)
                        .eq('status', 'accepted') // Only show hired gigs publically
                        .order('created_at', { ascending: false });
                    setUserProposals(proposalsData as any || []);
                }

                // Fetch Reviews — filter by receiver_id AND the role they were reviewed as
                const { data: reviewsData, error: reviewsError } = await supabase
                    .from('reviews')
                    .select('*, jobs(title), reviewer:profiles!reviewer_id(*)')
                    .eq('receiver_id', id)
                    .eq('receiver_role', profileData.role)
                    .order('created_at', { ascending: false });

                if (reviewsError) {
                    console.error("Error fetching reviews for public profile:", reviewsError);
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
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                <Navbar />
                <Loading text="Loading profile..." />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                <Navbar />
                <div className="text-center">
                    <User className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                    <h2 className="text-2xl font-bold dark:text-white">Profile not found</h2>
                    <p className="text-zinc-500 mt-2">The user you're looking for doesn't exist or has a private profile.</p>
                    <button onClick={() => router.back()} className="mt-6 text-primary font-bold flex items-center gap-2 mx-auto hover:underline">
                        <ArrowLeft className="h-4 w-4" /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isOwnProfile = currentUser?.id === profile.id;

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
                        <div className="glass-card premium-shadow rounded-[2.5rem] p-8 border border-white/20 dark:border-white/10 relative overflow-hidden group">
                            <div className="flex flex-col items-center text-center gap-6">
                                <div className="relative">
                                    <div className="h-32 w-32 rounded-[2rem] bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-1 shadow-2xl shadow-primary/20">
                                        <div className="h-full w-full rounded-[1.8rem] bg-white dark:bg-zinc-950 flex items-center justify-center p-2 overflow-hidden relative">
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
                                    "{profile.bio || "No biography provided yet."}"
                                </p>

                                {/* Social Links */}
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

                                <div className="w-full pt-4">
                                    {isOwnProfile ? (
                                        <Link href="/profile" className="flex items-center justify-center gap-3 w-full rounded-2xl bg-zinc-900 dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-black hover:scale-[1.02] transition-all shadow-xl active-scale">
                                            Edit My Profile
                                        </Link>
                                    ) : (
                                        <Link href={`/messages?user=${profile.id}`} className="flex items-center justify-center gap-3 w-full rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group/btn active-scale">
                                            <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                            Send Message
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details */}
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
                                        <span className="text-sm font-bold dark:text-zinc-200">{profile.university || 'Verified Institution'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-800/50">
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</span>
                                        <span className="text-sm font-bold dark:text-zinc-200">Verified Marketplace Member</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills */}
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
                                        <span className="text-xs text-zinc-400 italic">No skills listed.</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Right Content Area */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        {/* Stats */}
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
                                        : userProposals.filter(p => p.jobs?.status === 'completed').length.toString(),
                                    icon: <Briefcase className="h-5 w-5" />
                                },
                                {
                                    label: profile.role === 'client' ? 'Gigs Posted' : 'Hired Gigs',
                                    value: profile.role === 'client'
                                        ? userJobs.length.toString()
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

                        {/* Tabs */}
                        <div className="glass-card premium-shadow rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 border border-white/20 dark:border-white/10 min-h-[500px]">
                            <div className="flex items-center gap-4 sm:gap-8 border-b border-zinc-200 dark:border-zinc-800 h-14 sm:h-16 overflow-x-auto scrollbar-hide w-full">
                                <button
                                    onClick={() => handleTabChange('overview')}
                                    className={`h-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative px-2 whitespace-nowrap shrink-0 ${activeTab === 'overview' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Overview
                                    {activeTab === 'overview' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                                <button
                                    onClick={() => handleTabChange('activity')}
                                    className={`h-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative px-2 whitespace-nowrap shrink-0 ${activeTab === 'activity' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    {profile.role === 'client' ? 'Gigs' : 'History'}
                                    {activeTab === 'activity' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                                <button
                                    onClick={() => handleTabChange('reviews')}
                                    className={`h-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative px-2 whitespace-nowrap shrink-0 ${activeTab === 'reviews' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Reviews ({userReviews.length})
                                    {activeTab === 'reviews' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                                </button>
                            </div>

                            <div className="pt-6 sm:pt-8">
                                <AnimatePresence mode="wait" custom={direction}>
                                    {activeTab === 'overview' ? (
                                        <motion.div
                                            key="overview"
                                            initial={{ opacity: 0, x: direction, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -direction, scale: 0.95 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="flex flex-col gap-6"
                                        >
                                            <div className="prose prose-zinc dark:prose-invert max-w-none">
                                                <h4 className="text-xl font-bold dark:text-white">About {profile.full_name}</h4>
                                                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                    {profile.bio || "This user hasn't written a biography yet."}
                                                </p>

                                                {profile.role === 'student' && profile.skills && profile.skills.length > 0 && (
                                                    <div className="mt-8">
                                                        <h5 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Competencies</h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {profile.skills.map((skill, i) => (
                                                                <span key={i} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-bold">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : activeTab === 'activity' ? (
                                        <motion.div
                                            key="activity"
                                            initial={{ opacity: 0, x: direction }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -direction }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="flex flex-col gap-6"
                                        >
                                            {profile.role === 'client' ? (
                                                userJobs.length === 0 ? (
                                                    <div className="text-center py-12 text-zinc-500">No active gigs posted.</div>
                                                ) : (
                                                    userJobs.map((job) => (
                                                        <Link key={job.id} href={`/jobs/${job.id}`}>
                                                            <div className="rounded-[1.5rem] sm:rounded-3xl border border-zinc-200/50 bg-white/50 dark:bg-zinc-900/50 dark:border-zinc-800/50 p-4 sm:p-6 shadow-xl shadow-black/5 hover:border-primary/50 transition-all hover:-translate-y-1">
                                                                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0">
                                                                    <div className="flex flex-col gap-3">
                                                                        <h4 className="text-base sm:text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">{job.title}</h4>
                                                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                            <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {job.location || 'Remote'}</span>
                                                                            <span className={`px-2 py-0.5 rounded-full border max-w-max ${job.status === 'open' ? 'text-green-600 border-green-200 bg-green-50' : 'text-primary border-primary/20 bg-primary/5'}`}>{job.status}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-row sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50 dark:border-zinc-800/50 sm:border-transparent mt-2 sm:mt-0">
                                                                        <span className="text-xl font-black text-primary">${job.budget}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))
                                                )
                                            ) : (
                                                userProposals.length === 0 ? (
                                                    <div className="text-center py-12 text-zinc-500">No completed project history yet.</div>
                                                ) : (
                                                    userProposals.map((proposal) => (
                                                        <div key={proposal.id} className="rounded-[1.5rem] sm:rounded-3xl border border-zinc-200/50 bg-white/50 dark:bg-zinc-900/50 dark:border-zinc-800/50 p-4 sm:p-6 shadow-xl shadow-black/5">
                                                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0">
                                                                <div className="flex flex-col gap-2">
                                                                    <h4 className="text-base sm:text-lg font-bold line-clamp-2">{proposal.jobs?.title}</h4>
                                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                        Completed Project
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-row sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50 dark:border-zinc-800/50 sm:border-transparent mt-2 sm:mt-0">
                                                                    <span className="text-sm font-bold text-zinc-500">{new Date(proposal.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="reviews"
                                            initial={{ opacity: 0, x: direction }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -direction }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="flex flex-col gap-6"
                                        >
                                            {userReviews.length === 0 ? (
                                                <div className="text-center py-12 text-zinc-500">No reviews yet.</div>
                                            ) : (
                                                userReviews.map((review) => (
                                                    <div key={review.id} className="glass-card premium-shadow rounded-[1.5rem] sm:rounded-3xl p-4 sm:p-6 border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-4">
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                                                            <Link href={`/profile/${review.reviewer_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {review.reviewer?.avatar_url ? (
                                                                        <img src={getOptimizedImageUrl(review.reviewer.avatar_url, 100, 100)} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <User className="h-5 w-5 text-primary" />
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">{review.reviewer?.full_name || 'Anonymous User'}</span>
                                                                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{new Date(review.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </Link>
                                                            <div className="flex flex-row sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-end gap-2 sm:gap-1 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50 dark:border-zinc-800/50 sm:border-transparent">
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3, 4, 5].map((num) => (
                                                                        <Star key={num} className={`h-3 w-3 sm:h-4 sm:w-4 ${review.rating >= num ? 'text-primary fill-current' : 'text-zinc-200 dark:text-zinc-800'}`} />
                                                                    ))}
                                                                </div>
                                                                {review.jobs?.title && (
                                                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary/60 line-clamp-1 text-right max-w-[150px] sm:max-w-[200px]">{review.jobs.title}</span>
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
                    </div >
                </div >
            </main >
            <Footer />
        </div >
    );
}
