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
      // profile page
      edit_profile: 'Edit Profile',
      sec_identity: 'Identity Information', sec_kyc: 'KYC Documents', sec_bank: 'Bank Account Details',
      sec_contact: 'Contact Information', sec_compliance: 'Compliance IDs',
      lbl_aadhaar_no: 'Aadhar Number', lbl_dob: 'Date of Birth', lbl_gender: 'Gender', lbl_blood: 'Blood Group',
      lbl_aadhaar_card: 'Aadhaar Card', lbl_pan_card: 'PAN Card', kyc_upload: 'Upload', kyc_view: 'View',
      lbl_account_no: 'Account Number', lbl_ifsc: 'IFSC Code',
      lbl_mobile: 'Mobile Number', lbl_emergency: 'Emergency Contact', lbl_address: 'Address',
      lbl_pan_no: 'PAN Number', lbl_uan: 'UAN (PF)', lbl_esic: 'ESIC Number',
      // jobs page
      jobs_title: 'Jobs', jobs_sub: 'Find and apply to verified roles',
      tab_browse: 'Browse', tab_apps: 'My Applications', search_ph: 'Search role or location',
      cat_all: 'All', cat_unskilled: 'Unskilled', cat_semi: 'Semi-skilled', cat_skilled: 'Skilled', cat_highly: 'Highly Skilled',
      job_apply: 'Apply', job_applied: 'Applied', job_applying: 'Applying…', wage_on_apply: 'Wage on apply',
      empty_jobs: 'No open jobs right now', empty_search: 'No jobs match your search', empty_apps: "You haven't applied to any jobs yet", err_load_jobs: 'Could not load jobs',
      // news page
      news_title: 'Company News',
      news_locked_title: 'News unlocks after onboarding',
      news_locked_msg: 'Company news and updates appear once an employer hires you. Browse jobs and apply to get started.',
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
      // profile page
      edit_profile: 'प्रोफ़ाइल संपादित करें',
      sec_identity: 'पहचान जानकारी', sec_kyc: 'केवाईसी दस्तावेज़', sec_bank: 'बैंक खाता विवरण',
      sec_contact: 'संपर्क जानकारी', sec_compliance: 'अनुपालन आईडी',
      lbl_aadhaar_no: 'आधार नंबर', lbl_dob: 'जन्म तिथि', lbl_gender: 'लिंग', lbl_blood: 'रक्त समूह',
      lbl_aadhaar_card: 'आधार कार्ड', lbl_pan_card: 'पैन कार्ड', kyc_upload: 'अपलोड', kyc_view: 'देखें',
      lbl_account_no: 'खाता संख्या', lbl_ifsc: 'आईएफएससी कोड',
      lbl_mobile: 'मोबाइल नंबर', lbl_emergency: 'आपातकालीन संपर्क', lbl_address: 'पता',
      lbl_pan_no: 'पैन नंबर', lbl_uan: 'यूएएन (पीएफ)', lbl_esic: 'ईएसआईसी नंबर',
      // jobs page
      jobs_title: 'नौकरियां', jobs_sub: 'सत्यापित नौकरियां खोजें और आवेदन करें',
      tab_browse: 'ब्राउज़ करें', tab_apps: 'मेरे आवेदन', search_ph: 'भूमिका या स्थान खोजें',
      cat_all: 'सभी', cat_unskilled: 'अकुशल', cat_semi: 'अर्ध-कुशल', cat_skilled: 'कुशल', cat_highly: 'अति कुशल',
      job_apply: 'आवेदन करें', job_applied: 'आवेदन किया', job_applying: 'आवेदन हो रहा है…', wage_on_apply: 'आवेदन पर वेतन',
      empty_jobs: 'अभी कोई नौकरी उपलब्ध नहीं', empty_search: 'खोज से मेल खाने वाली कोई नौकरी नहीं', empty_apps: 'आपने अभी तक किसी नौकरी के लिए आवेदन नहीं किया', err_load_jobs: 'नौकरियां लोड नहीं हो सकीं',
      // news page
      news_title: 'कंपनी समाचार',
      news_locked_title: 'ऑनबोर्डिंग के बाद समाचार खुलेंगे',
      news_locked_msg: 'नियोक्ता द्वारा काम पर रखे जाने के बाद कंपनी समाचार और अपडेट दिखेंगे। शुरू करने के लिए नौकरियां देखें और आवेदन करें।',
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
    refreshToggleLabels();
    document.documentElement.setAttribute('lang', lang);
  }

  // Any element marked [data-ss-lang-toggle] becomes a working EN<->HI switch
  // with no per-page JS — its label auto-updates to the language you'd switch to.
  function refreshToggleLabels() {
    document.querySelectorAll('[data-ss-lang-toggle]').forEach(btn => { btn.textContent = otherLabel(); });
  }
  function wireToggles() {
    document.querySelectorAll('[data-ss-lang-toggle]').forEach(btn => {
      if (btn.__ssWired) return;
      btn.__ssWired = true;
      btn.addEventListener('click', toggle);
    });
    refreshToggleLabels();
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
    document.addEventListener('DOMContentLoaded', function () { apply(); wireToggles(); });
  } else {
    apply(); wireToggles();
  }
})();
