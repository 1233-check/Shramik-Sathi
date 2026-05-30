// Counter animation
function animateCounter(el, target) {
  let current = 0;
  const step = Math.ceil(target / 60);
  const suffix = el.dataset.suffix || '';
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current.toLocaleString() + suffix;
  }, 25);
}

// Scroll reveal with Intersection Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Trigger counters
      if (entry.target.classList.contains('metrics')) {
        entry.target.querySelectorAll('.num').forEach(n => {
          if (!n.dataset.animated) {
            n.dataset.animated = 'true';
            animateCounter(n, parseInt(n.dataset.target));
          }
        });
      }
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Smooth scroll polyfill for iOS Safari
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = document.querySelector('.nav').offsetHeight;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  // Mobile nav toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
      // Prevent body scroll when menu is open
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Form handler — Save lead to Supabase
  const form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.form-submit');
      const originalText = btn.textContent;
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      const leadData = {
        full_name: form.querySelector('#name').value.trim(),
        company_name: form.querySelector('#company').value.trim() || null,
        mobile: form.querySelector('#mobile').value.trim(),
        user_type: form.querySelector('#userType').value || null,
      };

      try {
        if (typeof getSupabaseClient === 'function') {
          const sb = getSupabaseClient();
          const { error } = await sb.from('leads').insert(leadData);
          if (error) throw error;
        }
        btn.textContent = '✓ Submitted!';
        btn.style.background = '#16a34a';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
          form.reset();
        }, 2500);
      } catch (err) {
        console.error('Lead submission error:', err);
        btn.textContent = '✗ Error — Try Again';
        btn.style.background = '#dc2626';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 2500);
      }
    });
  }
});
