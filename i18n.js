/**
 * Shramik Sathi — shared i18n
 * Worker-portal localisation (English / हिन्दी). Choice persists in
 * localStorage('ss_lang') so it carries across every worker page.
 *
 * Usage:
 *   <element data-i18n="key">fallback text</element>   → textContent
 *   <input  data-i18n-ph="key">                         → placeholder
 *   SSi18n.t('key')           → translated string (with {name}-style tokens left intact)
 *   SSi18n.toggle()           → flip EN <-> HI, persist, re-apply, fire 'ss-lang-changed'
 *   document.addEventListener('ss-lang-changed', e => { ... })  → re-render dynamic text
 */
(function () {
  'use strict';
  const STORAGE_KEY = 'ss_lang';

  const DICT = {
    en: {
      // nav
      nav_home: 'Home', nav_jobs: 'Jobs', nav_news: 'News', nav_profile: 'Profile',
      // greetings (combined with the worker's name in JS)
      greet_morning: 'Good Morning', greet_afternoon: 'Good Afternoon', greet_evening: 'Good Evening',
      // quick stats
      stat_days: 'Days', stat_leave: 'Leave Bal', stat_pending: 'Pending', stat_reports: 'Reports',
      // awaiting-onboarding screen
      await_title: "You're registered, {name}!",
      await_msg: "You're not assigned to an employer yet. Browse verified jobs and apply — your dashboard, attendance and payslips unlock once an employer hires you.",
      await_idlabel: 'Your ID:',
      browse_jobs: 'Browse Jobs',
      track_apps: 'Track my applications →',
      // dashboard
      earnings_title: "This Month's Earnings",
      quick_actions: 'Quick Actions',
      act_attendance: 'Attendance', act_leave: 'Apply Leave', act_advance: 'Advance',
      act_report: 'Report Issue', act_payslip: 'Payslip', act_findjobs: 'Find Jobs',
      attendance_month: 'Attendance This Month',
      recent_activity: 'Recent Activity',
      compliance_status: 'Compliance Status',
      comp_police: 'Police Verification',
    },
    hi: {
      nav_home: 'होम', nav_jobs: 'नौकरियां', nav_news: 'समाचार', nav_profile: 'प्रोफ़ाइल',
      greet_morning: 'सुप्रभात', greet_afternoon: 'नमस्कार', greet_evening: 'शुभ संध्या',
      stat_days: 'दिन', stat_leave: 'छुट्टी शेष', stat_pending: 'बकाया', stat_reports: 'रिपोर्ट',
      await_title: 'आप पंजीकृत हैं, {name}!',
      await_msg: 'आपको अभी किसी नियोक्ता को नहीं सौंपा गया है। सत्यापित नौकरियां देखें और आवेदन करें — नियोक्ता द्वारा काम पर रखे जाने पर आपका डैशबोर्ड, हाज़िरी और वेतन पर्ची खुल जाएगी।',
      await_idlabel: 'आपकी ID:',
      browse_jobs: 'नौकरियां देखें',
      track_apps: 'मेरे आवेदन देखें →',
      earnings_title: 'इस महीने की कमाई',
      quick_actions: 'त्वरित कार्य',
      act_attendance: 'हाज़िरी', act_leave: 'छुट्टी', act_advance: 'अग्रिम',
      act_report: 'शिकायत', act_payslip: 'वेतन पर्ची', act_findjobs: 'नौकरी खोजें',
      attendance_month: 'इस महीने की हाज़िरी',
      recent_activity: 'हाल की गतिविधि',
      compliance_status: 'अनुपालन स्थिति',
      comp_police: 'पुलिस सत्यापन',
    },
  };

  let lang = 'en';
  try { lang = localStorage.getItem(STORAGE_KEY) || 'en'; } catch (_) {}
  if (lang !== 'en' && lang !== 'hi') lang = 'en';

  function t(key) {
    const d = DICT[lang] || DICT.en;
    return (d[key] != null ? d[key] : (DICT.en[key] != null ? DICT.en[key] : key));
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.documentElement.setAttribute('lang', lang);
  }

  function setLang(l) {
    lang = (l === 'hi') ? 'hi' : 'en';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    apply();
    document.dispatchEvent(new CustomEvent('ss-lang-changed', { detail: { lang } }));
  }

  function toggle() { setLang(lang === 'en' ? 'hi' : 'en'); }

  // Label to show on a toggle button (the language you'd switch TO)
  function otherLabel() { return lang === 'en' ? 'हिं' : 'EN'; }

  window.SSi18n = {
    t: t, apply: apply, setLang: setLang, toggle: toggle, otherLabel: otherLabel,
    get lang() { return lang; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})();
