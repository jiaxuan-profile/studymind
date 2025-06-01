// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not set. Check your .env file and ensure it's prefixed with VITE_.");
}
if (!supabaseKey) {
  throw new Error("VITE_SUPABASE_SERVICE_KEY is not set. Check your .env file and ensure it's prefixed with VITE_.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);