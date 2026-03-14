"use client";

import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
    Bell,
    Check,
    ExternalLink,
    Loader2,
    MessageSquare,
    CheckCircle2,
    FileText,
    DollarSign,
    Star,
    AlertCircle,
    X,
    User,
    MoreHorizontal,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";
import Link from "next/link";

// Helper for relative time
function NotificationBellItem({ notification, markAsRead, deleteNotification }: {
    notification: Notification;
    markAsRead: (id: string) => void;
    deleteNotification: (id: string) => void;
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div
            className={`group relative flex gap-4 p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all duration-300 cursor-pointer ${!notification.is_read ? "bg-primary/[0.03] dark:bg-primary/[0.05]" : ""}`}
            onClick={() => notification.link && (window.location.href = notification.link)}
        >
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-1 pr-6">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {!notification.is_read && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <h4 className={`text-sm font-black tracking-tight leading-tight ${!notification.is_read ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}>
                            {notification.title}
                        </h4>
                    </div>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2 pr-1">
                    {notification.message}
                </p>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    {formatRelativeTime(notification.created_at)}
                </span>
            </div>

            {/* Dropdown Action */}
            <div className="absolute right-3 top-5">
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(false);
                                    }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                    className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
                                >
                                    {!notification.is_read && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800/50"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            Mark read
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function formatRelativeTime(dateString: string) {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString();
}



export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
            setLoading(false);
        };

        fetchNotifications();

        // Real-time subscription
        const subscribeToNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel('realtime_notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        const newNotification = payload.new as Notification;
                        setNotifications(prev => [newNotification, ...prev].slice(0, 10));
                        setUnreadCount(prev => prev + 1);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        const updatedNotification = payload.new as Notification;
                        setNotifications(prev => prev.map(n => n.id === updatedNotification.id ? updatedNotification : n));
                        // Re-calculate unread count properly if status changes
                        setUnreadCount(prev => {
                            if (updatedNotification.is_read) return Math.max(0, prev - 1);
                            return prev;
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const unsubscribe = subscribeToNotifications();
        return () => {
            unsubscribe.then(fn => fn?.());
        };
    }, []);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
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
            setUnreadCount(0);
        }
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            const notif = notifications.find(n => n.id === id);
            if (notif && !notif.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const [mounted, setMounted] = useState(false);
    const bellRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const panel = isOpen ? (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Dim overlay on mobile, transparent on desktop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm sm:bg-transparent z-[9998]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Notification Panel — slides from right on mobile, drops down on desktop */}
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 240 }}
                        className="fixed right-0 top-0 bottom-0 z-[9999] w-full max-w-[380px] border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 flex flex-col overflow-hidden
                                   sm:fixed sm:top-14 sm:bottom-auto sm:right-4 sm:max-h-[88vh] sm:rounded-3xl sm:border sm:shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">Notifications</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Filters / Batch Actions */}
                        <div className="px-6 py-3 flex items-center justify-between border-b border-zinc-50 dark:border-zinc-900/50">
                            <span className="text-xs font-bold text-zinc-500">{unreadCount} Unread</span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs font-black text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                                >
                                    <Check className="h-3 w-3" />
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm font-bold text-zinc-400 animate-pulse">Syncing updates...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                                    <div className="h-20 w-20 rounded-[2rem] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
                                        <Bell className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                                    </div>
                                    <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-2">No notifications yet</h4>
                                    <p className="text-sm text-zinc-500 leading-relaxed">
                                        When you have new messages, hire alerts, or job updates, they'll show up here.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-50 dark:divide-zinc-900/50">
                                    {notifications.map((notification) => (
                                        <NotificationBellItem
                                            key={notification.id}
                                            notification={notification}
                                            markAsRead={markAsRead}
                                            deleteNotification={deleteNotification}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <Link
                                href="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center w-full py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-[0.98]"
                            >
                                View All Notifications
                            </Link>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    ) : null;

    return (
        <div className="relative">
            <button
                ref={bellRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full border border-zinc-200 p-2.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-lg shadow-primary/20">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {mounted && typeof document !== 'undefined' && ReactDOM.createPortal(
                panel,
                document.body
            )}
        </div>
    );
}
