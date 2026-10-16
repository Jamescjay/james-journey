/* ==========================================================================
   Journey UI
     1. ScrollPill - one whole-page scroll tracker. Shows the name of the
        section currently in view plus overall progress through the page
        (0% at the very top, 100% at the very bottom).
     2. Lightbox   - click any journey image to open it full screen.

   No dependencies. Both modules are opt-out safe: if the markup they look
   for is missing they simply do nothing.
   ========================================================================== */
(function (global) {
  'use strict';

  var doc = document;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function text(node) {
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  /* ====================================================== 1. ScrollPill === */

  /* Sections are read from the page itself. `data-pill` wins; otherwise we
     fall back to the section's own heading, then its id. */
  var SECTION_SELECTOR = '[data-pill], header, main > .chapter, main > section, #showcase, .life, .thanks, .end';

  function ScrollPill() {
    this.sections = [];
    this.activeIndex = -1;
    this.percent = -1;
    this.ticking = false;
    this.open = false;

    this.frame = this.frame.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onDocClick = this.onDocClick.bind(this);

    if (!this.collect()) return;
    this.build();
    this.bind();
    this.update();
  }

  ScrollPill.prototype.collect = function () {
    var nodes = doc.querySelectorAll(SECTION_SELECTOR);
    var seen = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (seen.indexOf(n) !== -1) continue;
      // Skip anything nested inside an already-collected section.
      var nested = false;
      for (var s = 0; s < seen.length; s++) {
        if (seen[s].contains(n)) { nested = true; break; }
      }
      if (nested) continue;

      var label = n.getAttribute('data-pill') ||
        text(n.querySelector('h1, h2, h3')) ||
        text(n.querySelector('small, .story > b')) ||
        n.id;
      if (!label) continue;
      if (label.length > 42) label = label.slice(0, 40).replace(/\s+\S*$/, '') + '...';

      seen.push(n);
      this.sections.push({ el: n, label: label, top: 0 });
    }
    return this.sections.length > 1;
  };

  ScrollPill.prototype.build = function () {
    var self = this;

    var root = doc.createElement('div');
    root.className = 'pill';

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'pill__btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-haspopup', 'true');

    this.name = doc.createElement('span');
    this.name.className = 'pill__name';
    btn.appendChild(this.name);

    btn.insertAdjacentHTML('beforeend',
      '<svg class="pill__chev" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
      '<path d="M2 4.2 6 8.2l4-4" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>');

    this.pct = doc.createElement('span');
    this.pct.className = 'pill__pct';

    var menu = doc.createElement('ul');
    menu.className = 'pill__menu';
    menu.id = 'pillMenu';
    menu.hidden = true;
    btn.setAttribute('aria-controls', 'pillMenu');

    this.jumps = [];
    for (var i = 0; i < this.sections.length; i++) {
      var li = doc.createElement('li');
      var j = doc.createElement('button');
      j.type = 'button';
      j.className = 'pill__jump';
      j.textContent = this.sections[i].label;
      (function (index) {
        j.addEventListener('click', function () { self.jumpTo(index); });
      })(i);
      li.appendChild(j);
      menu.appendChild(li);
      this.jumps.push(j);
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      self.toggle(!self.open);
    });

    root.appendChild(btn);
    root.appendChild(this.pct);
    root.appendChild(menu);
    doc.body.appendChild(root);

    this.root = root;
    this.btn = btn;
    this.menu = menu;

    // A live region would announce on every scroll tick, so keep it quiet
    // and expose the value on the button instead.
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Reading position');
  };

  ScrollPill.prototype.bind = function () {
    var self = this;
    global.addEventListener('scroll', this.onScroll, { passive: true });
    global.addEventListener('resize', function () { self.measure(); self.onScroll(); }, { passive: true });
    doc.addEventListener('click', this.onDocClick);
    doc.addEventListener('keydown', this.onKey);
    if (global.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.measure(); self.onScroll(); });
      this.ro.observe(doc.body);
    }
    this.measure();
  };

  ScrollPill.prototype.measure = function () {
    for (var i = 0; i < this.sections.length; i++) {
      var r = this.sections[i].el.getBoundingClientRect();
      this.sections[i].top = r.top + (global.pageYOffset || doc.documentElement.scrollTop);
    }
    this.sections.sort(function (a, b) { return a.top - b.top; });
  };

  ScrollPill.prototype.onScroll = function () {
    if (this.ticking) return;
    this.ticking = true;
    global.requestAnimationFrame(this.frame);
  };

  ScrollPill.prototype.frame = function () {
    this.ticking = false;
    this.update();
  };

  ScrollPill.prototype.update = function () {
    var d = doc.documentElement;
    var y = global.pageYOffset || d.scrollTop;
    var range = d.scrollHeight - global.innerHeight;

    // Overall progress through the whole page, not the current section.
    // Snap the ends so the pill reliably reads 0% at the top and 100% at
    // the very bottom even after sub-pixel rounding.
    var percent = range > 0 ? Math.round(clamp(y / range, 0, 1) * 100) : 0;
    if (range > 0 && y >= range - 2) percent = 100;
    if (y <= 2) percent = 0;
    if (percent !== this.percent) {
      this.percent = percent;
      this.pct.textContent = percent + '%';
      this.btn.setAttribute('aria-label', 'Current section, ' + percent + '% through the page');
    }

    // The section under a line a third of the way down the viewport.
    var line = y + global.innerHeight * 0.34;
    var index = 0;
    for (var i = 0; i < this.sections.length; i++) {
      if (this.sections[i].top <= line) index = i; else break;
    }
    if (index !== this.activeIndex) {
      this.activeIndex = index;
      this.name.textContent = this.sections[index].label;
      for (var j = 0; j < this.jumps.length; j++) {
        this.jumps[j].setAttribute('aria-current', j === index ? 'true' : 'false');
      }
    }

    // Stay out of the way over the very top of the page.
    this.root.classList.toggle('is-visible', y > 40);
    if (y <= 40 && this.open) this.toggle(false);
  };

  ScrollPill.prototype.toggle = function (open) {
    this.open = open;
    this.menu.hidden = !open;
    this.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && this.jumps[this.activeIndex]) this.jumps[this.activeIndex].focus();
  };

  ScrollPill.prototype.jumpTo = function (index) {
    this.toggle(false);
    var el = this.sections[index].el;
    var top = el.getBoundingClientRect().top + (global.pageYOffset || doc.documentElement.scrollTop);
    global.scrollTo({ top: Math.max(0, Math.round(top) - 60), behavior: 'smooth' });
  };

  ScrollPill.prototype.onDocClick = function (e) {
    if (this.open && !this.root.contains(e.target)) this.toggle(false);
  };

  ScrollPill.prototype.onKey = function (e) {
    if (e.key === 'Escape' && this.open) { this.toggle(false); this.btn.focus(); }
  };

  /* ======================================================== 2. Lightbox === */

  /* Scope: only the Figma screens on the stack and the prototype video are
     expandable. Every other image on the page keeps its normal behaviour. */
  var IMG_SELECTOR = '#showcase .jcard__media img, [data-lightbox] img';

  function Lightbox() {
    this.opener = null;
    this.onKey = this.onKey.bind(this);
    this.build();
    this.attach();
    this.attachVideo();
  }

  Lightbox.prototype.build = function () {
    var self = this;
    var lb = doc.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Expanded view');

    lb.innerHTML =
      '<button class="lb__close" type="button" aria-label="Close expanded view">' +
      '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path d="M2 2l12 12M14 2L2 14" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round"/></svg></button>' +
      '<figure class="lb__figure">' +
      '<img class="lb__img" alt="">' +
      '<video class="lb__vid" controls playsinline preload="none" hidden></video>' +
      '<figcaption class="lb__cap"></figcaption></figure>';

    this.el = lb;
    this.img = lb.querySelector('.lb__img');
    this.vid = lb.querySelector('.lb__vid');
    this.cap = lb.querySelector('.lb__cap');
    this.closeBtn = lb.querySelector('.lb__close');

    this.closeBtn.addEventListener('click', function () { self.close(); });
    lb.addEventListener('click', function (e) {
      if (!e.target.closest('.lb__figure')) self.close();
    });

    doc.body.appendChild(lb);
  };

  Lightbox.prototype.attach = function () {
    var self = this;
    var imgs = doc.querySelectorAll(IMG_SELECTOR);

    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.hasAttribute('data-no-lightbox') || img.classList.contains('lb-able')) continue;
      if (img.closest('.lb')) continue;

      img.classList.add('lb-able');

      var host = img.parentNode;
      host.classList.add('lb-wrap');
      if (!host.querySelector('.lb-hint')) {
        var hint = doc.createElement('span');
        hint.className = 'lb-hint';
        hint.textContent = 'Click to expand';
        hint.setAttribute('aria-hidden', 'true');
        host.appendChild(hint);
      }

      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Expand ' + (img.getAttribute('alt') || 'image'));

      (function (node) {
        node.addEventListener('click', function (e) { e.preventDefault(); self.open(node); });
        node.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.open(node); }
        });
      })(img);
    }
  };

  /* The prototype video keeps its inline controls, so expanding gets its own
     button rather than stealing the click that plays it. */
  Lightbox.prototype.attachVideo = function () {
    var self = this;
    var wraps = doc.querySelectorAll('.proto');

    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var video = wrap.querySelector('video');
      if (!video || wrap.querySelector('.proto__expand')) continue;

      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'proto__expand';
      btn.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        '<path d="M6 1H1v5M10 15h5v-5M1 10v5h5M15 6V1h-5" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Expand</span>';
      btn.setAttribute('aria-label', 'Expand the prototype walkthrough video');

      (function (v, w) {
        btn.addEventListener('click', function () { self.openVideo(v, w); });
      })(video, wrap);

      wrap.insertBefore(btn, wrap.firstChild);
    }
  };

  Lightbox.prototype.show = function (caption) {
    this.cap.textContent = caption || '';
    this.cap.style.display = caption ? '' : 'none';
    this.el.classList.add('is-open');
    doc.documentElement.classList.add('lb-open');
    doc.addEventListener('keydown', this.onKey);
    this.closeBtn.focus();
  };

  Lightbox.prototype.open = function (source) {
    this.opener = source;
    this.vid.hidden = true;
    this.img.hidden = false;
    this.img.src = source.getAttribute('data-full') || source.currentSrc || source.src;
    this.img.alt = source.getAttribute('alt') || '';

    // On the stack, the caption lives in the card's own meta block.
    var card = source.closest('.jcard');
    var caption = source.getAttribute('data-caption') ||
      (card ? text(card.querySelector('.jcard__meta h3')) + ' - ' + text(card.querySelector('.jcard__meta p')) : '');
    this.show(caption.replace(/ - $/, ''));
  };

  Lightbox.prototype.openVideo = function (video, wrap) {
    this.opener = wrap.querySelector('.proto__expand');
    this.img.hidden = true;
    this.vid.hidden = false;

    var src = video.currentSrc || (video.querySelector('source') || {}).src || '';
    if (this.vid.getAttribute('src') !== src) this.vid.setAttribute('src', src);
    this.vid.poster = video.getAttribute('poster') || '';
    this.vid.currentTime = video.currentTime || 0;

    video.pause();
    this.show(text(wrap.querySelector('figcaption')));
    var v = this.vid;
    setTimeout(function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); }, 60);
  };

  Lightbox.prototype.close = function () {
    this.el.classList.remove('is-open');
    doc.documentElement.classList.remove('lb-open');
    doc.removeEventListener('keydown', this.onKey);
    if (!this.vid.hidden) { this.vid.pause(); }
    if (this.opener) { this.opener.focus(); this.opener = null; }
  };

  Lightbox.prototype.onKey = function (e) {
    if (e.key === 'Escape') this.close();
    // Simple focus trap - the dialog only holds one control.
    if (e.key === 'Tab') { e.preventDefault(); this.closeBtn.focus(); }
  };

  /* ============================================================== init === */

  function init() {
    global.journeyPill = new ScrollPill();
    global.journeyLightbox = new Lightbox();
  }

  global.ScrollPill = ScrollPill;
  global.Lightbox = Lightbox;

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
