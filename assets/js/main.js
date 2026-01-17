/* ==========================================================================
   ChessBooker - Main JavaScript
   ========================================================================== */

(function() {
  'use strict';

  /* ==========================================================================
     Scroll Animations with Intersection Observer
     ========================================================================== */

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Initialize scroll animations for cards and items
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
      '.step-card, .bento-card, .feature-item, .faq-item, .pricing-card'
    );

    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      observer.observe(el);
    });
  }

  /* ==========================================================================
     Smooth Scroll for Anchor Links
     ========================================================================== */

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetSelector = this.getAttribute('href');
        const target = document.querySelector(targetSelector);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ==========================================================================
     Header Shadow on Scroll
     ========================================================================== */

  function initHeaderShadow() {
    const header = document.querySelector('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
      } else {
        header.style.boxShadow = 'none';
      }
    });
  }

  /* ==========================================================================
     Initialize All Features
     ========================================================================== */

  function init() {
    initScrollAnimations();
    initSmoothScroll();
    initHeaderShadow();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
