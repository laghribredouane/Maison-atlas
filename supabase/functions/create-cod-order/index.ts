// Supabase Edge Function : create-cod-order
// Enregistre exclusivement une commande avec payment_method = 'COD' et payment_status = 'PENDING'.
// Ne fait jamais confiance aux valeurs de paiement envoyées par le frontend.

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
    const body = await req.json();

    // 1. Rejeter explicitement toute tentative d'utiliser un autre mode de paiement que COD
    const requestedMethod = body.payment_method ?? body.paymentGateway ?? 'COD';
    if (String(requestedMethod).trim().toUpperCase() !== 'COD') {
      return new Response(
        JSON.stringify({
          error:
            'Mode de paiement refusé. Seul le paiement à la livraison (COD) est autorisé sur cette plateforme.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customerName, customerEmail, customerPhone, shippingAddress, shippingCity, shippingPostalCode, items } =
      body;

    if (!customerName || !customerPhone || !shippingAddress || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nom, téléphone, adresse et articles du panier sont obligatoires.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionReference = `COD-REC-${orderNumber}`;

    // 2. Forcer payment_gateway = 'COD' et payment_status = 'PENDING' côté serveur
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: String(customerName).trim(),
        customer_email: String(customerEmail || 'client@maison-atlas.ma').trim(),
        customer_phone: String(customerPhone).trim(),
        shipping_address: String(shippingAddress).trim(),
        shipping_city: String(shippingCity || 'Casablanca').trim(),
        shipping_postal_code: String(shippingPostalCode || '20000').trim(),
        payment_gateway: 'COD',
        payment_status: 'PENDING',
        order_status: 'confirmed',
        subtotal_mad: body.subtotalMad ?? 0,
        total_mad: body.totalMad ?? 0,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Créer l'enregistrement de paiement COD initialisé à PENDING
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: order.id,
        gateway: 'COD',
        idempotency_key: `idem_cod_${order.id}_${Date.now()}`,
        transaction_reference: transactionReference,
        amount_mad: order.total_mad,
        currency: 'MAD',
        status: 'PENDING',
        sandbox_mode: false,
        signature_verified: true,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 4. Journaliser l'événement initial dans l'historique des paiements
    await supabaseAdmin.from('payment_events').insert({
      payment_id: payment.id,
      event_type: 'cod.order_registered',
      payload: {
        order_number: orderNumber,
        payment_method: 'COD',
        payment_status: 'PENDING',
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        order,
        payment,
        payment_method: 'COD',
        payment_status: 'PENDING',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur COD' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
