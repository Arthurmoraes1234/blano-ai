// Supabase Edge Function to accept an agency invitation.
// Fix: Corrected the type reference path to include '/dist/' which contains the actual Deno type definitions. This resolves the 'Cannot find name Deno' and other related type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2/dist/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user making the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Authentication failed: User not found.");

    // 2. Get the invitation ID from the request body
    const { invitationId } = await req.json();
    if (!invitationId) throw new Error("Invitation ID is required.");

    // 3. Create a Supabase admin client to perform elevated actions
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Server configuration error: Missing environment variables.");
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- TRANSACTION LOGIC ---

    // 4. Fetch the invitation details and verify the invitee
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select('id, id_agencia, emailDesigner')
      .eq('id', invitationId)
      .single();

    if (invitationError) throw new Error(`Invitation not found or could not be fetched: ${invitationError.message}`);
    if (invitation.emailDesigner.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error("Authorization failed: Invitation is not for this user.");
    }

    // 5. Update the user's profile with the agency ID
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({ id_agencia: invitation.id_agencia })
      .eq('uid', user.id);

    if (userUpdateError) throw new Error(`Failed to update user profile: ${userUpdateError.message}`);

    // 6. Fetch the agency to get the current team list
    const { data: agency, error: agencyFetchError } = await supabaseAdmin
        .from('agencies')
        .select('team')
        .eq('id', invitation.id_agencia)
        .single();
    
    if (agencyFetchError) throw new Error(`Failed to fetch agency data: ${agencyFetchError.message}`);

    // 7. Add the user's email to the agency's team array (preventing duplicates)
    const currentTeam = agency.team || [];
    // Use the email from the invitation to preserve original casing
    const invitedEmail = invitation.emailDesigner;
    if (!currentTeam.some(email => email.toLowerCase() === invitedEmail.toLowerCase())) {
        const newTeam = [...currentTeam, invitedEmail];
        const { error: agencyUpdateError } = await supabaseAdmin
          .from('agencies')
          .update({ team: newTeam })
          .eq('id', invitation.id_agencia);
        if (agencyUpdateError) throw new Error(`Failed to update agency team: ${agencyUpdateError.message}`);
    }

    // 8. Delete the used invitation
    const { error: deleteError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', invitation.id);

    if (deleteError) throw new Error(`Failed to delete invitation: ${deleteError.message}`);

    // --- END TRANSACTION LOGIC ---

    return new Response(JSON.stringify({ success: true, message: "Invitation accepted successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("Error accepting invitation:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
