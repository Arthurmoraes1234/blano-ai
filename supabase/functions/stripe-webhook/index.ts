// Fix: Corrected the type reference path to include '/dist/' which contains the actual Deno type definitions. This resolves the 'Cannot find name Deno' and other related type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2/dist/edge-runtime.d.ts" />
// Supabase Edge Function for Stripe Webhooks

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.8.0?target=deno";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to update or insert subscription details
const upsertSubscription = async (supabaseAdmin: any, subscription: Stripe.Subscription) => {
    const subscriptionData = {
        id: subscription.id,
        user_id: subscription.metadata.user_id,
        status: subscription.status,
        plan_id: subscription.items.data[0].price.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    };

    const { error } = await supabaseAdmin.from('subscriptions').upsert(subscriptionData);
    if (error) throw error;

    console.log(`Subscription [${subscription.id}] for user [${subscription.metadata.user_id}] upserted.`);
};

// Function to update the customer ID in the users table
const updateUserCustomerId = async (supabaseAdmin: any, userId: string, customerId: string) => {
    const { error } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('uid', userId);
    
    if (error) throw error;

    console.log(`Stripe customer ID [${customerId}] updated for user [${userId}].`);
};


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_API_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !stripeWebhookSecret) {
        throw new Error("Stripe environment variables are not configured.");
    }
    
    const stripe = new Stripe(stripeKey);
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
         throw new Error("Stripe signature missing from header.");
    }
    
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);

    // Supabase Admin client for server-side operations
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    let subscription: Stripe.Subscription;
    let session: Stripe.Checkout.Session;

    switch (event.type) {
        case 'checkout.session.completed':
            session = event.data.object as Stripe.Checkout.Session;
            // If there's no subscription ID, we can't do anything. This happens with one-time payments.
            if (!session.subscription) {
              console.log(`Checkout session ${session.id} completed without a subscription.`);
              break;
            }
            subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            
            // Update user profile with customer ID
            await updateUserCustomerId(supabaseAdmin, subscription.metadata.user_id, session.customer as string);
            
            // Create or update the subscription record
            await upsertSubscription(supabaseAdmin, subscription);
            break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            subscription = event.data.object as Stripe.Subscription;
            await upsertSubscription(supabaseAdmin, subscription);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
    });

  } catch (e) {
    console.error("Error processing Stripe webhook:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
