"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export function ProductCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col h-full">
            <div className="relative aspect-square">
                <Skeleton className="h-full w-full rounded-none" />
            </div>
            <div className="p-5 flex flex-col flex-1 gap-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-auto">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
        </div>
    );
}
