// Tab switcher for Pengalaman Kerja / Proyek
function switchTab(tab) {
  const panelWork = document.getElementById('panel-work');
  const panelProject = document.getElementById('panel-project');
  const btnWork = document.getElementById('tab-work');
  const btnProject = document.getElementById('tab-project');

  if (tab === 'work') {
    panelWork.style.display = '';
    panelProject.style.display = 'none';
    btnWork.style.color = 'var(--text-primary)';
    btnWork.style.borderBottomColor = 'var(--brand-color, #2563eb)';
    btnProject.style.color = 'var(--text-secondary)';
    btnProject.style.borderBottomColor = 'transparent';
    btnWork.classList.add('active');
    btnProject.classList.remove('active');
  } else {
    panelWork.style.display = 'none';
    panelProject.style.display = '';
    btnProject.style.color = 'var(--text-primary)';
    btnProject.style.borderBottomColor = 'var(--brand-color, #2563eb)';
    btnWork.style.color = 'var(--text-secondary)';
    btnWork.style.borderBottomColor = 'transparent';
    btnProject.classList.add('active');
    btnWork.classList.remove('active');
  }
}

// Initialize tab on load
document.addEventListener('DOMContentLoaded', () => {
  switchTab('work');
});

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('is-open');
      const isOpen = navLinks.classList.contains('is-open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('is-open') && !navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navLinks.classList.remove('is-open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 2. Smooth Scrolling for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Hide mobile menu after clicking
        if (navLinks) {
          navLinks.classList.remove('is-open');
          if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  // 3. Scroll Progress Indicator & Navbar Shadow & Back to Top Button
  const progressBar = document.getElementById('scroll-progress');
  const navbar = document.querySelector('.navbar');
  const backToTopBtn = document.getElementById('back-to-top');

  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    // Scroll progress
    if (progressBar && docHeight > 0) {
      const scrollPercent = (scrollTop / docHeight) * 100;
      progressBar.style.width = scrollPercent + '%';
    }

    // Navbar style on scroll
    if (navbar) {
      if (scrollTop > 40) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 91, 150, 0.08)';
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        navbar.style.backdropFilter = 'blur(12px)';
      } else {
        navbar.style.boxShadow = 'none';
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.88)';
        navbar.style.backdropFilter = 'blur(10px)';
      }
    }

    // Back to top visibility
    if (backToTopBtn) {
      if (scrollTop > 350) {
        backToTopBtn.classList.add('active');
      } else {
        backToTopBtn.classList.remove('active');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 4. Back to Top Click
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 5. Scroll-Triggered Reveal Animations (IntersectionObserver)
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('is-visible'));
  }

  // 6. Active Nav Link Highlighting on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navAnchorLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navAnchorLinks.forEach(link => {
            if (link.getAttribute('href') === `#${currentId}`) {
              link.classList.add('active-nav');
            } else {
              link.classList.remove('active-nav');
            }
          });
        }
      });
    }, {
      threshold: 0.35
    });

    sections.forEach(sec => navObserver.observe(sec));
  }

  // 7. Subtle 3D Tilt Effect on Hero Profile Card
  const heroCard = document.querySelector('.hero-visual .glass-card');
  if (heroCard && window.innerWidth > 1024) {
    heroCard.addEventListener('mousemove', (e) => {
      const rect = heroCard.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotateX = -(y / rect.height) * 12;
      const rotateY = (x / rect.width) * 12;

      heroCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    heroCard.addEventListener('mouseleave', () => {
      heroCard.style.transform = '';
    });
  }
});

// Language Switcher
const langBtns = document.querySelectorAll('.lang-btn');
langBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang-select');
    document.documentElement.setAttribute('data-lang', lang);

    langBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    localStorage.setItem('portfolio-lang', lang);
  });
});

// Set initial language
const savedLang = localStorage.getItem('portfolio-lang') || 'id';
document.documentElement.setAttribute('data-lang', savedLang);
const activeBtn = document.querySelector('.lang-btn[data-lang-select="' + savedLang + '"]');
if (activeBtn) {
  langBtns.forEach(b => b.classList.remove('active'));
  activeBtn.classList.add('active');
}
