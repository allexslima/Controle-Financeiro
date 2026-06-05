import { createClient } from '@supabase/supabase-js';

// Estas variáveis devem ser configuradas no seu ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL ou Anon Key não encontradas. Certifique-se de configurar as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');