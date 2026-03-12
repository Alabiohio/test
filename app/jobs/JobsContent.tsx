"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, SlidersHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { JobCard } from "@/components/JobCard";
import { JobCardSkeleton } from "@/components/skeletons/JobCardSkeleton";
import { Loading } from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/types";
import Link from "next/link";
import { Footer } from "@/components/Footer";

const CATEGORIES = ["All", "Development", "Design", "Marketing", "Education", "Events"];

interface JobsContentProps {
    initialJobs: Job[];
}

export function JobsContent({ initialJobs }: JobsContentProps) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Advanced Filter states
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [location, setLocation] = useState("");
    const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

    useEffect(() => {
        const storedIds = localStorage.getItem('recently_viewed_jobs');
        if (storedIds) {
            setRecentlyViewedIds(JSON.parse(storedIds));
        }
    }, []);

    const addToRecentlyViewed = (jobId: string) => {
        const updatedIds = [jobId, ...recentlyViewedIds.filter(id => id !== jobId)].slice(0, 5);
        setRecentlyViewedIds(updatedIds);
        localStorage.setItem('recently_viewed_jobs', JSON.stringify(updatedIds));
    };

    async function fetchJobs() {
        try {
            setLoading(true);
            let query = supabase
                .from('jobs')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (selectedCategory !== "All") {
                query = query.eq('category', selectedCategory);
            }

            if (searchQuery) {
                // Use the new fts column if available, fallback to ilike for reliability
                query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
            }

            if (minPrice) {
                query = query.gte('budget', parseInt(minPrice));
            }
            if (maxPrice) {
                query = query.lte('budget', parseInt(maxPrice));
            }
            if (location) {
                query = query.ilike('location', `%${location}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setJobs(data || []);
        } catch (err: any) {
            console.error("Error fetching jobs:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Only fetch if category changes after initial mount
    useEffect(() => {
        if (selectedCategory !== "All") {
            fetchJobs();
        }
    }, [selectedCategory]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchJobs();
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-12">

                    {/* Header Section */}
                    <div className="flex flex-col gap-4">
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl"
                        >
                            Find your next <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">campus gig.</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
                        >
                            Browse freelance opportunities posted by fellow students. Apply in minutes and get paid securely.
                        </motion.p>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="sticky top-20 z-40 -mx-4 px-4 py-4 bg-zinc-50/80 backdrop-blur-sm dark:bg-black/80">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            <form onSubmit={handleSearch} className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for jobs (e.g. 'design', 'tutor')..."
                                    className="w-full rounded-full border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-primary/10"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(""); fetchJobs(); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </form>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                                        aria-label="Filter by category"
                                        className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors ${selectedCategory !== "All"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <Filter className="h-4 w-4" />
                                        {selectedCategory === "All" ? "Categories" : selectedCategory}
                                    </button>

                                    <AnimatePresence>
                                        {showCategoryMenu && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setShowCategoryMenu(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 z-50"
                                                >
                                                    {CATEGORIES.map((cat) => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => {
                                                                setSelectedCategory(cat);
                                                                setShowCategoryMenu(false);
                                                            }}
                                                            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${selectedCategory === cat ? "text-primary" : "text-zinc-600 dark:text-zinc-400"
                                                                }`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors ${showFilters
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    More Filters
                                </button>
                            </div>
                        </div>

                        {/* Expandable Advanced Filters */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 pb-2">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Price Range ($)</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    value={minPrice}
                                                    onChange={(e) => setMinPrice(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900"
                                                />
                                                <span className="text-zinc-400">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={maxPrice}
                                                    onChange={(e) => setMaxPrice(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Location</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Main Campus, Remote..."
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900"
                                            />
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <button
                                                onClick={() => fetchJobs()}
                                                className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                                            >
                                                Apply Filters
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setMinPrice("");
                                                    setMaxPrice("");
                                                    setLocation("");
                                                    fetchJobs();
                                                }}
                                                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Recently Viewed (Optional Sidebar or Top Bar - let's add it before listing) */}
                    {recentlyViewedIds.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Recently Viewed</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {jobs.filter(j => recentlyViewedIds.includes(j.id)).map(job => (
                                    <Link
                                        key={`rv-${job.id}`}
                                        href={`/jobs/${job.id}`}
                                        className="shrink-0 w-64 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-primary transition-all dark:border-zinc-800 dark:bg-zinc-950"
                                    >
                                        <span className="text-[10px] font-bold text-primary uppercase">{job.category}</span>
                                        <h4 className="font-bold text-sm line-clamp-1">{job.title}</h4>
                                        <span className="text-xs font-black text-zinc-500">${job.budget}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Jobs Listing */}
                    {loading && jobs.length === 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                            {[...Array(6)].map((_, i) => (
                                <JobCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/30 dark:bg-red-950/20">
                            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load jobs: {error}</p>
                            <button
                                onClick={() => fetchJobs()}
                                className="mt-4 text-sm font-bold text-red-700 underline dark:text-red-300"
                            >
                                Try again
                            </button>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-zinc-200 py-24 text-center dark:border-zinc-800">
                            <p className="text-zinc-500 font-medium">No jobs found. Be the first to post one!</p>
                            <Link
                                href="/jobs/create"
                                className="mt-4 inline-flex items-center gap-2 font-bold text-primary"
                            >
                                Post a Job <SlidersHorizontal className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                            {jobs.map((job, index) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link href={`/jobs/${job.id}`} onClick={() => addToRecentlyViewed(job.id)}>
                                        <JobCard job={job} />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                </div>
            </main>
            <Footer />
        </div>
    );
}
