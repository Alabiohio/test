"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MessageSquare } from "lucide-react";

export function NotificationListener() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        let authUser: any = null;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            authUser = user;

            const channel = supabase
                .channel('global_notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                }, async (payload) => {
                    const newMsg = payload.new;

                    // Only notify if the message is from someone else
                    if (newMsg.sender_id === authUser.id) return;

                    // If we're already on the messages page for this conversation, don't show toast
                    // We check if the URL looks like /messages?user=... or just /messages
                    // It's safer to just show the toast if we're NOT on the messages page at all
                    // or if we're on the messages page but looking at a different list/nothing.

                    const isMessagesPage = pathname?.startsWith('/messages');

                    // Fetch conversation to see if user is a participant (though RLS should handle this)
                    // and to get the sender's name and conversation context.
                    const { data: conv, error } = await supabase
                        .from('conversations')
                        .select(`
                            id,
                            participant_1,
                            participant_2,
                            p1:participant_1(full_name),
                            p2:participant_2(full_name)
                        `)
                        .eq('id', newMsg.conversation_id)
                        .single();

                    if (error || !conv) return;

                    // Verify user is part of this conversation
                    if (conv.participant_1 !== authUser.id && conv.participant_2 !== authUser.id) return;

                    // Supabase joins can return arrays for p1/p2 depending on relationship detection
                    const p1 = Array.isArray(conv.p1) ? conv.p1[0] : conv.p1;
                    const p2 = Array.isArray(conv.p2) ? conv.p2[0] : conv.p2;
                    const senderName = conv.participant_1 === authUser.id ? p2?.full_name : p1?.full_name;

                    // Logic: show toast if NOT on messages page
                    if (!isMessagesPage) {
                        toast.custom((t) => (
                            <div className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-[1.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 w-[calc(100vw-2rem)] sm:w-[400px]">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm text-zinc-900 dark:text-white truncate">
                                        {senderName || "New Message"}
                                    </h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                        {newMsg.content || "Sent an image"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        router.push(`/messages?user=${newMsg.sender_id}`);
                                        toast.dismiss(t);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                                >
                                    View
                                </button>
                            </div>
                        ), {
                            duration: 5000,
                        });
                    }
                })
                .subscribe();

            return channel;
        };

        const channelPromise = setupSubscription();

        return () => {
            channelPromise.then(channel => {
                if (channel) supabase.removeChannel(channel);
            });
        };
    }, [pathname, router]);

    return null;
}
