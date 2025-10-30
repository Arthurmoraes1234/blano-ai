// Supabase Edge Function to securely remove a designer from an agency.
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
    // 1. Create Supabase client with the user's auth token to check permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Get the authenticated user and verify they are an 'owner'
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Authentication failed: User not found.");

    const { data: ownerProfile, error: ownerProfileError } = await supabaseClient
      .from('users')
      .select('id_agencia, role')
      .eq('uid', user.id)
      .single();

    if (ownerProfileError) throw new Error(`Could not retrieve your profile: ${ownerProfileError.message}`);
    if (ownerProfile.role !== 'owner' || !ownerProfile.id_agencia) {
      throw new Error("Authorization failed: You must be an agency owner to perform this action.");
    }
    
    const agencyId = ownerProfile.id_agencia;

    // 3. Get the designer's email from the request body
    const { email: designerEmail } = await req.json();
    if (!designerEmail || typeof designerEmail !== 'string') {
      throw new Error("Designer email is required in the request body.");
    }

    // 4. Create Supabase admin client to bypass RLS for the removal logic
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Server configuration error.");
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // --- ATOMIC REMOVAL LOGIC ---

    // 5. Find the designer by email (case-insensitive) using the admin client
    const { data: designer, error: findError } = await supabaseAdmin
        .from('users')
        .select('uid, id_agencia')
        .ilike('email', designerEmail.trim())
        .single();
    
    if (findError || !designer) {
        throw new Error(`Designer with email "${designerEmail}" not found in the system.`);
    }

    // 6. Security Check: Verify the found designer actually belongs to the owner's agency
    if (designer.id_agencia !== agencyId) {
        throw new Error(`This designer does not belong to your agency.`);
    }

    // 7. Update the designer's profile to set their agency ID to null
    const { error: updateUserError } = await supabaseAdmin
        .from('users')
        .update({ id_agencia: null })
        .eq('uid', designer.uid);
        
    if (updateUserError) {
        throw new Error(`Failed to unlink the designer: ${updateUserError.message}`);
    }

    // 8. Fetch the agency's current team list
    const { data: agency, error: fetchAgencyError } = await supabaseAdmin
        .from('agencies')
        .select('team')
        .eq('id', agencyId)
        .single();
        
    if (fetchAgencyError || !agency) {
        console.error(`Failed to fetch agency ${agencyId} to update the team list, but the designer was unlinked.`);
    } else {
        // 9. Remove the designer's email from the agency's 'team' array (case-insensitively)
        const updatedTeam = agency.team.filter(
            (memberEmail: string) => memberEmail.toLowerCase() !== designerEmail.trim().toLowerCase()
        );

        const { error: updateAgencyError } = await supabaseAdmin
            .from('agencies')
            .update({ team: updatedTeam })
            .eq('id', agencyId);
            
        if (updateAgencyError) {
            console.error(`Failed to update the team list for agency ${agencyId}: ${updateAgencyError.message}`);
        }
    }

    return new Response(JSON.stringify({ success: true, message: "Designer removed successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("Error in remove-designer function:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
