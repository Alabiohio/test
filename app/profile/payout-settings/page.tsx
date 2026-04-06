"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Building2,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ShieldCheck,
    Save
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Bank = {
    name: string;
    code: string;
};

export default function PayoutSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [profile, setProfile] = useState<any>(null);

    const [formData, setFormData] = useState({
        bank_code: "",
        bank_name: "",
        account_number: "",
    });

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // 1. Get Session
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth/login");
                    return;
                }

                // 2. Fetch Profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profileData) {
                    setProfile(profileData);
                    setFormData({
                        bank_code: profileData.bank_code || "",
                        bank_name: profileData.bank_name || "",
                        account_number: profileData.account_number || "",
                    });
                }

                // 3. Fetch Banks from Paystack (proxied or direct if allowed, usually need proxy for CORS)
                // For MVP, we'll use a static list or a server-side fetch if preferred.
                // Let's try fetching directly first, if CORS fails we'll use an API route.
                const bankResponse = await fetch('https://api.paystack.co/bank', {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}`
                    }
                });
                const bankData = await bankResponse.json();
                if (bankData.status) {
                    setBanks(bankData.data);
                }

            } catch (error) {
                console.error("Error fetching payout settings:", error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            setSaving(true);
            
            // Find bank name from code
            const selectedBank = banks.find(b => b.code === formData.bank_code);
            const bankName = selectedBank ? selectedBank.name : formData.bank_name;

            const { error } = await supabase
                .from('profiles')
                .update({
                    bank_code: formData.bank_code,
                    bank_name: bankName,
                    account_number: formData.account_number,
                    recipient_code: null, // Reset recipient code so it's recreated with new details
                })
                .eq('id', profile.id);

            if (error) throw error;

            toast.success("Payout settings saved successfully");
            router.push("/profile");
        } catch (error: any) {
            console.error("Error saving payout settings:", error);
            toast.error("Failed to save settings: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                <Navbar />
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navbar />

            <main className="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Profile
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                                Payout Settings
                            </h1>
                            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                                Configure where you'd like to receive your earnings.
                            </p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                            
                            <div className="flex items-center gap-4 rounded-2xl bg-primary/5 p-4 border border-primary/10">
                                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    Your bank details are stored securely and used only for processing your payouts through <span className="font-bold text-primary">Paystack</span>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Bank Selection */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Bank</label>
                                    <div className="relative">
                                        <select
                                            value={formData.bank_code}
                                            onChange={(e) => setFormData(prev => ({ ...prev, bank_code: e.target.value }))}
                                            className="w-full appearance-none rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-4 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-10"
                                            required
                                        >
                                            <option value="">Select a bank</option>
                                            {banks.map((bank) => (
                                                <option key={bank.code} value={bank.code}>
                                                    {bank.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Account Number */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Account Number</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.account_number}
                                            onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                            placeholder="10 digit account number"
                                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-4 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-12"
                                            required
                                        />
                                        <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Verification Badge */}
                            {(formData.account_number.length === 10 && formData.bank_code) && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-bold"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Account details ready for verification
                                </motion.div>
                            )}

                            <div className="flex flex-col gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 active-scale"
                                >
                                    {saving ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5" />
                                            Save Payout Settings
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-zinc-400 uppercase tracking-widest">
                                    Payments are typically processed within 24-48 hours after job approval.
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* FAQ section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-primary" />
                                How does it work?
                            </h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                campwork uses an escrow system. Once a client hire you, the funds are held by us. After you submit your work and the client approves, the funds are automatically transferred to this bank account.
                            </p>
                        </div>
                        <div className="p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                Is it safe?
                            </h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                We partner with Paystack, Africa's leading payment processor, to ensure all transactions are secure and compliant with financial regulations.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
