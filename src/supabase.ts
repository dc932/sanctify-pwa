import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptnvgzceovaflwvzsdzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnZnemNlb3ZhZmx3dnpzZHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNzE0NzcsImV4cCI6MjEwNzc0NzQ3N30.qUbBjVxz3GCyTO833DfuxPTxuevZO4D83B7H6c4RQYw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
