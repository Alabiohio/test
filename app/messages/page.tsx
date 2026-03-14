"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Search,
    User,
    MessageSquare,
    ArrowLeft,
    ShoppingBag,
    Briefcase,
    Check,
    CheckCheck,
    MoreVertical,
    Image as ImageIcon,
    X,
    Loader2
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Loading } from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message, Profile } from "@/types";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { uploadToCloudinary, getOptimizedImageUrl } from "@/lib/cloudinary";

import { toast } from "sonner";

function groupMessagesByDate(messages: Message[]) {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
        const date = new Date(msg.created_at).toLocaleDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
    });
    return groups;
}

function getDisplayDate(dateStr: string) {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetUserId = searchParams.get("user");
    const productId = searchParams.get("product");
    const jobId = searchParams.get("job");

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mainChannelRef = useRef<any>(null);
    const selectedConversationRef = useRef<string | null>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch conversations and set up subscriptions
    useEffect(() => {
        let localUser: any = null;

        async function initChat() {
            try {
                setLoading(true);
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    router.push("/auth/login");
                    return;
                }
                localUser = authUser;

                // Fetch current user's profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                setCurrentUser(profile);

                // Fetch conversations
                const { data: convs, error: convError } = await supabase
                    .from('conversations')
                    .select(`
                        *,
                        p1:participant_1(id, full_name, avatar_url, university),
                        p2:participant_2(id, full_name, avatar_url, university),
                        products(title, price, image_url),
                        jobs(title, budget)
                    `)
                    .or(`participant_1.eq.${authUser.id},participant_2.eq.${authUser.id}`)
                    .order('updated_at', { ascending: false });

                if (convError) throw convError;

                // Adjust profiles and fetch unread counts
                const adjustedConvs = await Promise.all((convs || []).map(async (c: any) => {
                    const otherProfile = c.participant_1 === authUser.id ? c.p2 : c.p1;
                    const isSelected = targetUserId === otherProfile?.id;

                    // Count unread messages for this conversation
                    const { count } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('conversation_id', c.id)
                        .or('is_read.eq.false,is_read.is.null')
                        .neq('sender_id', authUser.id);

                    return {
                        ...c,
                        other_profile: otherProfile,
                        unread_count: isSelected ? 0 : (count || 0),
                    };
                }));

                // Deduplicate conversations based on participants and context (product/job)
                const uniqueConvs: any[] = [];
                const seenKeys = new Set();

                adjustedConvs.forEach((c: any) => {
                    // Create a unique key for the conversation context
                    const otherId = c.other_profile?.id || 'unknown';
                    const prodId = c.product_id || 'null';
                    const jobId = c.job_id || 'null';
                    const key = `${otherId}-${prodId}-${jobId}`;

                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        uniqueConvs.push(c);
                    }
                });

                setConversations(uniqueConvs);

                // Subscribe to conversation updates for the sidebar
                const convSidebarChannel = supabase
                    .channel('sidebar_updates')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'conversations',
                        filter: `participant_1=eq.${authUser.id}`
                    }, (payload) => handleSidebarUpdate(payload))
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'conversations',
                        filter: `participant_2=eq.${authUser.id}`
                    }, (payload) => handleSidebarUpdate(payload))
                    .subscribe();

                // Subscribe to messages to update unread counts in real-time
                const messagesChannel = supabase
                    .channel('all_messages_updates')
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages'
                    }, async (payload) => {
                        const newMsg = payload.new as Message;

                        // Only update if this message is relevant to the user and not from them
                        setConversations(prev => {
                            const relevantConv = prev.find(c => c.id === newMsg.conversation_id);
                            if (!relevantConv || newMsg.sender_id === authUser.id) return prev;

                            // Don't increment if we're currently viewing this conversation (it's handled elsewhere)
                            return prev.map(c => {
                                if (c.id === newMsg.conversation_id) {
                                    // Only increment unread if we're not viewing this conversation
                                    const shouldIncrement = selectedConversationRef.current !== c.id;
                                    return {
                                        ...c,
                                        unread_count: shouldIncrement ? (c.unread_count || 0) + 1 : c.unread_count || 0
                                    };
                                }
                                return c;
                            });
                        });
                    })
                    .subscribe();

                // If targetUserId is provided, find or create conversation
                if (targetUserId) {
                    let existingConv = convs?.find(c =>
                        (c.participant_1 === authUser.id && c.participant_2 === targetUserId) ||
                        (c.participant_1 === targetUserId && c.participant_2 === authUser.id)
                    );

                    if (!existingConv) {
                        // Create new conversation
                        const { data: newConv, error: createError } = await supabase
                            .from('conversations')
                            .insert({
                                participant_1: authUser.id,
                                participant_2: targetUserId,
                                product_id: productId || null,
                                job_id: jobId || null
                            })
                            .select(`
                                *,
                                p1:participant_1(id, full_name, avatar_url, university),
                                p2:participant_2(id, full_name, avatar_url, university),
                                products(title, price, image_url),
                                jobs(title, budget)
                            `)
                            .single();

                        if (!createError && newConv) {
                            const adjustedNewConv = {
                                ...newConv,
                                other_profile: (newConv as any).participant_1 === authUser.id ? (newConv as any).p2 : (newConv as any).p1,
                            };
                            setSelectedConversation(adjustedNewConv);
                            setConversations(prev => {
                                const filtered = prev.filter(c => c.id !== adjustedNewConv.id);
                                return [adjustedNewConv, ...filtered];
                            });
                            // Mark as read immediately
                            await markMessagesAsRead(adjustedNewConv.id);
                        }
                    } else {
                        const conversationToSet = {
                            ...existingConv,
                            other_profile: existingConv.participant_1 === authUser.id ? (existingConv as any).p2 : (existingConv as any).p1,
                        };
                        setSelectedConversation(conversationToSet);
                        // Mark as read immediately
                        await markMessagesAsRead(conversationToSet.id);
                    }
                }

                return () => {
                    supabase.removeChannel(convSidebarChannel);
                    supabase.removeChannel(messagesChannel);
                };

            } catch (err) {
                console.error("Error initializing chat:", err);
            } finally {
                setLoading(false);
            }
        }

        const handleSidebarUpdate = async (payload: any) => {
            if (payload.eventType === 'DELETE') {
                setConversations(prev => prev.filter(c => c.id !== payload.old.id));
                return;
            }

            // Safety: Only process if it's relevant to localUser
            if (!localUser || (payload.new.participant_1 !== localUser.id && payload.new.participant_2 !== localUser.id)) {
                return;
            }

            // Fetch the full conversation data with joins
            const { data: fullConv, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    p1:participant_1(id, full_name, avatar_url, university),
                    p2:participant_2(id, full_name, avatar_url, university),
                    products(title, price, image_url),
                    jobs(title, budget)
                `)
                .eq('id', payload.new.id)
                .single();

            if (!error && fullConv && localUser) {
                // Fetch unread count for the updated conversation
                const { count, error: countError } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', fullConv.id)
                    .or('is_read.eq.false,is_read.is.null')
                    .neq('sender_id', localUser.id);

                if (countError) {
                    console.error("Error fetching unread count for sidebar update:", countError);
                }

                setConversations(prev => {
                    const otherProfile = fullConv.participant_1 === localUser.id ? fullConv.p2 : fullConv.p1;

                    // Recover previous count on error to prevent wiping badges
                    const existingConv = prev.find(c => c.id === fullConv.id);
                    const previousUnread = existingConv?.unread_count || 0;

                    // Logic: If active, 0. If error, keep old. Else use new count.
                    let finalUnread = 0;
                    if (selectedConversationRef.current === fullConv.id) {
                        finalUnread = 0;
                    } else if (countError) {
                        finalUnread = previousUnread;
                    } else {
                        finalUnread = count || 0;
                    }

                    const adjustedConv = {
                        ...fullConv,
                        other_profile: otherProfile,
                        unread_count: finalUnread,
                    };

                    const filtered = prev.filter(c => c.id !== adjustedConv.id);
                    return [adjustedConv, ...filtered];
                });
            }
        };

        initChat();
    }, [targetUserId, productId, jobId]);

    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Keep ref in sync with selectedConversation
    useEffect(() => {
        selectedConversationRef.current = selectedConversation?.id || null;
        if (selectedConversation && currentUser) {
            markMessagesAsRead(selectedConversation.id);
        }
    }, [selectedConversation, currentUser]);

    const markMessagesAsRead = async (conversationId: string) => {
        if (!currentUser) return;

        try {
            // Simplified update query to be as robust as possible
            const { error, data } = await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', currentUser.id);

            if (error) {
                console.error("Supabase error marking messages as read:", error);
            }

            // Always update local state if we called this, to ensure snappy UI
            setConversations(prev => prev.map(c =>
                c.id === conversationId ? { ...c, unread_count: 0 } : c
            ));
        } catch (err) {
            console.error("Failed to mark messages as read:", err);
        }
    };

    // Fetch messages for selected conversation
    useEffect(() => {
        if (!selectedConversation || !currentUser) return;

        const conversationId = selectedConversation.id;
        const currentUserId = currentUser.id;

        async function fetchMessages() {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (!error) {
                setMessages(data || []);
                // Mark messages as read when joining
                markMessagesAsRead(conversationId);
            }
        }

        fetchMessages();

        // Subscribe to new messages and Presence (Typing Indicators)
        const channel = supabase.channel(`conv_${conversationId}`, {
            config: {
                presence: {
                    key: currentUserId,
                },
            },
        });

        mainChannelRef.current = channel;

        channel
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, async (payload) => {
                const newMessage = payload.new as Message;

                setMessages(prev => {
                    const isAlreadyThere = prev.some(m =>
                        (m.id === newMessage.id) ||
                        (m.sender_id === newMessage.sender_id && m.content === newMessage.content && m.id.startsWith('temp-'))
                    );

                    if (isAlreadyThere) {
                        return prev.map(m =>
                            (m.sender_id === newMessage.sender_id && m.content === newMessage.content && m.id.startsWith('temp-'))
                                ? newMessage
                                : m
                        );
                    }
                    return [...prev, newMessage];
                });

                // Mark received message as read if we are in the chat
                if (newMessage.sender_id !== currentUserId) {
                    markMessagesAsRead(conversationId);
                } else {
                    // If we sent the message, keep unread count at 0 for this conversation
                    setConversations(prev => prev.map(c =>
                        c.id === conversationId ? { ...c, unread_count: 0 } : c
                    ));
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                const updatedMsg = payload.new as Message;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));

                // If a message I received was marked as read (e.g. in another tab), update sidebar unread count
                if (updatedMsg.is_read && updatedMsg.sender_id !== currentUserId) {
                    setConversations(prev => prev.map(c => {
                        if (c.id === conversationId && c.unread_count && c.unread_count > 0) {
                            // When a message is marked read, we can re-count or just decrement
                            // Safest is to decrement if we know only one was updated, 
                            // but since mark-as-read often happens in bulk, we might want to be careful.
                            // For now, decrementing is a good approximation for real-time sync.
                            return { ...c, unread_count: Math.max(0, c.unread_count - 1) };
                        }
                        return c;
                    }));
                }
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const typingUsers = Object.values(state)
                    .flat()
                    .filter((presence: any) => presence.isTyping && presence.user_id !== currentUserId);

                const isTyping = typingUsers.length > 0;
                setIsOtherTyping(isTyping);

                // Update sidebar typing state
                setConversations(prev => prev.map(c =>
                    c.id === conversationId ? { ...c, is_typing: isTyping } : c
                ));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: currentUserId,
                        isTyping: false,
                    });
                }
            });

        // Subscribe to conversation changes (for deletions)
        const convChannel = supabase
            .channel('conversations_changes')
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'conversations',
            }, (payload) => {
                const deletedId = payload.old.id;
                setConversations(prev => prev.filter(c => c.id !== deletedId));
                if (selectedConversation?.id === deletedId) {
                    setSelectedConversation(null);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(convChannel);
        };
    }, [selectedConversation, currentUser]);

    // Handle typing broadcast
    const handleTyping = async () => {
        if (!mainChannelRef.current || !currentUser) return;

        await mainChannelRef.current.track({
            user_id: currentUser.id,
            isTyping: true,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(async () => {
            if (mainChannelRef.current) {
                await mainChannelRef.current.track({
                    user_id: currentUser.id,
                    isTyping: false,
                });
            }
        }, 3000);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if ((!content && !selectedImage) || !selectedConversation || !currentUser) return;

        const conversationId = selectedConversation.id;
        let imageUrl = undefined;

        setSending(true);

        try {
            if (selectedImage) {
                setUploadingImage(true);
                imageUrl = await uploadToCloudinary(selectedImage);
                setUploadingImage(false);
            }

            // Optimistic message
            const optimisticMsg: Message = {
                id: `temp-${Date.now()}`,
                conversation_id: conversationId,
                sender_id: currentUser.id,
                content: content,
                image_url: imagePreview || undefined,
                is_read: false,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, optimisticMsg]);
            setNewMessage("");
            setSelectedImage(null);
            setImagePreview(null);

            const { error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: currentUser.id,
                    content: content,
                    image_url: imageUrl,
                    is_read: false
                });

            if (error) throw error;

            await supabase
                .from('conversations')
                .update({
                    last_message: content || "Sent an image",
                    updated_at: new Date().toISOString()
                })
                .eq('id', conversationId);

        } catch (err: any) {
            console.error("Error sending message:", err);
            // Better logging for debugging
            if (err.message) console.error("Error message:", err.message);
            if (err.details) console.error("Error details:", err.details);
            if (err.hint) console.error("Error hint:", err.hint);

            toast.error(err.message || "Failed to send message. Please try again.");
        } finally {
            setSending(false);
            setUploadingImage(false);
        }
    };

    const handleDeleteConversation = async (convId: string) => {
        if (!confirm("Are you sure you want to delete this conversation? All messages will be permanently removed.")) return;

        try {
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', convId);

            if (error) throw error;

            setConversations(prev => prev.filter(c => c.id !== convId));
            setSelectedConversation(null);
        } catch (err) {
            console.error("Error deleting conversation:", err);
            toast.error("Failed to delete conversation.");
        }
    };




    if (loading) return <div className="min-h-screen bg-zinc-50 dark:bg-black"><Navbar /><Loading text="Loading your messages..." /></div>;

    return (
        <div className="h-dvh bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 flex flex-col overflow-hidden fixed inset-0">
            <Navbar />

            <main className={`flex-1 max-w-7xl w-full mx-auto flex gap-6 overflow-hidden pt-[72px] md:pt-24 ${selectedConversation ? 'px-0 md:px-4 pb-0 md:pb-8' : 'px-4 pb-8'}`}>

                {/* Conversations Sidebar */}
                <div className={`w-full md:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-zinc-950 rounded-[2rem] overflow-hidden ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-900">
                        <h2 className="text-xl font-black tracking-tight mb-4">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900 border-none outline-none focus:ring-2 ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">
                                No conversations yet.
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`w-full p-4 flex gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all text-left relative group ${selectedConversation?.id === conv.id ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''}`}
                                >
                                    {selectedConversation?.id === conv.id && (
                                        <motion.div layoutId="active-nav" className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                                    )}

                                    <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex-shrink-0 relative border border-zinc-200/50 dark:border-zinc-800/50">
                                        {conv.other_profile?.avatar_url ? (
                                            <img src={conv.other_profile.avatar_url} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-black text-xl">
                                                {conv.other_profile?.full_name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        {/* Unread badge */}
                                        {conv.unread_count !== undefined && conv.unread_count > 0 && (
                                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary border-4 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className={`font-black text-sm truncate leading-tight ${conv.unread_count && conv.unread_count > 0 ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                {conv.other_profile?.full_name || 'User'}
                                            </span>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter pt-0.5">
                                                {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate mb-1.5 ${conv.is_typing ? 'text-primary font-bold italic' : conv.unread_count && conv.unread_count > 0 ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                            {conv.is_typing ? 'typing...' : (conv.last_message || 'Start a conversation')}
                                        </p>
                                        {(conv.products || conv.jobs) && (
                                            <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 w-fit">
                                                {conv.products ? <ShoppingBag className="h-3 w-3 text-primary" /> : <Briefcase className="h-3 w-3 text-primary" />}
                                                <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">
                                                    {conv.products?.title || conv.jobs?.title}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-zinc-950 md:rounded-[2rem] overflow-hidden ${!selectedConversation ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 flex items-center justify-between z-10">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedConversation(null)}
                                        className="md:hidden p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                    <Link
                                        href={`/profile/${selectedConversation.other_profile?.id}`}
                                        className="flex items-center gap-4 hover:opacity-80 transition-opacity group"
                                    >
                                        <div className="h-11 w-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 group-hover:border-primary/30 transition-colors">
                                            {selectedConversation.other_profile?.avatar_url ? (
                                                <img src={selectedConversation.other_profile.avatar_url} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-black">
                                                    {selectedConversation.other_profile?.full_name?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-[15px] leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                                                {selectedConversation.other_profile?.full_name || 'User'}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-zinc-400 mt-0.5 uppercase tracking-widest leading-none">
                                                    {selectedConversation.other_profile?.university}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                <div className="flex items-center gap-4">
                                    {(selectedConversation.products || selectedConversation.jobs) && (
                                        <Link
                                            href={selectedConversation.products ? `/products/${selectedConversation.product_id}` : `/jobs/${selectedConversation.job_id}`}
                                            className="hidden sm:flex items-center gap-3 py-2 px-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-primary/50 transition-all group"
                                        >
                                            {selectedConversation.products?.image_url && (
                                                <img src={selectedConversation.products.image_url} className="h-8 w-8 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 truncate max-w-[120px] uppercase tracking-wider">
                                                    {selectedConversation.products?.title || selectedConversation.jobs?.title}
                                                </span>
                                                <span className="text-[9px] text-primary font-black">
                                                    {selectedConversation.products ? `$${selectedConversation.products.price}` : `$${selectedConversation.jobs?.budget}`}
                                                </span>
                                            </div>
                                        </Link>
                                    )}

                                    <div className="relative">
                                        <button
                                            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                            className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-400 active:scale-95"
                                        >
                                            <MoreVertical className="h-5 w-5" />
                                        </button>

                                        <AnimatePresence>
                                            {isHeaderMenuOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setIsHeaderMenuOpen(false)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-20"
                                                    >
                                                        <div className="p-2 space-y-1">
                                                            <Link
                                                                href={`/profile/${selectedConversation.other_profile?.id}`}
                                                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                                            >
                                                                <User className="h-4 w-4" />
                                                                View Profile
                                                            </Link>
                                                            <button
                                                                onClick={() => {
                                                                    toast.info("Reporting feature coming soon");
                                                                    setIsHeaderMenuOpen(false);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                                            >
                                                                <X className="h-4 w-4 text-rose-500" />
                                                                Report / Block
                                                            </button>
                                                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                                            <button
                                                                onClick={() => {
                                                                    setIsHeaderMenuOpen(false);
                                                                    handleDeleteConversation(selectedConversation.id);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                                Delete Conversation
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Scroll Area */}
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                                {Object.entries(groupMessagesByDate(messages)).map(([date, group]) => (
                                    <div key={date} className="space-y-6">
                                        <div className="flex items-center gap-4 py-2">
                                            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{getDisplayDate(date)}</span>
                                            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                                        </div>

                                        {group.map((msg, i) => {
                                            const isMe = currentUser && msg.sender_id === currentUser.id;
                                            const nextMsg = group[i + 1];
                                            const isLastInBlock = !nextMsg || nextMsg.sender_id !== msg.sender_id;

                                            return (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    key={msg.id}
                                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                        <div className={`relative overflow-hidden shadow-sm transition-all ${isMe
                                                            ? 'bg-primary text-white rounded-[1.5rem] rounded-tr-[0.3rem]'
                                                            : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-[1.5rem] rounded-tl-[0.3rem] border border-zinc-200 dark:border-zinc-800'
                                                            }`}>
                                                            {msg.image_url && (
                                                                <div className="relative aspect-auto max-h-80 overflow-hidden bg-zinc-200 dark:bg-zinc-950">
                                                                    <img
                                                                        src={getOptimizedImageUrl(msg.image_url, 800)}
                                                                        alt="Shared image"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="px-5 py-3.5 text-[15px] leading-relaxed">
                                                                {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                                                            </div>
                                                        </div>

                                                        {isLastInBlock && (
                                                            <div className={`flex items-center gap-1.5 mt-2 transition-opacity duration-300 ${isMe ? 'flex-row-reverse pl-4' : 'flex-row pr-4'}`}>
                                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {isMe && (
                                                                    <div className="flex items-center gap-0.5">
                                                                        {msg.is_read ? (
                                                                            <CheckCheck className="h-3 w-3 text-primary" />
                                                                        ) : (
                                                                            <Check className="h-3 w-3 text-zinc-300" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ))}
                                {isOtherTyping && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="px-4 py-4 md:px-6 md:py-6 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 flex-shrink-0">
                                <AnimatePresence>
                                    {imagePreview && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="mb-4 relative h-32 w-32 rounded-[2rem] overflow-hidden border-4 border-primary/20 shadow-2xl shadow-primary/10 group"
                                        >
                                            <img src={imagePreview} className="h-full w-full object-cover" />
                                            <button
                                                onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                            >
                                                <X className="h-8 w-8" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSendMessage} className="flex gap-3 items-end max-w-5xl mx-auto">
                                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-[1.5rem] px-2 py-1.5 flex items-end gap-2 ring-primary/10 focus-within:ring-4 transition-all border border-transparent focus-within:border-primary/20 border-zinc-200/50 dark:border-zinc-800/50">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="h-9 w-9 rounded-full bg-white dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:text-primary hover:scale-105 transition-all flex-shrink-0 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50"
                                        >
                                            {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                        />
                                        <textarea
                                            rows={1}
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping();
                                                // Auto-resize textarea
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e as any);
                                                }
                                            }}
                                            placeholder="Message..."
                                            className="flex-1 bg-transparent border-none rounded-xl px-2 py-2 text-sm outline-none resize-none max-h-32 font-medium placeholder:text-zinc-400"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={sending || (!newMessage.trim() && !selectedImage)}
                                        className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:grayscale disabled:opacity-30 flex-shrink-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-12">
                            <div className="h-20 w-20 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="h-10 w-10 text-zinc-300" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Select a conversation</h3>
                            <p className="text-zinc-500 text-sm">Choose a chat from the sidebar to start messaging.</p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-50 dark:bg-black">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                    <Loading text="Loading messages..." />
                </div>
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
