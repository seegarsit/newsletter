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
        var prevBtn = lightbox.querySelector('.lightbox-prev');
        var nextBtn = lightbox.querySelector('.lightbox-next');
        var newspaper = document.querySelector('.newspaper');

        var gallery = [];
        var galleryIndex = 0;

        function openLightbox(src, alt) {
            lightboxImg.src = src;
            lightboxImg.alt = alt || '';
            lightbox.classList.add('active');
            if (newspaper) newspaper.classList.add('lightbox-open');
            document.body.style.overflow = 'hidden';
        }

        function openGallery(images, startIndex) {
            gallery = images;
            galleryIndex = startIndex || 0;
            lightbox.classList.add('has-gallery');
            openLightbox(gallery[galleryIndex].src, gallery[galleryIndex].alt);
        }

        function galleryNav(dir) {
            if (gallery.length === 0) return;
            galleryIndex += dir;
            if (galleryIndex < 0) galleryIndex = gallery.length - 1;
            if (galleryIndex >= gallery.length) galleryIndex = 0;
            lightboxImg.src = gallery[galleryIndex].src;
            lightboxImg.alt = gallery[galleryIndex].alt || '';
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            lightbox.classList.remove('has-gallery');
            if (newspaper) newspaper.classList.remove('lightbox-open');
            document.body.style.overflow = '';
            lightboxImg.src = '';
            gallery = [];
            galleryIndex = 0;
        }

        /* Click on any .clickable-image to open */
        document.addEventListener('click', function (e) {
            var img = e.target.closest('.clickable-image');
            if (!img) return;

            /* Check if this image is inside the carousel */
            var carousel = img.closest('.install-carousel');
            if (carousel) {
                /* Build gallery from real slides only (not clones) */
                var slides = carousel.querySelectorAll('.carousel-slide:not(.carousel-clone) .clickable-image');
                var images = [];
                var startIdx = 0;
                slides.forEach(function (s, i) {
                    images.push({ src: s.src, alt: s.alt });
                    if (s.src === img.src) startIdx = i;
                });
                openGallery(images, startIdx);
            } else {
                lightbox.classList.remove('has-gallery');
                openLightbox(img.src, img.alt);
            }
        });

        /* Lightbox arrow clicks */
        if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); galleryNav(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); galleryNav(1); });

        /* Keyboard support: Enter/Space on focused image */
        document.addEventListener('keydown', function (e) {
            var img = e.target.closest('.clickable-image');
            if (img && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                img.click();
                return;
            }
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') { closeLightbox(); }
            if (e.key === 'ArrowLeft') { galleryNav(-1); }
            if (e.key === 'ArrowRight') { galleryNav(1); }
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

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ─── Sticky Masthead Bar ─── */
    function initStickyBar() {
        var bar = document.querySelector('.masthead-top-bar');
        var sentinel = document.querySelector('.masthead .masthead-rule-thin');
        if (!bar || !sentinel) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    bar.classList.remove('stuck');
                } else {
                    bar.classList.add('stuck');
                }
            });
        }, { threshold: 0 });

        observer.observe(sentinel);
    }

    /* ─── Weather Widget ─── */
    function initWeather() {
        var widget = document.getElementById('weather-widget');
        if (!widget) return;

        /* SVG weather icons */
        var svgSun = '<svg viewBox="0 0 48 48"><g class="wx-rays"><line x1="24" y1="3" x2="24" y2="9" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="39" x2="24" y2="45" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="24" x2="9" y2="24" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="39" y1="24" x2="45" y2="24" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="8.8" y1="8.8" x2="13.2" y2="13.2" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="34.8" y1="34.8" x2="39.2" y2="39.2" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="8.8" y1="39.2" x2="13.2" y2="34.8" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/><line x1="34.8" y1="13.2" x2="39.2" y2="8.8" stroke="#6b5e7a" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="24" cy="24" r="10" fill="#6b5e7a"/></svg>';
        var svgSunCloud = '<svg viewBox="0 0 48 48"><circle cx="18" cy="16" r="8" fill="#6b5e7a"/><g class="wx-rays" style="transform-origin:18px 16px"><line x1="18" y1="2" x2="18" y2="7" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="16" x2="9" y2="16" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/><line x1="8.1" y1="6.1" x2="11.6" y2="9.6" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/><line x1="8.1" y1="25.9" x2="11.6" y2="22.4" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/></g><g class="wx-cloud" fill="#555"><circle cx="22" cy="28" r="7"/><circle cx="31" cy="23" r="8"/><circle cx="39" cy="28" r="5"/><rect x="15" y="28" width="29" height="7" rx="3"/></g></svg>';
        var svgCloud = '<svg viewBox="0 0 48 48"><g class="wx-cloud" fill="#555"><circle cx="16" cy="24" r="7"/><circle cx="26" cy="19" r="9"/><circle cx="36" cy="24" r="6"/><rect x="10" y="24" width="32" height="7" rx="3"/></g></svg>';
        var svgFog = '<svg viewBox="0 0 48 48"><line class="wx-fog" x1="8" y1="16" x2="40" y2="16" stroke="#555" stroke-width="3" stroke-linecap="round" opacity="0.6"/><line class="wx-fog wx-fog-2" x1="12" y1="24" x2="36" y2="24" stroke="#555" stroke-width="3" stroke-linecap="round" opacity="0.5"/><line class="wx-fog wx-fog-3" x1="6" y1="32" x2="42" y2="32" stroke="#555" stroke-width="3" stroke-linecap="round" opacity="0.4"/></svg>';
        var svgLightRain = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="18" r="7"/><circle cx="26" cy="13" r="9"/><circle cx="36" cy="18" r="6"/><rect x="10" y="18" width="32" height="7" rx="3"/></g><line class="wx-drop" x1="18" y1="29" x2="16" y2="38" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/><line class="wx-drop wx-drop-2" x1="28" y1="29" x2="26" y2="38" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/></svg>';
        var svgRain = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="18" r="7"/><circle cx="26" cy="13" r="9"/><circle cx="36" cy="18" r="6"/><rect x="10" y="18" width="32" height="7" rx="3"/></g><line class="wx-drop" x1="17" y1="29" x2="15" y2="38" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/><line class="wx-drop wx-drop-2" x1="26" y1="29" x2="24" y2="38" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/><line class="wx-drop wx-drop-3" x1="35" y1="29" x2="33" y2="38" stroke="#6b5e7a" stroke-width="2" stroke-linecap="round"/></svg>';
        var svgSnow = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="18" r="7"/><circle cx="26" cy="13" r="9"/><circle cx="36" cy="18" r="6"/><rect x="10" y="18" width="32" height="7" rx="3"/></g><circle class="wx-flake" cx="17" cy="31" r="2" fill="#8a7d99"/><circle class="wx-flake wx-flake-2" cx="26" cy="33" r="2" fill="#8a7d99"/><circle class="wx-flake wx-flake-3" cx="35" cy="31" r="2" fill="#8a7d99"/></svg>';
        var svgThunder = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="16" r="7"/><circle cx="26" cy="11" r="9"/><circle cx="36" cy="16" r="6"/><rect x="10" y="16" width="32" height="7" rx="3"/></g><polygon class="wx-bolt" points="27,22 21,33 26,31 22,42 30,29 25,31 28,22" fill="#6b5e7a"/></svg>';

        var weatherCodes = {
            0: { desc: 'Clear Sky', icon: svgSun },
            1: { desc: 'Mostly Clear', icon: svgSunCloud },
            2: { desc: 'Partly Cloudy', icon: svgSunCloud },
            3: { desc: 'Overcast', icon: svgCloud },
            45: { desc: 'Foggy', icon: svgFog },
            48: { desc: 'Icy Fog', icon: svgFog },
            51: { desc: 'Light Drizzle', icon: svgLightRain },
            53: { desc: 'Drizzle', icon: svgLightRain },
            55: { desc: 'Heavy Drizzle', icon: svgRain },
            61: { desc: 'Light Rain', icon: svgLightRain },
            63: { desc: 'Rain', icon: svgRain },
            65: { desc: 'Heavy Rain', icon: svgRain },
            71: { desc: 'Light Snow', icon: svgSnow },
            73: { desc: 'Snow', icon: svgSnow },
            75: { desc: 'Heavy Snow', icon: svgSnow },
            77: { desc: 'Snow Grains', icon: svgSnow },
            80: { desc: 'Light Showers', icon: svgLightRain },
            81: { desc: 'Showers', icon: svgRain },
            82: { desc: 'Heavy Showers', icon: svgRain },
            85: { desc: 'Snow Showers', icon: svgSnow },
            86: { desc: 'Heavy Snow Showers', icon: svgSnow },
            95: { desc: 'Thunderstorm', icon: svgThunder },
            96: { desc: 'Thunderstorm w/ Hail', icon: svgThunder },
            99: { desc: 'Severe Thunderstorm', icon: svgThunder }
        };

        var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        function fetchWeather(lat, lon, city) {
            var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
                '&longitude=' + lon +
                '&current=temperature_2m,weather_code' +
                '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
                '&temperature_unit=fahrenheit&wind_speed_unit=mph';

            fetch(url)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var c = data.current;
                    var temp = Math.round(c.temperature_2m);
                    var code = c.weather_code;
                    var info = weatherCodes[code] || { desc: 'Unknown', icon: svgCloud };

                    var forecastHtml = '<div class="weather-forecast">';
                    for (var i = 0; i < 7; i++) {
                        var date = new Date(data.daily.time[i] + 'T12:00:00');
                        var dayLabel = i === 0 ? 'Today' : dayNames[date.getDay()];
                        var hi = Math.round(data.daily.temperature_2m_max[i]);
                        var lo = Math.round(data.daily.temperature_2m_min[i]);
                        var dayCode = data.daily.weather_code[i];
                        var dayInfo = weatherCodes[dayCode] || { icon: svgCloud };
                        forecastHtml +=
                            '<div class="forecast-day">' +
                                '<span class="forecast-label">' + dayLabel + '</span>' +
                                '<span class="forecast-icon">' + dayInfo.icon + '</span>' +
                                '<span class="forecast-temps">' + hi + '&deg; / ' + lo + '&deg;</span>' +
                            '</div>';
                    }
                    forecastHtml += '</div>';

                    widget.innerHTML =
                        '<div class="weather-top">' +
                            '<span class="weather-icon">' + info.icon + '</span>' +
                            '<span class="weather-temp">' + temp + '&deg;F</span>' +
                        '</div>' +
                        '<div class="weather-desc">' + info.desc + '</div>' +
                        '<div class="weather-location">' + city + '</div>' +
                        forecastHtml +
                        '<hr class="weather-rule">';
                })
                .catch(function () {
                    widget.style.display = 'none';
                });
        }

        function getLocationByIP() {
            fetch('https://ipapi.co/json/')
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    fetchWeather(data.latitude, data.longitude, data.city + ', ' + data.region_code);
                })
                .catch(function () {
                    widget.style.display = 'none';
                });
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    var lat = pos.coords.latitude;
                    var lon = pos.coords.longitude;
                    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m')
                        .then(function () {
                            /* Reverse geocode for city name */
                            fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
                                .then(function (r) { return r.json(); })
                                .then(function (geo) {
                                    var city = geo.address.city || geo.address.town || geo.address.village || geo.address.county || '';
                                    var state = geo.address.state || '';
                                    /* Abbreviate state */
                                    var stateAbbr = state.substring(0, 2).toUpperCase();
                                    if (geo.address['ISO3166-2-lvl4']) {
                                        stateAbbr = geo.address['ISO3166-2-lvl4'].split('-')[1];
                                    }
                                    fetchWeather(lat, lon, city + ', ' + stateAbbr);
                                })
                                .catch(function () {
                                    fetchWeather(lat, lon, 'Your Location');
                                });
                        });
                },
                function () {
                    getLocationByIP();
                },
                { timeout: 5000 }
            );
        } else {
            getLocationByIP();
        }
    }

    /* ─── Reader Poll ─── */
    function initPoll() {
        var form = document.getElementById('pollForm');
        var btn = document.getElementById('pollVoteBtn');
        var choicesContainer = document.getElementById('pollChoices');
        if (!form || !btn || !choicesContainer) return;

        function renderResults(counts, hasVoted) {
            var total = 0;
            var key;
            for (key in counts) {
                if (counts.hasOwnProperty(key)) total += counts[key];
            }

            var choices = choicesContainer.querySelectorAll('.poll-choice');
            choices.forEach(function (row) {
                var name = row.getAttribute('data-choice');
                var count = counts[name] || 0;
                var pct = total > 0 ? Math.round((count / total) * 100) : 0;
                var fill = row.querySelector('.poll-bar-fill');
                var countEl = row.querySelector('.poll-choice-count');
                if (fill) fill.style.width = pct + '%';
                if (countEl) countEl.textContent = count;
            });

            if (hasVoted) {
                lockPoll();
            }
        }

        function lockPoll() {
            var radios = form.querySelectorAll('input[type="radio"]');
            radios.forEach(function (r) { r.disabled = true; });
            var labels = choicesContainer.querySelectorAll('.poll-choice');
            labels.forEach(function (l) { l.classList.add('voted-disabled'); });
            btn.disabled = true;
            btn.textContent = 'Thanks for voting!';
        }

        /* Fetch current results on page load */
        fetch('/api/poll/results')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                renderResults(data.counts, data.has_voted);
            })
            .catch(function () { /* silently fail */ });

        /* Handle vote submission */
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var selected = form.querySelector('input[name="poll"]:checked');
            if (!selected) return;

            btn.disabled = true;
            btn.textContent = 'Voting...';

            fetch('/api/poll/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choice: selected.value })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.counts) {
                    renderResults(data.counts, true);
                } else if (data.error === 'Already voted') {
                    lockPoll();
                }
            })
            .catch(function () {
                btn.disabled = false;
                btn.textContent = 'Vote';
            });
        });
    }

    /* ─── Installation Showcase Carousel ─── */
    function initCarousel() {
        var track = document.getElementById('carouselTrack');
        var dotsContainer = document.getElementById('carouselDots');
        if (!track || !dotsContainer) return;

        /* Shuffle slides into random order */
        var slidesArr = Array.from(track.querySelectorAll('.carousel-slide'));
        for (var si = slidesArr.length - 1; si > 0; si--) {
            var sj = Math.floor(Math.random() * (si + 1));
            track.appendChild(slidesArr[sj]);
            slidesArr.splice(sj, 1, slidesArr[si]);
        }

        var origSlides = track.querySelectorAll('.carousel-slide');
        var total = origSlides.length;
        if (total === 0) return;

        /* Clone first and last slides for infinite loop effect */
        var firstClone = origSlides[0].cloneNode(true);
        var lastClone = origSlides[total - 1].cloneNode(true);
        firstClone.classList.add('carousel-clone');
        lastClone.classList.add('carousel-clone');
        track.appendChild(firstClone);
        track.insertBefore(lastClone, origSlides[0]);

        /* Now index 0 = last clone, 1..total = real slides, total+1 = first clone */
        var current = 1; /* start on first real slide */
        var transitioning = false;
        var autoTimer = null;

        /* Position to first real slide without animation */
        track.style.transition = 'none';
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        /* Force reflow */
        track.offsetHeight;
        track.style.transition = '';

        /* Build dots */
        for (var i = 0; i < total; i++) {
            var dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.setAttribute('data-index', i);
            dotsContainer.appendChild(dot);
        }

        var dots = dotsContainer.querySelectorAll('.carousel-dot');

        function updateDots() {
            var realIndex = current - 1; /* convert to 0-based real index */
            dots.forEach(function (d, j) {
                d.classList.toggle('active', j === realIndex);
            });
        }

        function goTo(index) {
            if (transitioning) return;
            transitioning = true;
            current = index;
            track.style.transition = 'transform 0.75s ease';
            track.style.transform = 'translateX(-' + (current * 100) + '%)';
            updateDots();
        }

        /* Snap to real slide after reaching a clone */
        track.addEventListener('transitionend', function () {
            transitioning = false;
            if (current === 0) {
                /* Jumped to last-clone, snap to real last */
                track.style.transition = 'none';
                current = total;
                track.style.transform = 'translateX(-' + (current * 100) + '%)';
                track.offsetHeight;
                updateDots();
            } else if (current === total + 1) {
                /* Jumped to first-clone, snap to real first */
                track.style.transition = 'none';
                current = 1;
                track.style.transform = 'translateX(-' + (current * 100) + '%)';
                track.offsetHeight;
                updateDots();
            }
        });

        /* Button controls */
        var section = track.closest('.install-carousel');
        var prevBtn = section.querySelector('.carousel-btn-prev');
        var nextBtn = section.querySelector('.carousel-btn-next');

        if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); resetAuto(); });
        if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); resetAuto(); });

        /* Dot controls */
        dotsContainer.addEventListener('click', function (e) {
            var dot = e.target.closest('.carousel-dot');
            if (!dot) return;
            var realIndex = parseInt(dot.getAttribute('data-index'), 10);
            goTo(realIndex + 1); /* +1 because of prepended clone */
            resetAuto();
        });

        /* Auto-advance every 5 seconds */
        function startAuto() {
            autoTimer = setInterval(function () { goTo(current + 1); }, 5000);
        }
        function resetAuto() {
            if (autoTimer) clearInterval(autoTimer);
            startAuto();
        }

        /* Touch/swipe support */
        var startX = 0;
        var dragging = false;

        track.addEventListener('touchstart', function (e) {
            startX = e.touches[0].clientX;
            dragging = true;
        }, { passive: true });

        track.addEventListener('touchend', function (e) {
            if (!dragging) return;
            dragging = false;
            var diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
                goTo(diff > 0 ? current + 1 : current - 1);
                resetAuto();
            }
        });

        startAuto();
    }

    /* ─── Initialize ─── */
    document.addEventListener('DOMContentLoaded', function () {
        initScrollFade();
        initSmoothScroll();
        initLightbox();
        initDropdown();
        initFireworks();
        initBackToTop();
        initStickyBar();
        initWeather();
        initPoll();
        initCarousel();
        initMaze();
    });

    /* ─── Maze Game — Premium Edition ─── */
    function initMaze() {
        var canvas = document.getElementById('mazeCanvas');
        var statusEl = document.getElementById('mazeStatus');
        var newBtn = document.getElementById('mazeNewBtn');
        if (!canvas || !statusEl) return;
        var ctx = canvas.getContext('2d');

        var cols, rows, cell, wallThick;
        var grid, playerX, playerY, won, wonTime;
        // Smooth animation state
        var drawX, drawY, targetX, targetY;
        var animFrame;
        var time = 0;
        // Particles
        var particles = [];
        var winParticles = [];
        // Trail glow
        var trailCells = [];
        // Fog of war — visibility radius in cells
        var fogRadius = 3.5;

        function sizeMaze() {
            var wrapper = canvas.parentElement;
            var availWidth = wrapper.parentElement.clientWidth - 40;
            if (availWidth > 800) { cols = 25; }
            else if (availWidth > 500) { cols = 20; }
            else { cols = 12; }
            cell = Math.floor(availWidth / cols);
            rows = Math.min(cols, Math.floor(cell > 0 ? 400 / cell : 15));
            if (rows < 8) rows = 8;
            wallThick = Math.max(3, Math.floor(cell * 0.14));
            canvas.width = cols * cell;
            canvas.height = rows * cell;
        }
        sizeMaze();

        var resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() { sizeMaze(); generate(); }, 250);
        });

        function Cell(x, y) {
            this.x = x; this.y = y;
            this.walls = { top: true, right: true, bottom: true, left: true };
            this.visited = false;
        }

        function generate() {
            grid = [];
            for (var y = 0; y < rows; y++) {
                grid[y] = [];
                for (var x = 0; x < cols; x++) grid[y][x] = new Cell(x, y);
            }
            var stack = [], cur = grid[0][0];
            cur.visited = true; stack.push(cur);
            while (stack.length > 0) {
                var nb = [], cx = cur.x, cy = cur.y;
                if (cy > 0 && !grid[cy-1][cx].visited) nb.push(grid[cy-1][cx]);
                if (cx < cols-1 && !grid[cy][cx+1].visited) nb.push(grid[cy][cx+1]);
                if (cy < rows-1 && !grid[cy+1][cx].visited) nb.push(grid[cy+1][cx]);
                if (cx > 0 && !grid[cy][cx-1].visited) nb.push(grid[cy][cx-1]);
                if (nb.length > 0) {
                    var next = nb[Math.floor(Math.random() * nb.length)];
                    var dx = next.x - cur.x, dy = next.y - cur.y;
                    if (dy === -1) { cur.walls.top = false; next.walls.bottom = false; }
                    if (dx === 1) { cur.walls.right = false; next.walls.left = false; }
                    if (dy === 1) { cur.walls.bottom = false; next.walls.top = false; }
                    if (dx === -1) { cur.walls.left = false; next.walls.right = false; }
                    next.visited = true; stack.push(cur); cur = next;
                } else { cur = stack.pop(); }
            }
            playerX = 0; playerY = 0; won = false; wonTime = 0;
            drawX = 0; drawY = 0; targetX = 0; targetY = 0;
            trailCells = [{x:0,y:0,t:time}];
            particles = []; winParticles = [];
            for (var y2 = 0; y2 < rows; y2++)
                for (var x2 = 0; x2 < cols; x2++) grid[y2][x2].visited = false;
            grid[0][0].visited = true;
            statusEl.textContent = 'From the Cross to the Empty Tomb';
            if (!animFrame) gameLoop();
        }

        // ── Stone texture pattern (cached) ──
        var stonePattern = null;
        function createStonePattern() {
            var pc = document.createElement('canvas');
            pc.width = 8; pc.height = 8;
            var px = pc.getContext('2d');
            px.fillStyle = '#5a5247';
            px.fillRect(0,0,8,8);
            for (var i = 0; i < 12; i++) {
                px.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.15) + ')';
                px.fillRect(Math.random()*8|0, Math.random()*8|0, 1, 1);
            }
            for (var j = 0; j < 6; j++) {
                px.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.08) + ')';
                px.fillRect(Math.random()*8|0, Math.random()*8|0, 1, 1);
            }
            stonePattern = ctx.createPattern(pc, 'repeat');
        }

        // ── Floor texture (cached) ──
        var floorPattern = null;
        function createFloorPattern() {
            var pc = document.createElement('canvas');
            pc.width = 12; pc.height = 12;
            var px = pc.getContext('2d');
            px.fillStyle = '#e8dcc8';
            px.fillRect(0,0,12,12);
            for (var i = 0; i < 8; i++) {
                px.fillStyle = 'rgba(139,115,85,' + (Math.random()*0.06) + ')';
                px.fillRect(Math.random()*12|0, Math.random()*12|0, 2, 1);
            }
            floorPattern = ctx.createPattern(pc, 'repeat');
        }

        // ── Ambient dust particles ──
        function spawnDust() {
            if (particles.length < 30) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: -Math.random() * 0.4 - 0.1,
                    life: 1,
                    decay: 0.003 + Math.random() * 0.004,
                    size: 1 + Math.random() * 2
                });
            }
        }

        function updateParticles() {
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.x += p.vx; p.y += p.vy; p.life -= p.decay;
                if (p.life <= 0) particles.splice(i, 1);
            }
        }

        // ── Win celebration particles ──
        function spawnWinBurst() {
            var cx = (cols-1) * cell + cell/2, cy = (rows-1) * cell + cell/2;
            for (var i = 0; i < 60; i++) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 1 + Math.random() * 4;
                winParticles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    decay: 0.008 + Math.random() * 0.008,
                    size: 2 + Math.random() * 4,
                    color: ['#ffd700','#fff5b0','#ffaa00','#ffffff'][Math.floor(Math.random()*4)]
                });
            }
        }

        // ── Fog of war alpha for a cell (disabled) ──
        function fogAlpha(cx, cy) {
            return 1;
        }

        // ── Draw 3D stone wall segment ──
        function drawWallSegment(x1, y1, x2, y2) {
            var wt = wallThick;
            // Shadow
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = wt + 2;
            ctx.lineCap = 'square';
            ctx.beginPath();
            ctx.moveTo(x1 + 1.5, y1 + 1.5);
            ctx.lineTo(x2 + 1.5, y2 + 1.5);
            ctx.stroke();
            // Main wall
            ctx.strokeStyle = stonePattern || '#5a5247';
            ctx.lineWidth = wt;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.stroke();
            // Highlight edge
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1 - 1); ctx.lineTo(x2, y2 - 1);
            ctx.stroke();
            ctx.restore();
        }

        // ── Draw the Cross at start ──
        function drawCross(t) {
            var scx = cell / 2, scy = cell / 2;
            var glow = 0.3 + Math.sin(t * 2) * 0.15;
            // Glow
            var grad = ctx.createRadialGradient(scx, scy, 0, scx, scy, cell * 0.6);
            grad.addColorStop(0, 'rgba(180,120,50,' + glow + ')');
            grad.addColorStop(1, 'rgba(180,120,50,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cell, cell);
            // Wooden cross with grain
            ctx.fillStyle = '#6b4a28';
            // Vertical
            var vw = cell * 0.13, vh = cell * 0.75;
            ctx.fillRect(scx - vw/2, scy - vh * 0.48, vw, vh);
            // Horizontal
            var hw = cell * 0.52, hh = cell * 0.11;
            ctx.fillRect(scx - hw/2, scy - vh * 0.18, hw, hh);
            // Wood grain lines
            ctx.strokeStyle = 'rgba(90,55,20,0.4)';
            ctx.lineWidth = 0.5;
            for (var gi = 0; gi < 3; gi++) {
                var gy = scy - vh * 0.4 + gi * vh * 0.25;
                ctx.beginPath(); ctx.moveTo(scx - vw/2 + 1, gy); ctx.lineTo(scx + vw/2 - 1, gy); ctx.stroke();
            }
            // Highlight
            ctx.fillStyle = 'rgba(255,220,150,0.15)';
            ctx.fillRect(scx - vw/2, scy - vh * 0.48, vw * 0.3, vh);
        }

        // ── Draw the Empty Tomb at exit ──
        function drawTomb(t) {
            var ecx = (cols-1) * cell + cell / 2, ecy = (rows-1) * cell + cell / 2;
            var s = cell * 0.02;
            // Pulsing golden glow from tomb
            var glowPulse = 0.25 + Math.sin(t * 1.5) * 0.1;
            var tombGrad = ctx.createRadialGradient(ecx - s*2, ecy - s*2, 0, ecx - s*2, ecy - s*2, cell * 0.8);
            tombGrad.addColorStop(0, 'rgba(255, 215, 80,' + glowPulse + ')');
            tombGrad.addColorStop(0.5, 'rgba(255, 200, 60,' + (glowPulse * 0.4) + ')');
            tombGrad.addColorStop(1, 'rgba(255, 200, 60, 0)');
            ctx.fillStyle = tombGrad;
            ctx.fillRect((cols-1)*cell, (rows-1)*cell, cell, cell);
            // Rock face
            ctx.fillStyle = '#8a7e6a';
            ctx.beginPath();
            ctx.ellipse(ecx, ecy + s * 10, s * 24, s * 20, 0, Math.PI, 0);
            ctx.fill();
            // Rock texture
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath(); ctx.arc(ecx - s*8, ecy - s*3, s*3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ecx + s*6, ecy + s*2, s*2, 0, Math.PI*2); ctx.fill();
            // Dark tomb opening
            var tombGrad2 = ctx.createRadialGradient(ecx - s*2, ecy, s*2, ecx - s*2, ecy + s*2, s*12);
            tombGrad2.addColorStop(0, '#1a1408');
            tombGrad2.addColorStop(1, '#2a2218');
            ctx.fillStyle = tombGrad2;
            ctx.beginPath();
            ctx.ellipse(ecx - s * 2, ecy + s * 3, s * 10, s * 13, 0, Math.PI, 0);
            ctx.fill();
            // Rolled-away stone with shading
            var stoneGrad = ctx.createRadialGradient(ecx + s*11, ecy, s*2, ecx + s*13, ecy + s*2, s*10);
            stoneGrad.addColorStop(0, '#a09888');
            stoneGrad.addColorStop(1, '#706858');
            ctx.fillStyle = stoneGrad;
            ctx.beginPath();
            ctx.ellipse(ecx + s * 13, ecy + s * 3, s * 8, s * 10, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
            // Animated light rays from tomb
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            var rayAngles = [-0.8, -1.1, -1.4, -0.5, -1.7];
            for (var ri = 0; ri < rayAngles.length; ri++) {
                var ra = rayAngles[ri] + Math.sin(t * 0.8 + ri) * 0.05;
                var rLen = cell * (0.5 + Math.sin(t * 1.2 + ri * 0.7) * 0.1);
                var rayGrad = ctx.createLinearGradient(ecx - s*2, ecy - s*2, ecx - s*2 + Math.cos(ra) * rLen, ecy - s*2 + Math.sin(ra) * rLen);
                rayGrad.addColorStop(0, 'rgba(255, 220, 100, 0.5)');
                rayGrad.addColorStop(1, 'rgba(255, 220, 100, 0)');
                ctx.strokeStyle = rayGrad;
                ctx.lineWidth = Math.max(1.5, s * 2);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(ecx - s*2, ecy - s*4);
                ctx.lineTo(ecx - s*2 + Math.cos(ra) * rLen, ecy - s*2 + Math.sin(ra) * rLen);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Draw Jesus figure ──
        function drawJesus(bx, by) {
            var s = cell * 0.018;
            // Soft glow around Jesus
            var jGrad = ctx.createRadialGradient(bx, by, 0, bx, by, cell * 0.45);
            jGrad.addColorStop(0, 'rgba(255,230,160,0.2)');
            jGrad.addColorStop(1, 'rgba(255,230,160,0)');
            ctx.fillStyle = jGrad;
            ctx.beginPath(); ctx.arc(bx, by, cell*0.45, 0, Math.PI*2); ctx.fill();
            // Robe
            ctx.fillStyle = '#8b2c2c';
            ctx.beginPath();
            ctx.moveTo(bx - s*10, by + s*18);
            ctx.quadraticCurveTo(bx - s*7, by + s*10, bx - s*6, by - s*2);
            ctx.lineTo(bx + s*6, by - s*2);
            ctx.quadraticCurveTo(bx + s*7, by + s*10, bx + s*10, by + s*18);
            ctx.closePath(); ctx.fill();
            // Robe shading
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.moveTo(bx + s*2, by); ctx.lineTo(bx + s*10, by + s*18);
            ctx.lineTo(bx + s*4, by + s*18); ctx.closePath(); ctx.fill();
            // Cloak
            ctx.fillStyle = '#d2c4a0';
            ctx.beginPath();
            ctx.moveTo(bx - s*5, by - s*2);
            ctx.quadraticCurveTo(bx - s*8, by + s*8, bx - s*10, by + s*18);
            ctx.lineTo(bx - s*2, by + s*18);
            ctx.quadraticCurveTo(bx, by + s*8, bx + s*2, by + s*6);
            ctx.closePath(); ctx.fill();
            // Cloak highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.moveTo(bx - s*5, by - s*2);
            ctx.quadraticCurveTo(bx - s*6, by + s*4, bx - s*7, by + s*10);
            ctx.lineTo(bx - s*5, by + s*10);
            ctx.quadraticCurveTo(bx - s*4, by + s*4, bx - s*3, by);
            ctx.closePath(); ctx.fill();
            // Belt
            ctx.fillStyle = '#6b4c30';
            ctx.fillRect(bx - s*8, by + s*3, s*16, s*2.5);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(bx - s*8, by + s*3, s*16, s*1);
            // Hair behind
            ctx.fillStyle = '#4a2d18';
            ctx.beginPath(); ctx.ellipse(bx - s*6, by - s*2, s*2, s*6, 0.1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(bx + s*6, by - s*2, s*2, s*6, -0.1, 0, Math.PI*2); ctx.fill();
            // Head
            ctx.fillStyle = '#c49565';
            ctx.beginPath(); ctx.arc(bx, by - s*8, s*9, 0, Math.PI*2); ctx.fill();
            // Head shading
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath(); ctx.arc(bx + s*2, by - s*7, s*8, 0, Math.PI*2); ctx.fill();
            // Hair
            ctx.fillStyle = '#4a2d18';
            ctx.beginPath(); ctx.arc(bx, by - s*9, s*9.5, Math.PI*0.85, Math.PI*2.15); ctx.fill();
            // Beard
            ctx.beginPath(); ctx.ellipse(bx, by - s*1, s*3.5, s*3, 0, 0, Math.PI); ctx.fill();
            // Eyes
            ctx.fillStyle = '#2a1a0a';
            ctx.beginPath(); ctx.arc(bx - s*3.5, by - s*9, s*1.3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(bx + s*3.5, by - s*9, s*1.3, 0, Math.PI*2); ctx.fill();
            // Eye highlights
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.arc(bx - s*3, by - s*9.5, s*0.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(bx + s*4, by - s*9.5, s*0.5, 0, Math.PI*2); ctx.fill();
            // Mouth
            ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = Math.max(1, s*0.8);
            ctx.beginPath(); ctx.arc(bx, by - s*4.5, s*2, 0.1*Math.PI, 0.9*Math.PI); ctx.stroke();
            // Arms
            ctx.strokeStyle = '#c49565'; ctx.lineWidth = Math.max(1.5, s*2.2); ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(bx - s*6, by + s*2); ctx.lineTo(bx - s*12, by + s*8);
            ctx.moveTo(bx + s*6, by + s*2); ctx.lineTo(bx + s*12, by + s*8);
            ctx.stroke();
            // Hands
            ctx.fillStyle = '#c49565';
            ctx.beginPath(); ctx.arc(bx - s*12, by + s*8, s*2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(bx + s*12, by + s*8, s*2, 0, Math.PI*2); ctx.fill();
            // Sandals
            ctx.fillStyle = '#6b4c30';
            ctx.beginPath(); ctx.ellipse(bx - s*5, by + s*18, s*4, s*1.8, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(bx + s*5, by + s*18, s*4, s*1.8, 0, 0, Math.PI*2); ctx.fill();
        }

        // ── Main draw ──
        function draw() {
            if (!stonePattern) createStonePattern();
            if (!floorPattern) createFloorPattern();

            // Floor
            ctx.fillStyle = floorPattern || '#e8dcc8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Glowing trail
            for (var ti = 0; ti < trailCells.length; ti++) {
                var tc = trailCells[ti];
                var age = Math.min(1, (time - tc.t) * 0.02);
                var alpha = 0.12 + age * 0.08;
                var fa = fogAlpha(tc.x, tc.y);
                if (fa < 0.1) continue;
                var tGrad = ctx.createRadialGradient(
                    tc.x * cell + cell/2, tc.y * cell + cell/2, 0,
                    tc.x * cell + cell/2, tc.y * cell + cell/2, cell * 0.7
                );
                tGrad.addColorStop(0, 'rgba(123, 63, 192,' + (alpha * fa) + ')');
                tGrad.addColorStop(1, 'rgba(123, 63, 192, 0)');
                ctx.fillStyle = tGrad;
                ctx.fillRect(tc.x * cell, tc.y * cell, cell, cell);
            }

            // Walls with 3D stone effect
            ctx.lineCap = 'square';
            for (var y2 = 0; y2 < rows; y2++) {
                for (var x2 = 0; x2 < cols; x2++) {
                    var fa2 = fogAlpha(x2, y2);
                    if (fa2 < 0.1) continue;
                    ctx.globalAlpha = fa2;
                    var px = x2 * cell, py = y2 * cell;
                    var w = grid[y2][x2].walls;
                    if (w.top) drawWallSegment(px, py, px + cell, py);
                    if (w.right) drawWallSegment(px + cell, py, px + cell, py + cell);
                    if (w.bottom) drawWallSegment(px, py + cell, px + cell, py + cell);
                    if (w.left) drawWallSegment(px, py, px, py + cell);
                    ctx.globalAlpha = 1;
                }
            }


            // Cross at start
            ctx.save();
            var crossAlpha = fogAlpha(0, 0);
            ctx.globalAlpha = crossAlpha;
            if (!(playerX === 0 && playerY === 0)) drawCross(time * 0.02);
            ctx.restore();

            // Tomb at exit
            ctx.save();
            var tombAlpha = fogAlpha(cols-1, rows-1);
            ctx.globalAlpha = tombAlpha;
            drawTomb(time * 0.02);
            ctx.restore();

            // Dust particles
            ctx.save();
            for (var pi = 0; pi < particles.length; pi++) {
                var pp = particles[pi];
                var pfa = fogAlpha(pp.x / cell, pp.y / cell);
                ctx.globalAlpha = pp.life * 0.3 * pfa;
                ctx.fillStyle = '#d4c4a0';
                ctx.beginPath(); ctx.arc(pp.x, pp.y, pp.size, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();

            // Jesus (smooth position)
            var jx = drawX * cell + cell / 2, jy = drawY * cell + cell / 2;
            drawJesus(jx, jy);

            // Win celebration overlay + particles
            if (won) {
                var winAge = (time - wonTime) * 0.015;
                var overlayAlpha = Math.min(0.15, winAge * 0.05);
                ctx.fillStyle = 'rgba(255, 215, 80,' + overlayAlpha + ')';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Win particles
                ctx.save();
                for (var wi = winParticles.length - 1; wi >= 0; wi--) {
                    var wp = winParticles[wi];
                    wp.x += wp.vx; wp.y += wp.vy; wp.vy += 0.03; wp.life -= wp.decay;
                    if (wp.life <= 0) { winParticles.splice(wi, 1); continue; }
                    ctx.globalAlpha = wp.life;
                    ctx.fillStyle = wp.color;
                    ctx.beginPath(); ctx.arc(wp.x, wp.y, wp.size * wp.life, 0, Math.PI*2); ctx.fill();
                }
                ctx.restore();
            }
        }

        // ── Game loop (60fps) ──
        function gameLoop() {
            time++;
            // Smooth lerp player position
            drawX += (targetX - drawX) * 0.25;
            drawY += (targetY - drawY) * 0.25;
            // Snap when close
            if (Math.abs(drawX - targetX) < 0.01) drawX = targetX;
            if (Math.abs(drawY - targetY) < 0.01) drawY = targetY;

            spawnDust();
            updateParticles();
            draw();
            animFrame = requestAnimationFrame(gameLoop);
        }

        function tryMove(dx, dy) {
            if (won) return;
            var c = grid[playerY][playerX];
            var moved = false;
            if (dx === 0 && dy === -1 && !c.walls.top) { playerY--; moved = true; }
            else if (dx === 1 && dy === 0 && !c.walls.right) { playerX++; moved = true; }
            else if (dx === 0 && dy === 1 && !c.walls.bottom) { playerY++; moved = true; }
            else if (dx === -1 && dy === 0 && !c.walls.left) { playerX--; moved = true; }
            if (!moved) return;
            targetX = playerX; targetY = playerY;
            grid[playerY][playerX].visited = true;
            trailCells.push({x: playerX, y: playerY, t: time});
            if (playerX === cols - 1 && playerY === rows - 1) {
                won = true; wonTime = time;
                statusEl.textContent = 'He is Risen!';
                spawnWinBurst();
            }
        }

        // Keyboard
        document.addEventListener('keydown', function(e) {
            if (!document.getElementById('mazeCanvas')) return;
            var rect = canvas.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': tryMove(0, -1); e.preventDefault(); break;
                case 'ArrowRight': case 'd': case 'D': tryMove(1, 0); e.preventDefault(); break;
                case 'ArrowDown': case 's': case 'S': tryMove(0, 1); e.preventDefault(); break;
                case 'ArrowLeft': case 'a': case 'A': tryMove(-1, 0); e.preventDefault(); break;
            }
        });

        // Drag controls
        var dragging = false;
        function pointerToCell(e) {
            var rect = canvas.getBoundingClientRect();
            var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
            var cX = e.touches ? e.touches[0].clientX : e.clientX;
            var cY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: Math.max(0, Math.min(cols-1, Math.floor((cX - rect.left) * scaleX / cell))),
                y: Math.max(0, Math.min(rows-1, Math.floor((cY - rect.top) * scaleY / cell)))
            };
        }
        function moveToward(tx, ty) {
            if (won) return;
            var dx = tx - playerX, dy = ty - playerY;
            if (dx === 0 && dy === 0) return;
            var moves = [];
            if (Math.abs(dx) >= Math.abs(dy)) {
                if (dx > 0) moves.push([1,0,'right']); if (dx < 0) moves.push([-1,0,'left']);
                if (dy > 0) moves.push([0,1,'bottom']); if (dy < 0) moves.push([0,-1,'top']);
            } else {
                if (dy > 0) moves.push([0,1,'bottom']); if (dy < 0) moves.push([0,-1,'top']);
                if (dx > 0) moves.push([1,0,'right']); if (dx < 0) moves.push([-1,0,'left']);
            }
            for (var i = 0; i < moves.length; i++) {
                if (!grid[playerY][playerX].walls[moves[i][2]]) {
                    tryMove(moves[i][0], moves[i][1]);
                    return;
                }
            }
        }
        function onPointerDown(e) { if (won) return; e.preventDefault(); dragging = true; moveToward(pointerToCell(e).x, pointerToCell(e).y); }
        function onPointerMove(e) { if (!dragging || won) return; e.preventDefault(); moveToward(pointerToCell(e).x, pointerToCell(e).y); }
        function onPointerUp() { dragging = false; }

        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        canvas.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);

        if (newBtn) newBtn.addEventListener('click', generate);
        generate();
    }

})();
