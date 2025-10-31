// --- MOCK CRÍTICO PARA AMBIENTE VITE/BROWSER: RESOLVE 'process is not defined' ---
// O Supabase tenta acessar 'process' globalmente. Esta linha garante que o objeto
// exista no navegador (Vite) para evitar o erro de inicialização de 1 segundo.
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: { NODE_ENV: 'production' } };
}
// ---------------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

// Cole sua URL e Chave Anon aqui
export const supabaseUrl = 'https://xzcyfsmuvrkfxsifkpvo.supabase.co'; 
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y3lmc211dnJrZnhzaWZrcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzEyODUsImV4cCI6MjA3NDE0NzI4NX0.W42vVxhgnYQt6LGPNH2_yK9ygAFJlu6lpseRR809bgA';

// Em uma aplicação real, estes valores devem vir de variáveis de ambiente
// para maior segurança.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente dedicado para chamadas anônimas que devem usar as políticas RLS públicas.
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

