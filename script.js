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

  // Mobile nav toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // Form handler
  const form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.form-submit');
      btn.textContent = '✓ Submitted!';
      btn.style.background = '#16a34a';
      setTimeout(() => {
        btn.textContent = 'Submit Enquiry';
        btn.style.background = '';
        form.reset();
      }, 2500);
    });
  }
});
