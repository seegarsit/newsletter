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

            /* If the image lives inside a [data-gallery] scope, build a navigable gallery */
            var galleryGroup = img.closest('[data-gallery]');
            if (galleryGroup) {
                var groupImgs = galleryGroup.querySelectorAll('.clickable-image');
                var images = [];
                var startIdx = 0;
                groupImgs.forEach(function (s, i) {
                    images.push({ src: s.src, alt: s.alt });
                    if (s === img) startIdx = i;
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


    /* ─── Word Search puzzle ─── */
    function initWordSearch() {
        var grid = document.querySelector('.word-search-grid');
        var btn = document.querySelector('.word-search-toggle');
        if (!grid || !btn) return;

        var block = grid.closest('.word-search-block');
        var cols = parseInt(grid.getAttribute('data-cols'), 10) || 14;
        var solution = {};
        try { solution = JSON.parse(grid.getAttribute('data-solution') || '{}'); } catch (e) {}
        var cells = Array.prototype.slice.call(grid.querySelectorAll('.word-search-cell'));
        var wordEls = Array.prototype.slice.call(document.querySelectorAll('.word-search-word'));
        var totalWords = Object.keys(solution).length;
        var foundWords = {};
        var foundCount = 0;
        var celebrated = false;

        function cellAt(r, c) { return cells[r * cols + c]; }
        function rcOf(cell) {
            var i = cells.indexOf(cell);
            return [Math.floor(i / cols), i % cols];
        }
        function cellFromPoint(x, y) {
            var el = document.elementFromPoint(x, y);
            var cell = el && el.closest && el.closest('.word-search-cell');
            return (cell && grid.contains(cell)) ? cell : null;
        }
        function serialize(coords) {
            return coords.map(function (rc) { return rc[0] + ',' + rc[1]; }).join('|');
        }

        /* Build lookup: serialized cell sequence -> word (forward and reverse) */
        var sequenceToWord = {};
        Object.keys(solution).forEach(function (word) {
            var coords = solution[word];
            sequenceToWord[serialize(coords)] = word;
            sequenceToWord[serialize(coords.slice().reverse())] = word;
        });

        function clearSelecting() {
            cells.forEach(function (c) { c.classList.remove('selecting'); });
        }

        function lineCells(r0, c0, r1, c1) {
            var dr = r1 - r0, dc = c1 - c0;
            var adr = Math.abs(dr), adc = Math.abs(dc);
            if (!(dr === 0 || dc === 0 || adr === adc)) return null;
            var n = Math.max(adr, adc) + 1;
            var sr = dr === 0 ? 0 : dr / adr;
            var sc = dc === 0 ? 0 : dc / adc;
            var arr = [];
            for (var i = 0; i < n; i++) arr.push([r0 + sr * i, c0 + sc * i]);
            return arr;
        }

        function paintSelection(coords) {
            clearSelecting();
            if (!coords) return;
            coords.forEach(function (rc) {
                var el = cellAt(rc[0], rc[1]);
                if (el) el.classList.add('selecting');
            });
        }

        function vibrate(pattern) {
            if (navigator.vibrate) {
                try { navigator.vibrate(pattern); } catch (_) {}
            }
        }

        function markWordFound(word) {
            if (foundWords[word]) return;
            foundWords[word] = true;
            foundCount++;
            solution[word].forEach(function (rc) {
                var el = cellAt(rc[0], rc[1]);
                if (el) el.classList.add('user-found');
            });
            wordEls.forEach(function (el) {
                if (el.getAttribute('data-word') === word) el.classList.add('found');
            });
            vibrate(40);
            if (foundCount === totalWords && !celebrated) {
                celebrated = true;
                celebrate();
            }
        }

        var dragging = false;
        var activePointerId = null;
        var startRC = null;
        var lastSelection = [];

        function onPointerDown(e) {
            /* Ignore secondary pointers (e.g. second finger during a drag) */
            if (dragging) return;
            var cell = cellFromPoint(e.clientX, e.clientY);
            if (!cell) return;
            e.preventDefault();
            /* Capture on the grid so pointermove/up keep firing even if the
               finger leaves a cell or drifts off the grid edge. */
            if (e.pointerId !== undefined && grid.setPointerCapture) {
                try { grid.setPointerCapture(e.pointerId); } catch (_) {}
            }
            activePointerId = e.pointerId;
            dragging = true;
            startRC = rcOf(cell);
            lastSelection = [startRC.slice()];
            paintSelection(lastSelection);
        }

        function onPointerMove(e) {
            if (!dragging) return;
            if (activePointerId !== null && e.pointerId !== activePointerId) return;
            var cell = cellFromPoint(e.clientX, e.clientY);
            if (!cell) return;
            var rc = rcOf(cell);
            var line = lineCells(startRC[0], startRC[1], rc[0], rc[1]);
            if (line) {
                lastSelection = line;
                paintSelection(line);
            }
        }

        function onPointerUp(e) {
            if (!dragging) return;
            if (activePointerId !== null && e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
            dragging = false;
            if (e && e.pointerId !== undefined && grid.releasePointerCapture) {
                try { grid.releasePointerCapture(e.pointerId); } catch (_) {}
            }
            activePointerId = null;
            var key = serialize(lastSelection);
            var matched = sequenceToWord[key];
            clearSelecting();
            if (matched) markWordFound(matched);
            lastSelection = [];
            startRC = null;
        }

        grid.addEventListener('pointerdown', onPointerDown);
        grid.addEventListener('pointermove', onPointerMove);
        grid.addEventListener('pointerup', onPointerUp);
        grid.addEventListener('pointercancel', onPointerUp);
        /* Safety net for pointer-capture quirks: still release on document up */
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        /* ─── Completion celebration ─── */
        function celebrate() {
            vibrate([60, 40, 60, 40, 120]);
            if (!block) return;
            var overlay = document.createElement('div');
            overlay.className = 'word-search-celebration';
            overlay.setAttribute('role', 'status');
            overlay.setAttribute('aria-live', 'polite');
            overlay.innerHTML =
                '<canvas class="word-search-celebration-canvas"></canvas>' +
                '<div class="word-search-celebration-banner">' +
                    '<div class="word-search-celebration-emoji" aria-hidden="true">🎉</div>' +
                    '<div class="word-search-celebration-title">Congratulations!</div>' +
                    '<div class="word-search-celebration-subtitle">You found every word.</div>' +
                    '<button type="button" class="word-search-celebration-close" aria-label="Close">Nice!</button>' +
                '</div>';
            block.appendChild(overlay);
            requestAnimationFrame(function () { overlay.classList.add('is-visible'); });

            var canvas = overlay.querySelector('.word-search-celebration-canvas');
            var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var stopFireworks = reduced ? function () {} : runCelebrationFireworks(canvas);

            function close() {
                overlay.classList.remove('is-visible');
                stopFireworks();
                setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 400);
            }
            overlay.querySelector('.word-search-celebration-close').addEventListener('click', close);
            /* Auto-dismiss after a generous viewing window */
            setTimeout(close, 6500);
        }

        function runCelebrationFireworks(canvas) {
            var ctx = canvas.getContext('2d');
            var particles = [];
            var running = true;
            var raf = null;
            var colors = [
                '#e74c3c', '#f39c12', '#2ecc71', '#3498db',
                '#9b59b6', '#1abc9c', '#ffd93d', '#ff6b9d', '#008852'
            ];

            function size() {
                var rect = canvas.parentElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
            size();
            window.addEventListener('resize', size);

            function Particle(x, y, color) {
                var angle = Math.random() * Math.PI * 2;
                var speed = Math.random() * 4 + 1.5;
                this.x = x; this.y = y;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.alpha = 1;
                this.color = color;
                this.r = Math.random() * 2.5 + 0.8;
                this.decay = Math.random() * 0.012 + 0.008;
            }
            Particle.prototype.update = function () {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.04;
                this.vx *= 0.99;
                this.alpha -= this.decay;
            };
            Particle.prototype.draw = function () {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.alpha);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };

            function burst(x, y) {
                var color = colors[Math.floor(Math.random() * colors.length)];
                var n = 26 + Math.floor(Math.random() * 18);
                for (var i = 0; i < n; i++) particles.push(new Particle(x, y, color));
            }

            function launch() {
                var x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
                var y = Math.random() * canvas.height * 0.5 + canvas.height * 0.15;
                burst(x, y);
            }

            function frame() {
                if (!running) return;
                raf = requestAnimationFrame(frame);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (var i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].draw();
                    if (particles[i].alpha <= 0) particles.splice(i, 1);
                }
            }

            launch(); launch();
            var iv = setInterval(function () {
                if (!running) return;
                launch();
                if (Math.random() > 0.4) launch();
            }, 700);
            frame();

            return function stop() {
                running = false;
                if (raf) cancelAnimationFrame(raf);
                clearInterval(iv);
                window.removeEventListener('resize', size);
            };
        }

        /* Show Solution toggle — adds .found to all cells/words; doesn't disturb user-found state */
        var shown = false;
        btn.addEventListener('click', function () {
            shown = !shown;
            btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
            grid.classList.toggle('solution-shown', shown);
            cells.forEach(function (c) { c.classList.remove('solution-hint'); });
            wordEls.forEach(function (el) {
                var w = el.getAttribute('data-word');
                if (shown && !foundWords[w]) el.classList.add('found');
                else if (!shown && !foundWords[w]) el.classList.remove('found');
            });
            if (shown) {
                Object.keys(solution).forEach(function (word) {
                    if (foundWords[word]) return;
                    solution[word].forEach(function (rc) {
                        cellAt(rc[0], rc[1]).classList.add('solution-hint');
                    });
                });
            }
        });

        /* Click a word in the list to manually cross it off */
        wordEls.forEach(function (el) {
            el.addEventListener('click', function () {
                el.classList.toggle('crossed');
            });
        });

        /* Clear / start-over button */
        var clearBtn = document.querySelector('.word-search-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                foundWords = {};
                foundCount = 0;
                celebrated = false;
                cells.forEach(function (c) {
                    c.classList.remove('user-found', 'selecting', 'solution-hint');
                });
                wordEls.forEach(function (el) {
                    el.classList.remove('found', 'crossed');
                });
                if (shown) {
                    shown = false;
                    grid.classList.remove('solution-shown');
                    btn.setAttribute('aria-pressed', 'false');
                }
                dragging = false;
                activePointerId = null;
                lastSelection = [];
                startRC = null;
                if (block) {
                    var existing = block.querySelector('.word-search-celebration');
                    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
                }
            });
        }
    }

    /* ─── Party gallery show/hide toggle ─── */
    function initPartyGallery() {
        var wrap = document.querySelector('.party-gallery-wrap');
        if (!wrap) return;
        var btn = wrap.querySelector('.party-gallery-toggle');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var expanded = wrap.classList.toggle('expanded');
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    }

    /* ─── Tech Talk: simulated Claude chat ─── */
    function initTechChat() {
        var chat = document.querySelector('.tech-talk-chat');
        if (!chat) return;

        var userMsg = chat.querySelector('.chat-message-user');
        var claudeMsg = chat.querySelector('.chat-message-claude');
        var typingEl = claudeMsg && claudeMsg.querySelector('.typing-indicator');
        var responseEl = claudeMsg && claudeMsg.querySelector('.chat-response');
        if (!userMsg || !claudeMsg || !typingEl || !responseEl) return;

        var paragraphs = [];
        try { paragraphs = JSON.parse(chat.getAttribute('data-response') || '[]'); } catch (e) {}
        if (!paragraphs.length) return;

        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var started = false;

        function runChat() {
            userMsg.classList.add('visible');
            setTimeout(function () {
                claudeMsg.classList.add('visible');
                setTimeout(function () {
                    typingEl.parentNode.removeChild(typingEl);
                    if (reduced) {
                        renderInstant(responseEl, paragraphs);
                    } else {
                        typeParagraphs(responseEl, paragraphs, 0);
                    }
                }, 1400);
            }, 700);
        }

        function renderInstant(container, paras) {
            for (var i = 0; i < paras.length; i++) {
                var p = document.createElement('p');
                p.textContent = paras[i];
                container.appendChild(p);
            }
        }

        function typeParagraphs(container, paras, idx) {
            if (idx >= paras.length) {
                var cursor = container.querySelector('.chat-cursor');
                if (cursor) cursor.parentNode.removeChild(cursor);
                return;
            }
            var p = document.createElement('p');
            container.appendChild(p);

            /* Attach a blinking cursor at the end of the current paragraph */
            var cursor = container.querySelector('.chat-cursor');
            if (!cursor) {
                cursor = document.createElement('span');
                cursor.className = 'chat-cursor';
            }
            p.appendChild(cursor);

            var text = paras[idx];
            var i = 0;
            function step() {
                if (i < text.length) {
                    /* Insert each character before the cursor */
                    cursor.insertAdjacentText('beforebegin', text.charAt(i));
                    i++;
                    setTimeout(step, 22 + Math.random() * 22);
                } else {
                    setTimeout(function () {
                        typeParagraphs(container, paras, idx + 1);
                    }, 260);
                }
            }
            step();
        }

        if (!('IntersectionObserver' in window)) {
            runChat();
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !started) {
                    started = true;
                    runChat();
                    observer.disconnect();
                }
            });
        }, { threshold: 0.35 });
        observer.observe(chat);
    }

    /* ─── Employee Spotlight: video + photo toggle ─── */
    function initSpotlightMedia() {
        var media = document.querySelector('.spotlight-media');
        if (!media) return;

        var tabs = Array.prototype.slice.call(media.querySelectorAll('.spotlight-media-tab'));
        var panes = Array.prototype.slice.call(media.querySelectorAll('.spotlight-media-pane'));
        var video = media.querySelector('.spotlight-video');
        var videoWrap = media.querySelector('.spotlight-video-wrap');
        var playOverlay = media.querySelector('.spotlight-play-overlay');
        var posterTime = parseFloat(media.getAttribute('data-poster-time')) || 0;

        if (video) {
            function seekToPoster() {
                try {
                    var t = posterTime;
                    if (video.duration && t > video.duration - 0.1) {
                        t = Math.max(0, video.duration * 0.3);
                    }
                    video.currentTime = t;
                } catch (e) {}
            }
            if (video.readyState >= 1) {
                seekToPoster();
            } else {
                video.addEventListener('loadedmetadata', seekToPoster, { once: true });
            }

            function togglePlay() {
                if (video.paused || video.ended) {
                    var p = video.play();
                    if (p && p.catch) p.catch(function () {});
                } else {
                    video.pause();
                }
            }

            if (playOverlay) {
                playOverlay.addEventListener('click', function (e) {
                    e.stopPropagation();
                    togglePlay();
                });
            }
            /* Clicking the video itself also toggles play/pause */
            video.addEventListener('click', togglePlay);

            video.addEventListener('play', function () {
                if (videoWrap) videoWrap.classList.add('is-playing');
            });
            video.addEventListener('pause', function () {
                if (videoWrap) videoWrap.classList.remove('is-playing');
            });
            video.addEventListener('ended', function () {
                if (videoWrap) videoWrap.classList.remove('is-playing');
            });
        }

        function activate(target) {
            tabs.forEach(function (t) {
                var on = t.getAttribute('data-target') === target;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            panes.forEach(function (p) {
                p.classList.toggle('is-active', p.getAttribute('data-pane') === target);
            });
            if (target !== 'video' && video) {
                try { video.pause(); } catch (e) {}
            }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                activate(tab.getAttribute('data-target'));
            });
        });
    }

    /* ─── Theme toggle (light / dark) ─── */
    function initThemeToggle() {
        var btn = document.getElementById('themeToggle');
        if (!btn) return;

        function syncState() {
            var dark = document.documentElement.getAttribute('data-theme') === 'dark';
            btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
            btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        }
        syncState();

        btn.addEventListener('click', function () {
            var cur = document.documentElement.getAttribute('data-theme');
            var next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('fenceLineTheme', next); } catch (e) {}
            syncState();
        });
    }

    /* ─── Initialize ─── */
    document.addEventListener('DOMContentLoaded', function () {
        initThemeToggle();
        initScrollFade();
        initSmoothScroll();
        initLightbox();
        initDropdown();
        initFireworks();
        initBackToTop();
        initStickyBar();
        initWeather();
        initPoll();
        initPartyGallery();
        initWordSearch();
        initTechChat();
        initSpotlightMedia();
    });


})();
