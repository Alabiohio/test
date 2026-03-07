"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import {
    Tag,
    MapPin,
    Calendar,
    MessageSquare,
    User,
    ArrowLeft,
    ShoppingBag,
    ShieldCheck,
    Info,
    CheckCircle2,
    Flag
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Loading } from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isReporting, setIsReporting] = useState(false);

    useEffect(() => {
        async function fetchProduct() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('products')
                    .select('*, profiles(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProduct(data);

                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } catch (err) {
                console.error("Error fetching product:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchProduct();
    }, [id]);

    const handleMarkAsSold = async () => {
        if (!confirm("Are you sure you want to mark this item as sold?")) return;

        try {
            const { error } = await supabase
                .from('products')
                .update({ status: 'sold' })
                .eq('id', id);

            if (error) throw error;
            toast.success("Item marked as sold");
            setProduct({ ...product, status: 'sold' });
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleReport = async () => {
        if (!user) {
            router.push('/auth/login');
            return;
        }

        const reason = window.prompt("Why are you reporting this item? (e.g., fraudulent, prohibited, spam)");
        if (!reason) return;

        try {
            setIsReporting(true);
            const { error: reportError } = await supabase
                .from('reports')
                .insert([{
                    reporter_id: user.id,
                    item_id: id,
                    item_type: 'product',
                    reason: reason
                }]);

            if (reportError) throw reportError;
            toast.success("Thank you. Our team will review this listing.");
        } catch (err: any) {
            console.error("Error reporting product:", err);
            toast.error("Failed to submit report.");
        } finally {
            setIsReporting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-zinc-50 dark:bg-black"><Navbar /><Loading text="Loading product details..." /></div>;
    if (!product) return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 pt-40 pb-24 text-center">
                <h1 className="text-3xl font-bold">Product not found</h1>
                <Link href="/products" className="mt-4 inline-block text-primary font-bold">Back to Marketplace</Link>
            </main>
        </div>
    );

    const isSeller = user?.id === product.seller_id;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-10">
                    <Link href="/products" className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-primary transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Marketplace
                    </Link>

                    <div className="grid gap-12 lg:grid-cols-2">
                        {/* Image Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative aspect-square overflow-hidden rounded-[3rem] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            <img
                                src={product.image_url}
                                alt={product.title}
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute top-6 right-6 flex flex-col gap-3">
                                <span className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-widest backdrop-blur-md shadow-lg ${product.status === 'active'
                                    ? 'bg-green-500/80 text-white'
                                    : 'bg-zinc-500/80 text-white'
                                    }`}>
                                    {product.status}
                                </span>
                            </div>
                        </motion.div>

                        {/* Details Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col gap-8"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary">
                                        {product.category}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                                        <Calendar className="h-4 w-4" />
                                        Posted {new Date(product.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{product.title}</h1>
                                <p className="text-3xl font-black text-primary">${product.price}</p>
                            </div>

                            <div className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                                <h3 className="text-lg font-bold">Description</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                    {product.description}
                                </p>

                                <div className="flex flex-wrap gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Location</span>
                                            <span className="text-sm font-bold">{product.location || 'Main Campus'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Condition</span>
                                            <span className="text-sm font-bold">Student Verified</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seller Info */}
                            <div className="flex items-center justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Seller</span>
                                        <span className="text-sm font-bold">{product.profiles?.full_name}</span>
                                        <span className="text-xs text-zinc-500">{product.profiles?.university}</span>
                                    </div>
                                </div>
                                {!isSeller && (
                                    <Link
                                        href={`/messages?user=${product.seller_id}`}
                                        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Chat with Seller
                                    </Link>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-4">
                                {isSeller ? (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleMarkAsSold}
                                            disabled={product.status === 'sold'}
                                            className="flex-1 flex h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-5 w-5" />
                                            {product.status === 'sold' ? 'Already Sold' : 'Mark as Sold'}
                                        </button>
                                        <button
                                            onClick={handleReport}
                                            disabled={isReporting}
                                            title="Report listing"
                                            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 transition-all hover:bg-red-50 hover:text-red-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-red-900/20"
                                        >
                                            <Flag className={`h-6 w-6 ${isReporting ? 'animate-pulse' : ''}`} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        disabled={product.status === 'sold'}
                                        onClick={() => router.push(`/messages?user=${product.seller_id}&product=${product.id}`)}
                                        className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-primary px-10 text-xl font-black text-white hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50"
                                    >
                                        <ShoppingBag className="h-6 w-6" />
                                        {product.status === 'sold' ? 'Sold Out' : 'I want to buy this'}
                                    </button>
                                )}
                                <p className="text-center text-xs text-zinc-400">
                                    Security Tip: Meet in public places on campus for exchanges.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
