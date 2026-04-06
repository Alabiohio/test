import { NextResponse } from 'next/server';
import { orderService } from '@/lib/services';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // 1. Check if user is the freelancer for this order
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('freelancer_id, status')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.freelancer_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.status !== 'funded') {
            return NextResponse.json({ error: 'Order is not in funded status' }, { status: 400 });
        }

        // 2. Submit work
        await orderService.submitWork(orderId);

        return NextResponse.json({ message: 'Work submitted successfully' });

    } catch (error: any) {
        console.error('Order submission error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
