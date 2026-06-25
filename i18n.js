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
      edit_pending: '⏳ Profile changes awaiting employer approval',
      sec_identity: 'Identity Information', sec_kyc: 'KYC Documents', sec_bank: 'Bank Account Details',
      sec_contact: 'Contact Information', sec_compliance: 'Compliance IDs',
      lbl_aadhaar_no: 'Aadhar Number', lbl_dob: 'Date of Birth', lbl_gender: 'Gender', lbl_blood: 'Blood Group',
      lbl_aadhaar_card: 'Aadhaar Card', lbl_pan_card: 'PAN Card', lbl_cv: 'Resume / CV', kyc_upload: 'Upload', kyc_view: 'View',
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
      // registration form
      reg_title: 'Complete Your Profile',
      reg_subtitle: 'Fill in your details as per your Aadhar card and official documents. This is required for compliance.',
      reg_badge_personal: 'Personal Information', reg_badge_contact: 'Contact & Address', reg_badge_compliance: 'Compliance & IDs', reg_badge_bank: 'Bank Account Details', reg_badge_trade: 'Trade & Skill',
      reg_l_fullname: 'Full Name (as per Aadhar)', reg_l_father: "Father's / Husband's Name", reg_l_dob: 'Date of Birth', reg_l_gender: 'Gender', reg_l_blood: 'Blood Group', reg_l_marital: 'Marital Status', reg_l_idmark: 'Identification Mark',
      reg_l_mobile: 'Mobile Number', reg_l_emergency: 'Emergency Contact Number', reg_l_address: 'Permanent Address', reg_l_state: 'State', reg_l_pin: 'PIN Code',
      reg_l_aadhar: 'Aadhar Number', reg_l_pan: 'PAN Number', reg_l_voter: 'Voter ID', reg_l_uan: 'UAN Number (PF)', reg_l_esic: 'ESIC Number',
      reg_l_bank: 'Bank Name', reg_l_account: 'Account Number', reg_l_ifsc: 'IFSC Code', reg_l_category: 'Category', reg_l_trade: 'Trade / Designation', reg_l_emptype: 'Employee Type',
      reg_ph_fullname: 'Enter your full name', reg_ph_father: "Father's or Husband's name", reg_ph_idmark: 'e.g. Mole on left cheek', reg_ph_mobile: '10-digit mobile number', reg_ph_emergency: 'Family/relative number', reg_ph_address: 'Full address including village/town, district', reg_ph_pin: '6-digit PIN',
      reg_ph_aadhar: '12-digit Aadhar number', reg_ph_voter: 'Voter ID card number', reg_ph_uan: '12-digit UAN', reg_ph_esic: '17-digit ESIC IP No', reg_ph_bank: 'e.g. State Bank of India', reg_ph_account: 'Savings account number', reg_ph_designation_other: 'Type your trade — what do you do?',
      reg_opt_select: 'Select', reg_opt_state: 'Select State', reg_opt_category: 'Select Skill Category', reg_opt_trade: 'Select your trade',
      reg_next_contact: 'Next — Contact Details', reg_next_id: 'Next — ID & Compliance', reg_next_bank: 'Next — Bank Details', reg_next_trade: 'Next — Trade & Skill', reg_back: 'Back', reg_submit: 'Submit & Complete',
      reg_hint_idmark: 'As required under Factories Act, 1948 — Form No. 25-B', reg_hint_aadhar: 'Required for UAN/PF registration (EPFO Form 11) and ESIC (Form 1).', reg_hint_pan: 'Required if salary exceeds ₹2,50,000/year (Income Tax Act, Section 206AA).', reg_hint_uan: 'If previously enrolled in EPF.', reg_hint_esic: 'If previously registered.', reg_hint_category: 'As classified under the Minimum Wages Act, 1948 (Central/State Schedule).', reg_hint_designation_other: 'Tell us your actual work so employers understand your skills.',
      reg_done_title: 'Registration Complete!', reg_done_msg: 'Your profile is saved. This is your permanent Shramik Sathi ID:', reg_done_redirect: 'Taking you to your dashboard…',
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
      edit_pending: '⏳ प्रोफ़ाइल परिवर्तन नियोक्ता की मंज़ूरी की प्रतीक्षा में',
      sec_identity: 'पहचान जानकारी', sec_kyc: 'केवाईसी दस्तावेज़', sec_bank: 'बैंक खाता विवरण',
      sec_contact: 'संपर्क जानकारी', sec_compliance: 'अनुपालन आईडी',
      lbl_aadhaar_no: 'आधार नंबर', lbl_dob: 'जन्म तिथि', lbl_gender: 'लिंग', lbl_blood: 'रक्त समूह',
      lbl_aadhaar_card: 'आधार कार्ड', lbl_pan_card: 'पैन कार्ड', lbl_cv: 'रिज़्यूमे / CV', kyc_upload: 'अपलोड', kyc_view: 'देखें',
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
      // registration form
      reg_title: 'अपनी प्रोफ़ाइल पूरी करें',
      reg_subtitle: 'अपना विवरण अपने आधार कार्ड और आधिकारिक दस्तावेज़ों के अनुसार भरें। यह अनुपालन के लिए आवश्यक है।',
      reg_badge_personal: 'व्यक्तिगत जानकारी', reg_badge_contact: 'संपर्क और पता', reg_badge_compliance: 'अनुपालन और आईडी', reg_badge_bank: 'बैंक खाता विवरण', reg_badge_trade: 'काम और कौशल',
      reg_l_fullname: 'पूरा नाम (आधार अनुसार)', reg_l_father: 'पिता / पति का नाम', reg_l_dob: 'जन्म तिथि', reg_l_gender: 'लिंग', reg_l_blood: 'रक्त समूह', reg_l_marital: 'वैवाहिक स्थिति', reg_l_idmark: 'पहचान चिह्न',
      reg_l_mobile: 'मोबाइल नंबर', reg_l_emergency: 'आपातकालीन संपर्क नंबर', reg_l_address: 'स्थायी पता', reg_l_state: 'राज्य', reg_l_pin: 'पिन कोड',
      reg_l_aadhar: 'आधार नंबर', reg_l_pan: 'पैन नंबर', reg_l_voter: 'वोटर आईडी', reg_l_uan: 'यूएएन नंबर (पीएफ)', reg_l_esic: 'ईएसआईसी नंबर',
      reg_l_bank: 'बैंक का नाम', reg_l_account: 'खाता संख्या', reg_l_ifsc: 'आईएफएससी कोड', reg_l_category: 'श्रेणी', reg_l_trade: 'काम / पदनाम', reg_l_emptype: 'कर्मचारी प्रकार',
      reg_ph_fullname: 'अपना पूरा नाम दर्ज करें', reg_ph_father: 'पिता या पति का नाम', reg_ph_idmark: 'उदा. बाएं गाल पर तिल', reg_ph_mobile: '10 अंकों का मोबाइल नंबर', reg_ph_emergency: 'परिवार/रिश्तेदार का नंबर', reg_ph_address: 'गांव/शहर, ज़िला सहित पूरा पता', reg_ph_pin: '6 अंकों का पिन',
      reg_ph_aadhar: '12 अंकों का आधार नंबर', reg_ph_voter: 'वोटर आईडी कार्ड नंबर', reg_ph_uan: '12 अंकों का यूएएन', reg_ph_esic: '17 अंकों का ईएसआईसी आईपी नंबर', reg_ph_bank: 'उदा. स्टेट बैंक ऑफ इंडिया', reg_ph_account: 'बचत खाता संख्या', reg_ph_designation_other: 'अपना काम लिखें — आप क्या करते हैं?',
      reg_opt_select: 'चुनें', reg_opt_state: 'राज्य चुनें', reg_opt_category: 'कौशल श्रेणी चुनें', reg_opt_trade: 'अपना काम चुनें',
      reg_next_contact: 'आगे — संपर्क विवरण', reg_next_id: 'आगे — आईडी और अनुपालन', reg_next_bank: 'आगे — बैंक विवरण', reg_next_trade: 'आगे — काम और कौशल', reg_back: 'पीछे', reg_submit: 'जमा करें और पूरा करें',
      reg_hint_idmark: 'कारखाना अधिनियम, 1948 — फॉर्म नं. 25-B के अनुसार आवश्यक।', reg_hint_aadhar: 'यूएएन/पीएफ पंजीकरण (EPFO फॉर्म 11) और ईएसआईसी (फॉर्म 1) के लिए आवश्यक।', reg_hint_pan: 'यदि वेतन ₹2,50,000/वर्ष से अधिक है तो आवश्यक (आयकर अधिनियम, धारा 206AA)।', reg_hint_uan: 'यदि पहले EPF में नामांकित हों।', reg_hint_esic: 'यदि पहले पंजीकृत हों।', reg_hint_category: 'न्यूनतम मजदूरी अधिनियम, 1948 (केंद्र/राज्य अनुसूची) के अनुसार वर्गीकृत।', reg_hint_designation_other: 'अपना असली काम बताएं ताकि नियोक्ता आपके कौशल को समझ सकें।',
      reg_done_title: 'पंजीकरण पूर्ण!', reg_done_msg: 'आपकी प्रोफ़ाइल सहेज ली गई है। यह आपकी स्थायी श्रमिक साथी आईडी है:', reg_done_redirect: 'आपको आपके डैशबोर्ड पर ले जा रहे हैं…',
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
