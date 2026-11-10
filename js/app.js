/* CLICK — Landing Page V3 */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var navLinks = document.getElementById('nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('is-open', !open);
      document.body.classList.toggle('menu-open', !open);
    });

    navLinks.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
        document.body.classList.remove('menu-open');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
        document.body.classList.remove('menu-open');
        toggle.focus();
      }
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });

    /* Safety net: never leave content hidden if the observer fails */
    setTimeout(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
      });
    }, 1200);
  }

  /* ---------- Tokenomics bar animation ---------- */
  var allocBar = document.querySelector('.alloc-bar');
  if (allocBar) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      allocBar.classList.add('alloc-animated');
    } else {
      var allocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            allocBar.classList.add('alloc-animated');
            allocObserver.disconnect();
          }
        });
      }, { threshold: 0.4 });
      allocObserver.observe(allocBar);
    }
  }

  /* ---------- Active nav link ---------- */
  var sections = document.querySelectorAll('main section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- Tactile demo button ---------- */
  var pushButton = document.getElementById('push-button');
  var counter = document.getElementById('click-count');
  var assembly = document.querySelector('.button-assembly');
  var count = 0;

  if (pushButton && counter && assembly) {
    pushButton.addEventListener('click', function () {
      count += 1;
      counter.textContent = String(count);
      counter.classList.remove('bump');
      void counter.offsetWidth; /* restart animation */
      counter.classList.add('bump');

      if (!prefersReducedMotion) {
        var ring = document.createElement('span');
        ring.className = 'click-ring';
        ring.setAttribute('aria-hidden', 'true');
        assembly.appendChild(ring);
        ring.addEventListener('animationend', function () { ring.remove(); });
      }
    });
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
