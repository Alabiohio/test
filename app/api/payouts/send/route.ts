import { NextResponse } from 'next/server';
import { payoutService, orderService } from '@/lib/services';
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

        // 1. Fetch user role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch order and freelancer details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, profiles:freelancer_id(*)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== 'approved') {
            return NextResponse.json({ error: 'Order is not in approved status' }, { status: 400 });
        }

        // 3. Initiate Transfer
        const freelancer = order.profiles;
        if (!freelancer || !freelancer.bank_code || !freelancer.account_number) {
            return NextResponse.json({ error: 'Freelancer bank details missing' }, { status: 400 });
        }

        let recipientCode = freelancer.recipient_code;
        if (!recipientCode) {
            recipientCode = await payoutService.createTransferRecipient(freelancer);
        }

        const transfer = await payoutService.initiateTransfer(
            recipientCode,
            order.freelancer_amount,
            `transfer_admin_${orderId}_${Date.now()}`,
            `Admin payout for job: ${orderId}`
        );

        // Mark as released
        await orderService.releaseWork(orderId);

        return NextResponse.json({ message: 'Payout sent successfully', transfer: transfer });

    } catch (error: any) {
        console.error('Admin payout error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
