"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, PlusCircle, LogIn, Moon, Sun, Monitor, Menu, X, MessageSquare, ShoppingBag, Briefcase, Settings, LogOut, ChevronRight, Home, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { NotificationBell } from "./NotificationBell";

export function Navbar({ isTransparent = false }: { isTransparent?: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    const [scrolled, setScrolled] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            window.removeEventListener("scroll", handleScroll);
            setMobileMenuOpen(false);
        };
    }, []);

    useEffect(() => {
        if (!user) {
            setUnreadMessagesCount(0);
            return;
        }

        const fetchUnreadCount = async () => {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .or('is_read.eq.false,is_read.is.null')
                .neq('sender_id', user.id);

            setUnreadMessagesCount(count || 0);
        };

        fetchUnreadCount();

        const msgChannel = supabase
            .channel('navbar_messages_count')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages'
            }, () => {
                setTimeout(fetchUnreadCount, 500);
            })
            .subscribe();

        const fetchNotificationCount = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setUnreadNotificationsCount(count || 0);
        };

        fetchNotificationCount();

        const notifyChannel = supabase
            .channel('navbar_notifications_count')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, () => {
                fetchNotificationCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(notifyChannel);
        };
    }, [user]);

    const getThemeIcon = () => {
        if (!mounted) return <Monitor className="h-5 w-5" />;
        switch (theme) {
            case "light": return <Sun className="h-5 w-5" />;
            case "dark": return <Moon className="h-5 w-5" />;
            default: return <Monitor className="h-5 w-5" />;
        }
    };


    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <>
            <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${isTransparent && !scrolled
                ? "bg-transparent h-20"
                : "bg-white/80 backdrop-blur-md dark:bg-black/80 h-16 shadow-sm"}`}>
                <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 sm:px-16 lg:px-8">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <img
                                src="/assets/logo1.png"
                                alt="Campwork Logo"
                                className={`w-auto object-contain transition-all duration-300 ${scrolled ? 'h-8' : isTransparent ? 'h-10' : 'h-8'}`}
                            />
                        </Link>

                        <div className="hidden md:flex items-center gap-2">
                            {[
                                { href: "/jobs", label: "Find Jobs" },
                                { href: "/products", label: "Marketplace" },
                                ...(user ? [{ href: "/messages", label: "Messages", badge: unreadMessagesCount }] : []),
                            ].map((link: any) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-lg group ${isTransparent && !scrolled
                                            ? (isActive ? 'text-white' : 'text-zinc-300 hover:text-white')
                                            : (isActive ? 'text-primary' : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white')
                                            }`}
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {link.label}
                                            {typeof link.badge === 'number' && link.badge > 0 ? (
                                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-black text-white shrink-0">
                                                    {link.badge > 99 ? '99+' : link.badge}
                                                </span>
                                            ) : null}
                                        </span>
                                        {isActive ? (
                                            <motion.div
                                                layoutId="navIndicator"
                                                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${isTransparent && !scrolled ? 'bg-white' : 'bg-primary'}`}
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        ) : (
                                            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Theme Toggle */}
                        {mounted && (
                            <div className="relative">
                                <button
                                    onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                                    aria-label="Toggle theme"
                                    className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 active-scale ${isTransparent && !scrolled
                                        ? "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                                        }`}
                                >
                                    {getThemeIcon()}
                                </button>
                                <AnimatePresence>
                                    {themeMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="absolute right-0 mt-3 w-44 rounded-2xl shadow-xl overflow-hidden z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800"
                                            >
                                                {['light', 'dark', 'system'].map((t, idx) => (
                                                    <motion.button
                                                        key={t}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        onClick={() => { setTheme(t); setThemeMenuOpen(false); }}
                                                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm transition-all capitalize relative group ${theme === t ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-bold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300"}`}
                                                    >
                                                        <span className={`${theme === t ? 'text-primary' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'} transition-colors`}>
                                                            {t === 'light' ? <Sun className="h-4 w-4" /> : t === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                                                        </span>
                                                        {t}
                                                        {theme === t && (
                                                            <motion.div
                                                                layoutId="activeTheme"
                                                                className="absolute right-3 w-1.5 h-1.5 bg-primary rounded-full"
                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                            />
                                                        )}
                                                    </motion.button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {!loading && (
                            <div className="flex items-center gap-1 sm:gap-2">
                                {user ? (
                                    <>
                                        <Link
                                            href="/jobs/create"
                                            className={`hidden sm:flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 hover:scale-105 active-scale shadow-lg hover:shadow-xl ${isTransparent && !scrolled ? 'bg-white text-primary hover:bg-zinc-50 shadow-white/20 hover:shadow-white/30' : 'bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary shadow-primary/20 hover:shadow-primary/30'}`}
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            <span>Post a Job</span>
                                        </Link>
                                        <NotificationBell />

                                        <div className="hidden sm:block relative">
                                            <button
                                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                                aria-label="User profile menu"
                                                className={`rounded-full border-2 p-2.5 transition-all duration-300 hover:scale-105 active-scale shadow-md ${isTransparent && !scrolled
                                                    ? 'border-white/30 text-white hover:bg-white/10 hover:border-white/50'
                                                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:border-zinc-600'
                                                    }`}
                                            >
                                                <User className="h-5 w-5" />
                                            </button>

                                            <AnimatePresence>
                                                {profileMenuOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                                            className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl overflow-hidden z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-2 space-y-1"
                                                        >
                                                            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                                                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">Account</p>
                                                                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user?.email}</p>
                                                            </div>

                                                            {[
                                                                { href: "/profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
                                                                { href: "/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, badge: unreadMessagesCount },
                                                                { href: "/settings", label: "Account Settings", icon: <Settings className="h-4 w-4" /> },
                                                            ].map((item: any) => (
                                                                <Link
                                                                    key={item.href}
                                                                    href={item.href}
                                                                    onClick={() => setProfileMenuOpen(false)}
                                                                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                                                                >
                                                                    <span className="text-zinc-400 group-hover:text-primary transition-colors">{item.icon}</span>
                                                                    <span className="relative flex-1 flex items-center justify-between">
                                                                        {item.label}
                                                                        {typeof item.badge === 'number' && item.badge > 0 && (
                                                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-[10px] font-black text-white ml-2">
                                                                                {item.badge}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </Link>
                                                            ))}

                                                            <div className="pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                                                                <button
                                                                    onClick={() => {
                                                                        handleSignOut();
                                                                        setProfileMenuOpen(false);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group text-left"
                                                                >
                                                                    <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                                                                    Log Out
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </>
                                ) : (
                                    <div className="hidden sm:flex items-center gap-2">
                                        <Link
                                            href="/auth/login"
                                            className={`text-sm font-semibold transition-all duration-300 px-4 py-2 rounded-lg hover:scale-105 active:scale-95 ${isTransparent && !scrolled ? 'text-white hover:bg-white/10' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href="/auth/signup"
                                            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${isTransparent && !scrolled ? 'bg-white text-primary hover:bg-zinc-50 shadow-white/20 hover:shadow-white/30' : 'bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary shadow-primary/20 hover:shadow-primary/30'}`}
                                        >
                                            Sign up
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle mobile menu"
                            className={`md:hidden p-2.5 rounded-xl transition-all duration-300 hover:scale-105 active-scale ${isTransparent && !scrolled
                                ? "text-white hover:bg-white/10 backdrop-blur-sm"
                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                                }`}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay - Premium Design */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md z-[100] md:hidden"
                        />

                        <motion.div
                            initial={{ x: "100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "100%", opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed inset-y-0 right-0 z-[110] w-full max-w-sm bg-gradient-to-br from-white via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-black backdrop-blur-lg shadow-2xl md:hidden overflow-hidden flex flex-col border-l-2 border-zinc-200/50 dark:border-zinc-800/50"
                        >
                            {/* Header */}
                            <div className="relative flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50/50 to-transparent dark:from-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                                    <span className="text-xl font-bold tracking-tight bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">Menu</span>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 hover:scale-110 active:scale-95 hover:rotate-90"
                                >
                                    <X className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                </button>
                            </div>

                            {/* Menu Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8">
                                {/* Navigation Links */}
                                <nav className="flex flex-col gap-1">
                                    {[
                                        { href: "/", label: "Home", icon: <Home className="w-5 h-5" /> },
                                        { href: "/jobs", label: "Find Jobs", icon: <Briefcase className="w-5 h-5" /> },
                                        { href: "/products", label: "Marketplace", icon: <ShoppingBag className="w-5 h-5" /> },
                                        ...(user ? [
                                            { href: "/messages", label: "Messages", icon: <MessageSquare className="w-5 h-5" />, badge: unreadMessagesCount },
                                            { href: "/notifications", label: "Notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotificationsCount }
                                        ] : []),
                                    ].map((link: any, idx) => (
                                        <motion.div
                                            key={link.href}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + idx * 0.05, duration: 0.2, ease: "easeOut" }}
                                        >
                                            <Link
                                                href={link.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="group relative flex items-center justify-between px-5 py-4 text-lg font-bold text-zinc-900 dark:text-white rounded-2xl transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:via-primary/5 hover:to-transparent hover:pl-6 active:scale-[0.98]"
                                            >
                                                <span className="flex items-center gap-4">
                                                    <span className="text-zinc-400 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                                                        {link.icon}
                                                    </span>
                                                    <span className="relative">
                                                        {link.label}
                                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                                                    </span>
                                                </span>
                                                <div className="flex items-center gap-3 ml-auto">
                                                    {typeof link.badge === 'number' && link.badge > 0 && (
                                                        <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary text-[12px] font-black text-white">
                                                            {link.badge > 99 ? '99+' : link.badge}
                                                        </span>
                                                    )}
                                                    <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 group-hover:text-primary transition-all duration-300" />
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}

                                    {/* Account Settings (User Only) */}
                                    {user && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2, duration: 0.2, ease: "easeOut" }}
                                            className="mt-2 pt-4 border-t border-zinc-200 dark:border-zinc-800"
                                        >
                                            <Link
                                                href="/profile"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="group relative flex items-center justify-between px-5 py-4 text-lg font-bold text-zinc-900 dark:text-white rounded-2xl transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:via-primary/5 hover:to-transparent hover:pl-6 active:scale-[0.98]"
                                            >
                                                <span className="flex items-center gap-4">
                                                    <span className="text-zinc-400 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                                                        <Settings className="w-5 h-5" />
                                                    </span>
                                                    <span className="relative">
                                                        Account Settings
                                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-300" />
                                                    </span>
                                                </span>
                                                <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 group-hover:text-primary transition-all duration-300" />
                                            </Link>
                                        </motion.div>
                                    )}
                                </nav>

                                {/* CTA Section */}
                                {user && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25, duration: 0.2, ease: "easeOut" }}
                                        className="mt-2"
                                    >
                                        <Link
                                            href="/jobs/create"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="relative overflow-hidden flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-primary via-primary to-primary/90 text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
                                        >
                                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                            <PlusCircle className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                                            <span className="relative z-10">Post a Job</span>
                                        </Link>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer / Account Actions */}
                            <div className="p-6 bg-gradient-to-t from-zinc-100/80 to-zinc-50/50 dark:from-zinc-900/80 dark:to-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-xl space-y-5">
                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                                    {['light', 'dark', 'system'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTheme(t)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 capitalize ${theme === t
                                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md scale-105"
                                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:scale-102"
                                                }`}
                                        >
                                            {t === 'light' ? <Sun className="w-4 h-4" /> : t === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                            <span className="hidden xs:inline">{t}</span>
                                        </button>
                                    ))}
                                </div>

                                {user ? (
                                    <button
                                        onClick={() => {
                                            handleSignOut();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full flex items-center justify-center gap-3 py-3.5 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-300 border-2 border-red-200 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-800/50 hover:scale-[1.02] active:scale-[0.98] group"
                                    >
                                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                                        Log Out
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link
                                            href="/auth/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex justify-center py-3.5 px-4 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 hover:scale-105 active:scale-95"
                                        >
                                            Log In
                                        </Link>
                                        <Link
                                            href="/auth/signup"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="relative overflow-hidden flex justify-center py-3.5 px-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 text-white dark:text-zinc-900 font-bold hover:from-zinc-800 hover:to-zinc-700 dark:hover:from-zinc-100 dark:hover:to-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg group"
                                        >
                                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                            <span className="relative z-10">Sign Up</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}



