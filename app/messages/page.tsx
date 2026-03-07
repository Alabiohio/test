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
                        p1:participant_1(full_name, avatar_url, university),
                        p2:participant_2(full_name, avatar_url, university),
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
                                p1:participant_1(full_name, avatar_url, university),
                                p2:participant_2(full_name, avatar_url, university),
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
                    p1:participant_1(full_name, avatar_url, university),
                    p2:participant_2(full_name, avatar_url, university),
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
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-24 pb-8 flex gap-6 h-[calc(100vh-100px)]">

                {/* Conversations Sidebar */}
                <div className={`w-full md:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
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
                                    onClick={() => {
                                        setSelectedConversation(conv);
                                    }}
                                    className={`w-full p-4 flex gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left border-b border-zinc-50 dark:border-zinc-900 ${selectedConversation?.id === conv.id ? 'bg-zinc-50 dark:bg-zinc-900' : ''}`}
                                >
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 relative">
                                        <User className="h-6 w-6" />
                                        {/* Unread badge - WhatsApp style */}
                                        {conv.unread_count !== undefined && conv.unread_count > 0 ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center"
                                            >
                                                <span className="text-[10px] font-black text-white">
                                                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                                </span>
                                            </motion.div>
                                        ) : null}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-bold text-sm truncate ${conv.unread_count && conv.unread_count > 0 ? 'text-zinc-900 dark:text-white' : ''}`}>
                                                {conv.other_profile?.full_name || 'User'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-400">{new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs truncate flex-1 ${conv.is_typing ? 'text-primary font-bold italic' : conv.unread_count && conv.unread_count > 0 ? 'text-zinc-900 dark:text-white font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                {conv.is_typing ? 'typing...' : (conv.last_message || 'Start a conversation')}
                                            </p>
                                        </div>
                                        {(conv.products || conv.jobs) && (
                                            <div className="mt-2 flex items-center gap-1.5 py-1 px-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-fit">
                                                {conv.products ? <ShoppingBag className="h-3 w-3 text-primary" /> : <Briefcase className="h-3 w-3 text-primary" />}
                                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">
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
                <div className={`flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden ${!selectedConversation ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 text-zinc-500">
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">{selectedConversation.other_profile?.full_name || 'User'}</h3>
                                        <span className="text-[10px] text-zinc-400">{selectedConversation.other_profile?.university}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedConversation.products && (
                                        <Link href={`/products/${selectedConversation.product_id}`} className="hidden sm:flex items-center gap-2 py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-primary transition-colors">
                                            <img src={selectedConversation.products.image_url} className="h-6 w-6 rounded-md object-cover" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold truncate max-w-[100px]">{selectedConversation.products.title}</span>
                                                <span className="text-[8px] text-primary font-black">${selectedConversation.products.price}</span>
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Messages Scroll Area */}
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                                {messages.map((msg, i) => {
                                    const isMe = currentUser && msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] rounded-3xl overflow-hidden shadow-lg ${isMe ? 'bg-primary text-white rounded-tr-none shadow-primary/10' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none'}`}>
                                                {msg.image_url && (
                                                    <div className="relative aspect-auto max-h-64 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                        <img
                                                            src={getOptimizedImageUrl(msg.image_url, 600)}
                                                            alt="Shared image"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="px-5 py-3 text-sm">
                                                    {msg.content && <p>{msg.content}</p>}
                                                    <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-white/60' : 'text-zinc-400'}`}>
                                                        <span className="text-[8px]">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && (
                                                            <div className="flex ml-1">
                                                                {msg.is_read ? (
                                                                    <CheckCheck className="h-3 w-3 text-white" />
                                                                ) : (
                                                                    <Check className="h-3 w-3" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {isOtherTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-3xl px-5 py-2 text-xs italic animate-pulse">
                                            {selectedConversation.other_profile?.full_name || 'Someone'} is typing...
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-6 border-t border-zinc-100 dark:border-zinc-900">
                                <AnimatePresence>
                                    {imagePreview && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="mb-4 relative h-32 w-32 rounded-2xl overflow-hidden border-2 border-primary"
                                        >
                                            <img src={imagePreview} className="h-full w-full object-cover" />
                                            <button
                                                onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-2 py-2 flex items-end gap-2 ring-primary/20 focus-within:ring-4 transition-all">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:text-primary transition-colors flex-shrink-0"
                                        >
                                            {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
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
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e as any);
                                                }
                                            }}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-transparent border-none rounded-xl px-2 py-2 text-sm outline-none resize-none max-h-32"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={sending || (!newMessage.trim() && !selectedImage)}
                                        className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 disabled:opacity-50 flex-shrink-0"
                                    >
                                        <Send className="h-6 w-6" />
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
