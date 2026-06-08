/* ═══════════════════════════════════════════════════════════════
   PREMIUM SUITE — Interactions & Animations
   Activates on body.pmx only. Pure additive — no conflicts with script.js.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';
  if (!document.body.classList.contains('pmx')) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* === 1. Scroll Progress Bar === */
  const scrollBar = document.createElement('div');
  scrollBar.className = 'pmx-scroll-bar';
  document.body.appendChild(scrollBar);

  function updateScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollBar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  /* === 2. Reveal-on-Scroll (IntersectionObserver) === */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('pmx-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.pmx-reveal').forEach(el => revealObserver.observe(el));
  } else {
    document.querySelectorAll('.pmx-reveal').forEach(el => el.classList.add('pmx-visible'));
  }

  /* === 3. Count-up Numbers === */
  if ('IntersectionObserver' in window && !reduced) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.dataset.pmxCount || '0');
          const decimals = parseInt(el.dataset.pmxDecimals || '0', 10);
          const duration = 1800;
          const startTime = performance.now();
          function tick(now) {
            const t = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = target * eased;
            el.textContent = v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = target.toLocaleString('he-IL', { maximumFractionDigits: decimals });
          }
          requestAnimationFrame(tick);
          countObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-pmx-count]').forEach(el => countObserver.observe(el));
  } else {
    document.querySelectorAll('[data-pmx-count]').forEach(el => {
      const target = parseFloat(el.dataset.pmxCount || '0');
      el.textContent = target.toLocaleString('he-IL');
    });
  }

  /* === 4. Magnetic Effect on CTAs === */
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.pmx-magnetic').forEach(el => {
      el.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        this.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      });
      el.addEventListener('mouseleave', function() {
        this.style.transform = '';
      });
    });
  }

  /* === 5. 3D Tilt on Cards === */
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.pmx-tilt').forEach(el => {
      el.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotateX = (y - 0.5) * -10;
        const rotateY = (x - 0.5) * 10;
        this.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      el.addEventListener('mouseleave', function() {
        this.style.transform = '';
      });
    });
  }

  /* === 6. Floating Particles (decorative in hero) === */
  const particleContainers = document.querySelectorAll('.pmx-particles');
  if (!reduced && particleContainers.length > 0) {
    particleContainers.forEach(container => {
      const count = 12;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'pmx-particle';
        const size = 2 + Math.random() * 4;
        p.style.cssText = `
          left: ${Math.random() * 100}%;
          bottom: -10px;
          width: ${size}px; height: ${size}px;
          animation-duration: ${12 + Math.random() * 18}s;
          animation-delay: ${Math.random() * -20}s;
          opacity: ${0.3 + Math.random() * 0.4};
        `;
        container.appendChild(p);
      }
    });
  }

  /* === 7. Navbar scrolled state === */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let ticking = false;
    function updateNav() {
      if (window.pageYOffset > 30) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNav);
        ticking = true;
      }
    }, { passive: true });
  }

  /* === 8. Smooth-scroll for anchor links === */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(a => {
    a.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  });

})();
