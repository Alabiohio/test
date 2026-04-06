import { supabase } from '@/lib/supabase';
import type { Job, Product, Order, Transaction, Profile } from '@/types';

export const jobService = {
    async getAll(category?: string, query?: string): Promise<Job[]> {
        let supabaseQuery = supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (category && category !== 'All') {
            supabaseQuery = supabaseQuery.eq('category', category);
        }

        if (query) {
            supabaseQuery = supabaseQuery.ilike('title', `%${query}%`);
        }

        const { data, error } = await supabaseQuery;
        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<Job | null> {
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(job: Omit<Job, 'id' | 'created_at' | 'status'>): Promise<Job> {
        const { data, error } = await supabase
            .from('jobs')
            .insert([{ ...job, status: 'open' }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

export const productService = {
    async getAll(category?: string, query?: string): Promise<Product[]> {
        let supabaseQuery = supabase
            .from('products')
            .select('*, profiles(*)')
            .order('created_at', { ascending: false });

        if (category && category !== 'All') {
            supabaseQuery = supabaseQuery.eq('category', category);
        }

        if (query) {
            supabaseQuery = supabaseQuery.ilike('title', `%${query}%`);
        }

        const { data, error } = await supabaseQuery;
        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<Product | null> {
        const { data, error } = await supabase
            .from('products')
            .select('*, profiles(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }
};

export const paymentService = {
    async initializeOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Order> {
        const { data, error } = await supabase
            .from('orders')
            .insert([{ ...orderData, status: 'pending' }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOrderStatus(orderId: string, status: Order['status'], reference?: string): Promise<void> {
        const updateData: any = { status };
        if (reference) updateData.paystack_reference = reference;

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

        if (error) throw error;
    },

    async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<void> {
        const { error } = await supabase
            .from('transactions')
            .insert([transaction]);

        if (error) throw error;
    },

    async getOrderById(id: string): Promise<(Order & { jobs?: Job }) | null> {
        const { data, error } = await supabase
            .from('orders')
            .select('*, jobs(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getOrderByReference(reference: string): Promise<Order | null> {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('paystack_reference', reference)
            .single();

        if (error) throw error;
        return data;
    }
};

export const orderService = {
    async submitWork(orderId: string): Promise<void> {
        // Update order and job status
        const { data: order, error: orderFetchError } = await supabase
            .from('orders')
            .select('job_id')
            .eq('id', orderId)
            .single();
        
        if (orderFetchError) throw orderFetchError;

        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ status: 'submitted' })
            .eq('id', orderId);
        
        if (orderUpdateError) throw orderUpdateError;

        const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ status: 'submitted' } as any)
            .eq('id', order.job_id);
        
        if (jobUpdateError) throw jobUpdateError;
    },

    async approveWork(orderId: string): Promise<void> {
        const { data: order, error: orderFetchError } = await supabase
            .from('orders')
            .select('job_id')
            .eq('id', orderId)
            .single();
        
        if (orderFetchError) throw orderFetchError;

        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ status: 'approved' })
            .eq('id', orderId);
        
        if (orderUpdateError) throw orderUpdateError;

        const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ status: 'completed' } as any)
            .eq('id', order.job_id);
        
        if (jobUpdateError) throw jobUpdateError;
    },

    async releaseWork(orderId: string): Promise<void> {
        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ status: 'released' })
            .eq('id', orderId);
        
        if (orderUpdateError) throw orderUpdateError;
    }
};

export const payoutService = {
    async createTransferRecipient(profile: Profile): Promise<string> {
        const response = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: "nuban",
                name: profile.full_name,
                account_number: profile.account_number,
                bank_code: profile.bank_code,
                currency: "NGN",
            }),
        });

        const data = await response.json();
        if (!data.status) throw new Error(data.message);

        // Update profile with recipient_code
        const { error } = await supabase
            .from('profiles')
            .update({ recipient_code: data.data.recipient_code })
            .eq('id', profile.id);
        
        if (error) throw error;

        return data.data.recipient_code;
    },

    async initiateTransfer(recipientCode: string, amount: number, reference: string, reason: string): Promise<any> {
        const response = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source: "balance",
                amount: Math.round(amount * 100), // In kobo
                recipient: recipientCode,
                reason,
                reference,
            }),
        });

        const data = await response.json();
        if (!data.status) throw new Error(data.message);

        return data.data;
    }
};


