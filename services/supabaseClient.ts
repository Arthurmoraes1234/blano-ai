import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xzcyfsmuvrkfxsifkpvo.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua_chave_fallback';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
