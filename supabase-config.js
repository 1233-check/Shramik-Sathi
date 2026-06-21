// Shramik Sathi — Supabase Configuration
const SUPABASE_URL = 'https://ecplvcnaonnxzpwbzrix.supabase.co';
// Publishable key (public client key, RLS-enforced — safe in the frontend).
// Legacy anon/service_role JWT keys were disabled on 2026-06-21.
const SUPABASE_ANON_KEY = 'sb_publishable_0_yjdT7oF0kJOCXxUztaeQ_M8YK3X3P';

// ─────────────────────────────────────────────────────────────
// Session policy:
//   • Employer pages → sessionStorage. The login is cleared when the browser
//     session ends, so starting a NEW browser session requires a fresh login
//     (no silent auto-login). It still persists across in-app navigation
//     within the same session.
//   • Worker pages / everything else → localStorage. Workers use the mobile
//     PWA and should stay signed in across sessions.
// ─────────────────────────────────────────────────────────────
const SS_EMPLOYER_PAGES = new Set([
  'employer-login.html', 'employer-register.html', 'hire.html',
  'attendance.html', 'muster-roll.html', 'statutory-registers.html',
  'workmen-register.html', 'leave-management.html',
  'committee-dashboards.html', 'manual-compliance.html'
]);

function ssIsEmployerPage() {
  try {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    return SS_EMPLOYER_PAGES.has(file);
  } catch (_) { return false; }
}

// Initialize Supabase client (loaded via CDN in HTML files)
function getSupabaseClient() {
  if (window._supabase) return window._supabase;
  const employerPage = ssIsEmployerPage();
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // employer → per-session login; worker/other → persistent login
      storage: employerPage ? window.sessionStorage : window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  });
  return window._supabase;
}
