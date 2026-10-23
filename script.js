// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) {
    mobileMenu.classList.remove('open');
  }
});

// Scroll to contact and pre-fill product interest
function scrollToContact(productName) {
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  const select = document.getElementById('interest');
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === productName) {
      select.selectedIndex = i;
      break;
    }
  }
}

// Contact form submission
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const success = document.getElementById('formSuccess');

  btn.textContent = 'Sending...';
  btn.disabled = true;

  setTimeout(() => {
    e.target.reset();
    btn.textContent = 'Send Enquiry';
    btn.disabled = false;
    success.classList.add('show');
    setTimeout(() => success.classList.remove('show'), 5000);
  }, 1200);
}

// Fade-in on scroll (Intersection Observer)
const observerOptions = { threshold: 0.12 };

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(
  '.product-card, .feature-card, .testimonial-card, .stat, .about-grid, .contact-grid, .value-item'
).forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});
