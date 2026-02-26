/* ================================================================
   THE FENCE LINE — JavaScript
   Seegars Fence Company, March 2026
   ================================================================ */

(function () {
    'use strict';

    /* ─── Scroll-triggered fade-in ─── */
    function initScrollFade() {
        var targets = document.querySelectorAll('.section-fade');
        if (!targets.length) return;

        /* Respect reduced-motion preference */
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            targets.forEach(function (el) { el.classList.add('visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        targets.forEach(function (el) { observer.observe(el); });
    }

    /* ─── Smooth scroll for anchor links ─── */
    function initSmoothScroll() {
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[href^="#"]');
            if (!link) return;

            var id = link.getAttribute('href');
            if (id === '#') return;

            var target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    /* ─── Image Lightbox (click to enlarge) ─── */
    function initLightbox() {
        var lightbox = document.getElementById('imageLightbox');
        if (!lightbox) return;

        var lightboxImg = lightbox.querySelector('.lightbox-img');
        var closeBtn = lightbox.querySelector('.lightbox-close');
        var newspaper = document.querySelector('.newspaper');

        function openLightbox(src, alt) {
            lightboxImg.src = src;
            lightboxImg.alt = alt || '';
            lightbox.classList.add('active');
            if (newspaper) newspaper.classList.add('lightbox-open');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            if (newspaper) newspaper.classList.remove('lightbox-open');
            document.body.style.overflow = '';
            lightboxImg.src = '';
        }

        /* Click on any .clickable-image to open */
        document.addEventListener('click', function (e) {
            var img = e.target.closest('.clickable-image');
            if (img) {
                openLightbox(img.src, img.alt);
                return;
            }
        });

        /* Keyboard support: Enter/Space on focused image */
        document.addEventListener('keydown', function (e) {
            var img = e.target.closest('.clickable-image');
            if (img && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                openLightbox(img.src, img.alt);
                return;
            }
            /* Escape to close */
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });

        /* Close on backdrop click or close button */
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox || e.target === closeBtn) {
                closeLightbox();
            }
        });
    }

    /* ─── Sections dropdown ─── */
    function initDropdown() {
        var dropdown = document.querySelector('.nav-dropdown');
        if (!dropdown) return;

        var btn = dropdown.querySelector('.nav-dropdown-btn');

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = dropdown.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen);
        });

        /* Close when clicking a link inside */
        dropdown.querySelector('.nav-dropdown-menu').addEventListener('click', function () {
            dropdown.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });

        /* Close when clicking outside */
        document.addEventListener('click', function () {
            dropdown.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    /* ─── Fireworks animation (celebrations section) ─── */
    function initFireworks() {
        var canvas = document.getElementById('fireworksCanvas');
        if (!canvas) return;

        /* Respect reduced-motion preference */
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var ctx = canvas.getContext('2d');
        var particles = [];
        var animating = false;
        var animFrame = null;

        var colors = [
            '#e74c3c', '#f39c12', '#2ecc71', '#3498db',
            '#9b59b6', '#e67e22', '#1abc9c', '#ff6b6b',
            '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d'
        ];

        function resize() {
            var section = canvas.parentElement;
            canvas.width = section.offsetWidth;
            canvas.height = section.offsetHeight;
        }

        function Particle(x, y, color) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 3 + 1;
            this.x = x;
            this.y = y;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.alpha = 1;
            this.color = color;
            this.radius = Math.random() * 2.5 + 0.5;
            this.decay = Math.random() * 0.015 + 0.008;
            this.gravity = 0.03;
        }

        Particle.prototype.update = function () {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;
            this.vx *= 0.99;
            this.alpha -= this.decay;
        };

        Particle.prototype.draw = function () {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        function burst(x, y) {
            var color = colors[Math.floor(Math.random() * colors.length)];
            var count = 30 + Math.floor(Math.random() * 20);
            for (var i = 0; i < count; i++) {
                particles.push(new Particle(x, y, color));
            }
        }

        function launchFirework() {
            var x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
            var y = Math.random() * canvas.height * 0.5 + canvas.height * 0.1;
            burst(x, y);
        }

        function animate() {
            if (!animating) return;
            animFrame = requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (var i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw();
                if (particles[i].alpha <= 0) {
                    particles.splice(i, 1);
                }
            }
        }

        var launchInterval = null;

        function start() {
            if (animating) return;
            resize();
            animating = true;
            animate();
            launchFirework();
            launchFirework();
            launchInterval = setInterval(function () {
                if (animating) {
                    launchFirework();
                    if (Math.random() > 0.5) launchFirework();
                }
            }, 1200);
        }

        function stop() {
            animating = false;
            if (animFrame) cancelAnimationFrame(animFrame);
            if (launchInterval) clearInterval(launchInterval);
            launchInterval = null;
            particles = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        /* Only animate when section is visible */
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    start();
                } else {
                    stop();
                }
            });
        }, { threshold: 0.1 });

        observer.observe(canvas.parentElement);

        window.addEventListener('resize', function () {
            if (animating) resize();
        });
    }

    /* ─── Back-to-top button (mobile) ─── */
    function initBackToTop() {
        var btn = document.getElementById('backToTop');
        if (!btn) return;

        window.addEventListener('scroll', function () {
            if (window.scrollY > 600) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });
    }

    /* ─── Initialize ─── */
    document.addEventListener('DOMContentLoaded', function () {
        initScrollFade();
        initSmoothScroll();
        initLightbox();
        initDropdown();
        initFireworks();
        initBackToTop();
    });
})();
