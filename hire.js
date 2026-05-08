document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('hireForm');
  const steps = Array.from(document.querySelectorAll('.form-step'));
  const indicators = Array.from(document.querySelectorAll('.stepper .step'));
  const nextBtns = document.querySelectorAll('.next-btn');
  const prevBtns = document.querySelectorAll('.prev-btn');
  
  let currentStep = 0;

  // Mobile nav toggle (reused from index)
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Next Button Click
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Basic validation for current step
      const inputs = steps[currentStep].querySelectorAll('input[required], select[required], textarea[required]');
      let isValid = true;
      
      inputs.forEach(input => {
        if (!input.checkValidity()) {
          isValid = false;
          input.classList.add('error');
          input.reportValidity();
        } else {
          input.classList.remove('error');
        }
      });

      if (isValid && currentStep < steps.length - 1) {
        currentStep++;
        updateFormSteps();
      }
    });
  });

  // Prev Button Click
  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        updateFormSteps();
      }
    });
  });

  // Form Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Simulate API call
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    setTimeout(() => {
      // Hide form fields and show success
      document.querySelector('#step4 .form-grid').style.display = 'none';
      document.getElementById('finalActions').style.display = 'none';
      document.getElementById('successMessage').style.display = 'block';
      
      // Update header
      document.querySelector('.page-header h1').textContent = 'Success!';
      document.querySelector('.page-header p').textContent = 'Worker successfully onboarded to the system.';
    }, 1500);
  });

  function updateFormSteps() {
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === currentStep);
    });
    
    indicators.forEach((indicator, index) => {
      if (index < currentStep) {
        indicator.classList.add('active', 'completed');
      } else if (index === currentStep) {
        indicator.classList.add('active');
        indicator.classList.remove('completed');
      } else {
        indicator.classList.remove('active', 'completed');
      }
    });
    
    // Scroll to top of form
    document.querySelector('.wizard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Clear error class on input
  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('error')) {
      e.target.classList.remove('error');
    }
  });
});
