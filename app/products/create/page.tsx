"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, ArrowLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import Link from "next/link";

const CATEGORIES = [
    "Electronics",
    "Textbooks",
    "Fashion",
    "Dorm Essentials",
    "Course Materials",
    "Sports & Leisure",
    "Digital Products",
    "Food & Snacks",
    "Tickets & Events",
    "Other"
];

import { productSchema } from "@/lib/validations";

export default function CreateProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        category: "Other",
        location: "",
    });
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }
            setUser(user);

            // Check if user is a student
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'student') {
                setError("Only students can sell products on the marketplace.");
            }
        };
        checkUser();
    }, [router]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setError(null);
        setFormErrors({});

        if (!image) {
            setError("Please upload a product image.");
            return;
        }

        try {
            setLoading(true);

            // Zod Validation
            const validationResult = productSchema.safeParse({
                ...formData,
                price: parseFloat(formData.price),
                image_url: "https://placeholder.com" // Temporary for validation, will be replaced by real URL
            });

            if (!validationResult.success) {
                const errors: Record<string, string> = {};
                validationResult.error.issues.forEach(issue => {
                    const path = issue.path[0] as string;
                    if (path !== 'image_url') {
                        errors[path] = issue.message;
                    }
                });
                if (Object.keys(errors).length > 0) {
                    setFormErrors(errors);
                    setLoading(false);
                    return;
                }
            }

            // 1. Upload image to Cloudinary
            const imageUrl = await uploadToCloudinary(image);

            // 2. Save product to Supabase
            const { error: dbError } = await supabase
                .from('products')
                .insert({
                    title: formData.title,
                    description: formData.description,
                    price: parseFloat(formData.price),
                    category: formData.category,
                    location: formData.location || null,
                    image_url: imageUrl,
                    seller_id: user.id,
                    status: 'active'
                });

            if (dbError) throw dbError;

            router.push("/products");
        } catch (err: any) {
            console.error("Error creating product:", err);
            setError(err.message || "Failed to create product listing");
        } finally {
            setLoading(false);
        }
    };

    if (error && error.includes("Only students")) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black">
                <Navbar />
                <main className="mx-auto max-w-3xl px-4 pt-40 pb-24 text-center">
                    <div className="rounded-3xl border border-zinc-200 bg-white p-12 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                        <AlertCircle className="mx-auto h-16 w-16 text-amber-500 mb-6" />
                        <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-8">{error}</p>
                        <Link href="/products" className="text-primary font-bold hover:underline">
                            Back to Marketplace
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
            <Navbar />

            <main className="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8">
                    <Link href="/products" className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-primary transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Marketplace
                    </Link>

                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-extrabold tracking-tight">List a new <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">product.</span></h1>
                        <p className="text-zinc-600 dark:text-zinc-400">Reach thousands of students on your campus.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                        {error && (
                            <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                                {error}
                            </div>
                        )}

                        {/* Image Upload */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Product Image</label>
                            <div
                                onClick={() => document.getElementById('image-upload')?.click()}
                                className={`relative aspect-video cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${imagePreview ? 'border-primary' : 'border-zinc-200 dark:border-zinc-800'
                                    }`}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
                                        <Camera className="h-8 w-8" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Click to upload image</span>
                                    </div>
                                )}
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Product Title</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Blue Backpack, Calculus Textbook, etc."
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className={`rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all dark:bg-zinc-900 ${formErrors.title ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-primary dark:border-zinc-800"}`}
                                />
                                {formErrors.title && <p className="text-xs font-medium text-red-500">{formErrors.title}</p>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Price ($)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className={`rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all dark:bg-zinc-900 ${formErrors.price ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-primary dark:border-zinc-800"}`}
                                />
                                {formErrors.price && <p className="text-xs font-medium text-red-500">{formErrors.price}</p>}
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="rounded-xl border border-zinc-200 bg-transparent px-4 py-3 text-sm outline-none transition-all focus:border-primary dark:border-zinc-800"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Location (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Main Campus, Hostel A, etc."
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="rounded-xl border border-zinc-200 bg-transparent px-4 py-3 text-sm outline-none transition-all focus:border-primary dark:border-zinc-800"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Description</label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Describe your product (condition, features, etc.)"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={`rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all dark:bg-zinc-900 ${formErrors.description ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-primary dark:border-zinc-800"}`}
                            />
                            {formErrors.description && <p className="text-xs font-medium text-red-500">{formErrors.description}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Upload className="h-5 w-5 animate-bounce" />
                                    Listing product...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-5 w-5" />
                                    Create Listing
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}
