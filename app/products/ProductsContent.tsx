"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ShoppingBag, PlusCircle, MapPin } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Loading } from "@/components/Loading";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";

const CATEGORIES = ["All", "Gadgets", "Books", "Bags", "Course Materials", "Digital Products", "Fashion", "Other"];

interface ProductsContentProps {
    initialProducts: Product[];
}

export function ProductsContent({ initialProducts }: ProductsContentProps) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Advanced Filter states
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [location, setLocation] = useState("");
    const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

    useEffect(() => {
        const storedIds = localStorage.getItem('recently_viewed_products');
        if (storedIds) {
            setRecentlyViewedIds(JSON.parse(storedIds));
        }
    }, []);

    const addToRecentlyViewed = (productId: string) => {
        const updatedIds = [productId, ...recentlyViewedIds.filter(id => id !== productId)].slice(0, 5);
        setRecentlyViewedIds(updatedIds);
        localStorage.setItem('recently_viewed_products', JSON.stringify(updatedIds));
    };

    async function fetchProducts() {
        try {
            setLoading(true);
            let query = supabase
                .from('products')
                .select('*, profiles(full_name, university, avatar_url)')
                .order('created_at', { ascending: false });

            if (selectedCategory !== "All") {
                query = query.eq('category', selectedCategory);
            }

            if (searchQuery) {
                query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
            }

            if (minPrice) {
                query = query.gte('price', parseInt(minPrice));
            }
            if (maxPrice) {
                query = query.lte('price', parseInt(maxPrice));
            }
            if (location) {
                query = query.ilike('location', `%${location}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            console.error("Error fetching products:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (selectedCategory !== "All") {
            fetchProducts();
        }
    }, [selectedCategory]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProducts();
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-12">

                    {/* Header Section */}
                    <div className="flex flex-col gap-4">
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl font-extrabold tracking-tight sm:text-5xl"
                        >
                            Student <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Marketplace.</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
                        >
                            Buy and sell books, gadgets, and other student essentials within your campus community.
                        </motion.p>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="sticky top-20 z-40 -mx-4 px-4 py-4 bg-zinc-50/80 backdrop-blur-sm dark:bg-black/80">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            <form onSubmit={handleSearch} className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for products (e.g. 'macbook', 'textbook')..."
                                    className="w-full rounded-full border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-primary/10"
                                />
                            </form>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                                        className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors ${selectedCategory !== "All"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <Filter className="h-4 w-4" />
                                        {selectedCategory === "All" ? "Categories" : selectedCategory}
                                    </button>

                                    <AnimatePresence>
                                        {showCategoryMenu && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setShowCategoryMenu(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 z-50"
                                                >
                                                    {CATEGORIES.map((cat) => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => {
                                                                setSelectedCategory(cat);
                                                                setShowCategoryMenu(false);
                                                            }}
                                                            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${selectedCategory === cat ? "text-primary" : "text-zinc-600 dark:text-zinc-400"
                                                                }`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors ${showFilters
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    Filter
                                </button>
                                <Link href="/products/create" className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                    <PlusCircle className="h-4 w-4" />
                                    Sell Item
                                </Link>
                            </div>
                        </div>

                        {/* Expandable Advanced Filters */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 pb-2">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Price Range ($)</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    value={minPrice}
                                                    onChange={(e) => setMinPrice(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900"
                                                />
                                                <span className="text-zinc-400">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={maxPrice}
                                                    onChange={(e) => setMaxPrice(e.target.value)}
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Location</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Main Campus, Hostel..."
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-900"
                                            />
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <button
                                                onClick={() => fetchProducts()}
                                                className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setMinPrice("");
                                                    setMaxPrice("");
                                                    setLocation("");
                                                    fetchProducts();
                                                }}
                                                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Recently Viewed */}
                    {recentlyViewedIds.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Recently Viewed</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {products.filter(p => recentlyViewedIds.includes(p.id)).map(product => (
                                    <Link
                                        key={`rv-${product.id}`}
                                        href={`/products/${product.id}`}
                                        className="shrink-0 w-64 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-primary transition-all dark:border-zinc-800 dark:bg-zinc-950 flex gap-4 items-center"
                                    >
                                        <img src={product.image_url} className="h-12 w-12 rounded-xl object-cover" alt="" />
                                        <div className="flex flex-col min-w-0">
                                            <h4 className="font-bold text-sm line-clamp-1">{product.title}</h4>
                                            <span className="text-xs font-black text-primary">${product.price}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Listing */}
                    {loading && products.length === 0 ? (
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(8)].map((_, i) => (
                                <ProductCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/30 dark:bg-red-950/20">
                            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load products: {error}</p>
                            <button
                                onClick={() => fetchProducts()}
                                className="mt-4 text-sm font-bold text-red-700 underline dark:text-red-300"
                            >
                                Try again
                            </button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-zinc-200 py-24 text-center dark:border-zinc-800">
                            <ShoppingBag className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                            <p className="text-zinc-500 font-medium">No products found. Be the first to list one!</p>
                            <Link
                                href="/products/create"
                                className="mt-4 inline-flex items-center gap-2 font-bold text-primary"
                            >
                                Start Selling <PlusCircle className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((product, index) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link href={`/products/${product.id}`} className="group block h-full" onClick={() => addToRecentlyViewed(product.id)}>
                                        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-primary hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-950 h-full flex flex-col">
                                            <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                                <img
                                                    src={getOptimizedImageUrl(product.image_url, 400, 400)}
                                                    alt={product.title}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute top-4 right-4">
                                                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${product.status === 'active'
                                                        ? 'bg-green-500/80 text-white'
                                                        : 'bg-zinc-500/80 text-white'
                                                        }`}>
                                                        {product.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-5 flex flex-col flex-1">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-sm font-medium text-primary uppercase tracking-tight">{product.category}</span>
                                                    <span className="text-xl font-black text-zinc-900 dark:text-zinc-50">${product.price}</span>
                                                </div>
                                                <h3 className="mb-2 text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                                    {product.title}
                                                </h3>
                                                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 flex-1">
                                                    {product.description}
                                                </p>
                                                <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-auto">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        <MapPin className="h-3 w-3" />
                                                    </div>
                                                    <span className="text-xs font-medium text-zinc-500">{product.location || 'Campus'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                </div>
            </main>
            <Footer />
        </div>
    );
}
