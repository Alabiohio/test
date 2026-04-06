import { NextResponse } from 'next/server';
import { orderService, payoutService } from '@/lib/services';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, profiles:freelancer_id(*)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Verify user is the client
        if (order.client_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.status !== 'submitted') {
            return NextResponse.json({ error: 'Order is not in submitted status' }, { status: 400 });
        }

        // 3. Approve work (updates DB statuses)
        await orderService.approveWork(orderId);

        // 4. Trigger Payout
        const freelancer = order.profiles;
        if (freelancer && freelancer.bank_code && freelancer.account_number) {
            try {
                let recipientCode = freelancer.recipient_code;

                // Create recipient if not exists
                if (!recipientCode) {
                    recipientCode = await payoutService.createTransferRecipient(freelancer);
                }

                // Initiate Transfer
                const transfer = await payoutService.initiateTransfer(
                    recipientCode,
                    order.freelancer_amount,
                    `transfer_${orderId}_${Date.now()}`,
                    `Payment for job: ${orderId}`
                );

                // Mark order as released
                await orderService.releaseWork(orderId);

                return NextResponse.json({ 
                    message: 'Work approved and payout initiated',
                    transfer: transfer 
                });
            } catch (payoutError: any) {
                console.error('Payout initiation failed:', payoutError);
                return NextResponse.json({ 
                    message: 'Work approved, but payout initiation failed. Admin will process manually.',
                    error: payoutError.message 
                });
            }
        } else {
            return NextResponse.json({ 
                message: 'Work approved. Payout will be processed once freelancer provides bank details.' 
            });
        }

    } catch (error: any) {
        console.error('Order approval error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
