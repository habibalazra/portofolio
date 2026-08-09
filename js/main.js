document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      // Toggle a simple visibility class or inline style
      if (navLinks.style.display === 'flex') {
        navLinks.style.display = 'none';
      } else {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        navLinks.style.padding = '1rem 0';
        navLinks.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      }
    });
  }

  // Smooth Scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if(targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Hide mobile menu after clicking
        if (window.innerWidth <= 768 && navLinks) {
          navLinks.style.display = 'none';
        }
      }
    });
  });

  // Navbar background change on scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
      navbar.style.boxShadow = 'none';
      navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    }
  });
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
  if(activeBtn) {
    langBtns.forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }


