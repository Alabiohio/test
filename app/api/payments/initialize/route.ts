import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { paymentService } from '@/lib/services';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION || '0.10');

export async function POST(request: Request) {
    try {
        const { jobId, freelancerId, amount, email } = await request.json();

        if (!jobId || !freelancerId || !amount || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Calculate commission and freelancer amount
        const commission = amount * PLATFORM_COMMISSION_RATE;
        const freelancer_amount = amount - commission;

        // 2. Create order in Supabase (status: pending)
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('Auth check failed in initialize:', authError);
            return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
        }

        const order = await paymentService.initializeOrder({
            job_id: jobId,
            client_id: user.id,
            freelancer_id: freelancerId,
            amount,
            commission,
            freelancer_amount,
        });

        // 3. Initialize Paystack transaction
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                amount: Math.round(amount * 100), // Paystack expects amount in kobo
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs/${jobId}?payment=success`,
                metadata: {
                    orderId: order.id,
                    jobId: jobId,
                },
            }),
        });

        const paystackData = await response.json();

        if (!paystackData.status) {
            console.error('Paystack initialization failed:', paystackData);
            return NextResponse.json({ error: paystackData.message }, { status: 500 });
        }

        // 4. Update order with Paystack reference
        await paymentService.updateOrderStatus(order.id, 'pending', paystackData.data.reference);

        return NextResponse.json({
            authorization_url: paystackData.data.authorization_url,
            reference: paystackData.data.reference,
        });

    } catch (error: any) {
        console.error('Payment initialization error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal server error',
            details: error.toString()
        }, { status: 500 });
    }
}
