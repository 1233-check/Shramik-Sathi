// Shramik Sathi — Supabase Configuration
const SUPABASE_URL = 'https://ecplvcnaonnxzpwbzrix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcGx2Y25hb25ueHpwd2J6cml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc5MTYsImV4cCI6MjA5NDg3MzkxNn0.hU1E04h5EVq9D6_h2sf3YL7fXEh5r5ap_ADxO6NpIUQ';

// Initialize Supabase client (loaded via CDN in HTML files)
function getSupabaseClient() {
  if (window._supabase) return window._supabase;
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return window._supabase;
}
