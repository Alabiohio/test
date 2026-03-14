"use client";


import { Briefcase, Clock, MapPin, Tag } from "lucide-react";
import type { Job } from "@/types";

interface JobCardProps {
    job: Job;
}

export function JobCard({ job }: JobCardProps) {
    return (
        <div
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                                {job.category}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${job.status === 'open'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : job.status === 'in-progress'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}>
                                {job.status}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-primary transition-colors">
                            {job.title}
                        </h3>
                    </div>
                    <div className="text-right">
                        <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                            ${job.budget}
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Fixed Price</p>
                    </div>
                </div>

                <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {job.description}
                </p>

                <div className="flex flex-wrap gap-2">
                    {job.skills_required?.map((skill) => (
                        <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                            <Tag className="h-3 w-3" />
                            {skill}
                        </span>
                    ))}
                </div>

                <div className="flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{job.location || "Remote"}</span>
                    </div>
                </div>
            </div>

            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-blue-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
