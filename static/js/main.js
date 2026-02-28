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
        var svgSun = '<svg viewBox="0 0 48 48"><g class="wx-rays"><line x1="24" y1="3" x2="24" y2="9" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="39" x2="24" y2="45" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="24" x2="9" y2="24" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="39" y1="24" x2="45" y2="24" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="8.8" y1="8.8" x2="13.2" y2="13.2" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="34.8" y1="34.8" x2="39.2" y2="39.2" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="8.8" y1="39.2" x2="13.2" y2="34.8" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/><line x1="34.8" y1="13.2" x2="39.2" y2="8.8" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="24" cy="24" r="10" fill="#8b7355"/></svg>';
        var svgSunCloud = '<svg viewBox="0 0 48 48"><circle cx="18" cy="16" r="8" fill="#8b7355"/><g class="wx-rays" style="transform-origin:18px 16px"><line x1="18" y1="2" x2="18" y2="7" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="16" x2="9" y2="16" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/><line x1="8.1" y1="6.1" x2="11.6" y2="9.6" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/><line x1="8.1" y1="25.9" x2="11.6" y2="22.4" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/></g><g class="wx-cloud" fill="#555"><circle cx="22" cy="28" r="7"/><circle cx="31" cy="23" r="8"/><circle cx="39" cy="28" r="5"/><rect x="15" y="28" width="29" height="7" rx="3"/></g></svg>';
        var svgCloud = '<svg viewBox="0 0 48 48"><g class="wx-cloud" fill="#555"><circle cx="16" cy="24" r="7"/><circle cx="26" cy="19" r="9"/><circle cx="36" cy="24" r="6"/><rect x="10" y="24" width="32" height="7" rx="3"/></g></svg>';
        var svgFog = '<svg viewBox="0 0 48 48"><line class="wx-fog" x1="8" y1="16" x2="40" y2="16" stroke="#555" stroke-width="3" stroke-linecap="round" opacity="0.6"/><line class="wx-fog wx-fog-2" x1="12" y1="24" x2="36" y2="24" stroke="#555" stroke-width="3" stroke-linecap="round" opacity="0.5"/><line class="wx-fog wx-fog-3" x1="6" y1="32" x2="42" y2="32" stroke="#555" stroke-width="3" stroke-linecap="round" opacity="0.4"/></svg>';
        var svgLightRain = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="18" r="7"/><circle cx="26" cy="13" r="9"/><circle cx="36" cy="18" r="6"/><rect x="10" y="18" width="32" height="7" rx="3"/></g><line class="wx-drop" x1="18" y1="29" x2="16" y2="38" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/><line class="wx-drop wx-drop-2" x1="28" y1="29" x2="26" y2="38" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/></svg>';
        var svgRain = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="18" r="7"/><circle cx="26" cy="13" r="9"/><circle cx="36" cy="18" r="6"/><rect x="10" y="18" width="32" height="7" rx="3"/></g><line class="wx-drop" x1="17" y1="29" x2="15" y2="38" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/><line class="wx-drop wx-drop-2" x1="26" y1="29" x2="24" y2="38" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/><line class="wx-drop wx-drop-3" x1="35" y1="29" x2="33" y2="38" stroke="#8b7355" stroke-width="2" stroke-linecap="round"/></svg>';
        var svgSnow = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="18" r="7"/><circle cx="26" cy="13" r="9"/><circle cx="36" cy="18" r="6"/><rect x="10" y="18" width="32" height="7" rx="3"/></g><circle class="wx-flake" cx="17" cy="31" r="2" fill="#a89478"/><circle class="wx-flake wx-flake-2" cx="26" cy="33" r="2" fill="#a89478"/><circle class="wx-flake wx-flake-3" cx="35" cy="31" r="2" fill="#a89478"/></svg>';
        var svgThunder = '<svg viewBox="0 0 48 48"><g fill="#555"><circle cx="16" cy="16" r="7"/><circle cx="26" cy="11" r="9"/><circle cx="36" cy="16" r="6"/><rect x="10" y="16" width="32" height="7" rx="3"/></g><polygon class="wx-bolt" points="27,22 21,33 26,31 22,42 30,29 25,31 28,22" fill="#8b7355"/></svg>';

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
    });
})();
