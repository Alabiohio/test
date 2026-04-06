import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { paymentService } from '@/lib/services';
import { createClient } from '@/lib/supabase-server';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(request: Request) {
    try {
        const payload = await request.text();
        const signature = request.headers.get('x-paystack-signature');

        if (!signature || !PAYSTACK_SECRET_KEY) {
            return new Response('Unauthorized', { status: 401 });
        }

        // 1. Verify Paystack signature
        const hmac = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY);
        const expectedSignature = hmac.update(payload).digest('hex');

        if (signature !== expectedSignature) {
            return new Response('Invalid Signature', { status: 401 });
        }

        const event = JSON.parse(payload);

        // 2. Handle successful charge
        if (event.event === 'charge.success') {
            const { reference, amount, metadata, customer } = event.data;
            const orderId = metadata?.orderId;
            const jobId = metadata?.jobId;

            // Update order status to funded and job status to in_progress
            if (orderId && jobId) {
                const supabase = await createClient();
                await paymentService.updateOrderStatus(orderId, 'funded', reference);
                
                // Update job status
                const { error: jobUpdateError } = await supabase
                    .from('jobs')
                    .update({ status: 'in_progress' } as any)
                    .eq('id', jobId);

                if (jobUpdateError) throw jobUpdateError;

                // Create a transaction log
                await paymentService.createTransaction({
                    order_id: orderId,
                    user_id: customer.id || null, // Best effort for tracking
                    type: 'payment',
                    amount: amount / 100, // Back to regular amount from kobo
                    status: 'success',
                    reference: reference,
                    metadata: event.data,
                });

                console.log(`Payment successful for order ${orderId}, reference ${reference}`);
            }
        }

        return new Response('OK', { status: 200 });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}
