"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export function JobCardSkeleton() {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-48" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                </div>

                <div className="flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>
        </div>
    );
}
