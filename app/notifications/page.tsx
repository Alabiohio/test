"use client";

import { useEffect, useState } from "react";
import {
    Bell,
    Check,
    Loader2,
    Search,
    Filter,
    MoreHorizontal,
    Trash2,
    CheckCircle2,
    FileText,
    MessageSquare,
    DollarSign,
    Star,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";
import Link from "next/link";

function formatRelativeTime(dateString: string) {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationItem({ notification, markAsRead, deleteNotification, router }: {
    notification: Notification;
    markAsRead: (id: string) => void;
    deleteNotification: (id: string) => void;
    router: any
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex items-start gap-5 p-6 rounded-[2rem] border transition-all duration-300 ${!notification.is_read
                ? "bg-white dark:bg-zinc-900 border-primary/20 dark:border-primary/30 shadow-xl shadow-primary/5"
                : "bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-80 hover:opacity-100"
                }`}
        >
            {/* Content */}
            <div className="flex-1 min-w-0 pr-12">
                <div className="flex items-center gap-2 mb-1">
                    {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <h4 className={`text-lg font-black tracking-tight leading-tight ${!notification.is_read ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {notification.title}
                    </h4>
                </div>
                <p className={`text-sm leading-relaxed mb-4 ${!notification.is_read ? "text-zinc-600 dark:text-zinc-300 font-medium" : "text-zinc-500 dark:text-zinc-500"}`}>
                    {notification.message}
                </p>

                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {formatRelativeTime(notification.created_at)}
                    </span>
                    {notification.link && (
                        <button
                            onClick={() => {
                                markAsRead(notification.id);
                                router.push(notification.link!);
                            }}
                            className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                            View Details →
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown Menu */}
            <div className="absolute right-6 top-6">
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        <MoreHorizontal className="h-5 w-5" />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                                >
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => {
                                                markAsRead(notification.id);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <Check className="h-4 w-4" />
                                            Mark as read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            deleteNotification(notification.id);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}



export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth/login');
                return;
            }

            let query = supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (activeFilter === 'unread') {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query;

            if (!error && data) {
                setNotifications(data);
            }
            setLoading(false);
        };

        fetchNotifications();
    }, [activeFilter, router]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    // Grouping logic
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    const sections = [
        { title: 'Today', items: notifications.filter(n => new Date(n.created_at).toLocaleDateString() === today) },
        { title: 'Yesterday', items: notifications.filter(n => new Date(n.created_at).toLocaleDateString() === yesterday) },
        {
            title: 'Earlier', items: notifications.filter(n => {
                const d = new Date(n.created_at).toLocaleDateString();
                return d !== today && d !== yesterday;
            })
        }
    ].filter(s => s.items.length > 0);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto max-w-4xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors mb-4"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Back
                            </button>
                            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Notifications</h1>
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === 'all'
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg'
                                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveFilter('unread')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === 'unread'
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg'
                                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                            >
                                Unread
                            </button>
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pl-4 pr-1 py-1 sm:py-1.5 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-premium">
                        <div className="flex items-center gap-4">
                            <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                                <Bell className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col -space-y-1">
                                <p className="text-sm font-black text-zinc-900 dark:text-white">
                                    {notifications.filter(n => !n.is_read).length} new updates
                                </p>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Since your last visit</p>
                            </div>
                        </div>
                        <button
                            onClick={markAllAsRead}
                            className="px-6 py-2.5 sm:py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
                        >
                            Mark all read
                        </button>
                    </div>

                    {/* Notification Feed */}
                    <div className="flex flex-col gap-10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-sm font-black text-zinc-400 uppercase tracking-widest animate-pulse">Syncing with campus server...</p>
                            </div>
                        ) : sections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-sm border-dashed">
                                <div className="h-24 w-24 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-8">
                                    <Bell className="h-12 w-12 text-zinc-200 dark:text-zinc-700" />
                                </div>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Clean Slate!</h3>
                                <p className="text-zinc-500 max-w-xs mx-auto font-medium">
                                    You're all caught up. No {activeFilter === 'unread' ? 'unread ' : ''}notifications at the moment.
                                </p>
                                <Link
                                    href="/jobs"
                                    className="mt-8 px-8 py-3 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                >
                                    Find More Gigs
                                </Link>
                            </div>
                        ) : (
                            sections.map((section) => (
                                <div key={section.title} className="space-y-4">
                                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 pl-2">{section.title}</h2>
                                    <div className="flex flex-col gap-3">
                                        {section.items.map((notification) => (
                                            <NotificationItem
                                                key={notification.id}
                                                notification={notification}
                                                markAsRead={markAsRead}
                                                deleteNotification={deleteNotification}
                                                router={router}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
