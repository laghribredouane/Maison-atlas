// Supabase Edge Function : admin-confirm-cod-payment
// Permet à l'administrateur de confirmer manuellement la réception du paiement COD (PAID) ou un échec (FAILED)
// et met automatiquement à jour l'historique des paiements.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, paymentStatus } = await req.json();
    const cleanStatus = String(paymentStatus || 'PAID').toUpperCase();

    if (!orderId || !['PENDING', 'PAID', 'FAILED'].includes(cleanStatus)) {
      return new Response(
        JSON.stringify({
          error: 'orderId et paymentStatus (PENDING | PAID | FAILED) sont requis.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: updatedOrder, error: orderErr } = await supabaseAdmin
      .from('orders')
      .update({
        payment_gateway: 'COD',
        payment_status: cleanStatus,
        order_status: cleanStatus === 'PAID' ? 'delivered' : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(orderId))
      .select()
      .single();

    if (orderErr) throw orderErr;

    const { data: updatedPayment, error: payErr } = await supabaseAdmin
      .from('payments')
      .update({
        gateway: 'COD',
        status: cleanStatus,
      })
      .eq('order_id', Number(orderId))
      .select()
      .single();

    if (payErr) throw payErr;

    await supabaseAdmin.from('payment_events').insert({
      payment_id: updatedPayment.id,
      event_type:
        cleanStatus === 'PAID'
          ? 'cod.payment_confirmed_paid'
          : cleanStatus === 'FAILED'
            ? 'cod.payment_failed'
            : 'cod.payment_pending',
      payload: {
        order_id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        payment_method: 'COD',
        payment_status: cleanStatus,
        confirmed_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        order: updatedOrder,
        payment: updatedPayment,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erreur de confirmation COD' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
