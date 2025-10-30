// Fix: Corrected the type reference path to include '/dist/' which contains the actual Deno type definitions. This resolves the 'Cannot find name Deno' and other related type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2/dist/edge-runtime.d.ts" />

// Supabase Edge Function to verify a Stripe session and activate a subscription.
// This is a new, direct approach to bypass the failing webhook.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.8.0?target=deno";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const upsertSubscription = async (supabaseAdmin: any, subscription: Stripe.Subscription) => {
  const userId = subscription.metadata.user_id;
  if (!userId) throw new Error("User ID not found in subscription metadata.");

  const subscriptionData = {
    id: subscription.id,
    user_id: userId,
    status: subscription.status,
    plan_id: subscription.items.data[0].price.id,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'id' });

  if (error) throw error;
  console.log(`Subscription ${subscription.id} upserted for user ${userId}.`);
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the user calling this function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Authentication failed.");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Stripe Session ID is required.");

    const stripeKey = Deno.env.get("STRIPE_API_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!stripeKey || !serviceRoleKey || !supabaseUrl) {
      throw new Error("Server configuration error.");
    }

    const stripe = new Stripe(stripeKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== 'complete') {
        throw new Error("Checkout session was not completed.");
    }
    if (!session.subscription || !session.customer) {
        throw new Error("Checkout session did not result in a subscription.");
    }
    // Security check: ensure the user making the request is the one who paid
    if (session.customer_email !== user.email) {
      throw new Error("Session email does not match authenticated user.");
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const userId = subscription.metadata.user_id;
    const stripeCustomerId = subscription.customer as string;

    if (!userId || userId !== user.id) throw new Error("User ID mismatch.");
    
    // Update the user's profile with their Stripe Customer ID
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('uid', userId);
    
    if(updateUserError) throw updateUserError;
    console.log(`User ${userId} updated with stripe_customer_id ${stripeCustomerId}.`);

    // Create or update the subscription record
    await upsertSubscription(supabaseAdmin, subscription);

    return new Response(JSON.stringify({ success: true, status: subscription.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("Verification Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
