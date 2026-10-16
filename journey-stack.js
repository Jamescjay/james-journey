/* ==========================================================================
   Journey Stack - scroll-driven stacked-screen showcase.

   Self-contained: no dependencies, no build step, no global side effects
   beyond `window.JourneyStack` / `window.JOURNEY_SCREENS`.

   HOW TO ADD YOUR REAL FIGMA SCREENSHOTS
   --------------------------------------
   Drop the export into /assets and add (or edit) an entry below. The stack,
   the scroll runway, the progress rail and the transitions are all derived
   from this array - 5, 10 or 20 items all work with no other change.

     { image: 'assets/my-export.png',
       title: 'Objective tracker',
       description: 'Short caption shown under the screen.',
       alt: 'Optional accessible description' }
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------- data --- */

  var JOURNEY_SCREENS = [
    {
      image: 'figma/story-boarding.png',
      title: 'The starting point',
      description: 'Objective, Description, Signals and Actions in four columns. One long description set the row height for everyone.'
    },
    {
      image: 'figma/ideate.png',
      title: 'Four shapes, one story',
      description: 'Accordion, master-detail, card grid and drawer, weighed on whether prose kept a readable measure.'
    },
    {
      image: 'figma/accordion.png',
      title: 'The accordion',
      description: 'The direction I chose. One column, expanding in place, so longer content such as a Reflection gets the full measure when it opens.'
    },
    {
      image: 'figma/getting%20started.png',
      title: 'Getting started',
      description: 'The empty state, before a single objective exists.'
    },
    {
      image: 'figma/tracker.png',
      title: 'Parsing input',
      description: 'Freeform text pasted from a review doc, parsed into individual objectives.'
    },
    {
      image: 'figma/objectives-created.png',
      title: 'Objectives created',
      description: 'The confirmation, and the prompt to add the people whose recognition matters.'
    },
    {
      image: 'figma/objective-tracker.png',
      title: 'Objectives overview',
      description: 'The collapsed state, where a title and a state pill replace four table columns.'
    },
    {
      image: 'figma/signals.png',
      title: 'Signals',
      description: 'Evidence gathered from everyday work, attached to the objective it supports.'
    },
    {
      image: 'figma/Pull-signals.png',
      title: 'Pull signals',
      description: 'Surfacing evidence from meetings, emails, chats and documents.'
    },
    {
      image: 'figma/aprove-signals.png',
      title: 'Approve signals',
      description: 'The human checkpoint. Nothing is generated until the person approves the evidence.'
    },
    {
      image: 'figma/Delete%20Objective.png',
      title: 'Delete objective',
      description: 'The destructive path, handled with a clear confirmation.'
    },
    {
      image: 'figma/Darkmode.png',
      title: 'Dark mode',
      description: 'The accordion, state pills and generated blocks carried into the dark theme.'
    },
    {
      image: 'figma/High-contrast-mode.jpeg',
      title: 'High contrast mode',
      description: 'The same pattern where borders and weight carry the hierarchy instead of colour.'
    }
  ];

  /* ---------------------------------------------------------- tunables --- */

  var DEFAULTS = {
    stepVh: 78,            // viewport heights of scroll consumed per screen
    stackGap: 26,          // px each queued screen peeks above the active one (max)
    stackGapMin: 13,
    stackGapRatio: 0.042,  // gap scales with stage height, capped by stackGap
    stackScale: 0.052,     // scale removed per step back in the stack
    stackRotate: 2.4,      // deg of rotateX per step back in the stack
    visibleBehind: 3,      // how many queued screens stay painted
    exitTravel: 0.6,       // share of the stage height the leaving screen falls
    exitTravelMin: 160,
    exitRotate: 11,        // deg the leaving screen tips toward the viewer
    exitScale: 0.035,
    exitFade: 0.66,        // progress at which the leaving screen is fully gone
    stageFill: 0.98,       // share of the stage height a settled screen may use
    aspect: 1.56,          // screen frame aspect ratio (matches the exports)
    mediaMin: 140,
    mediaMax: 660,
    veilStep: 0.2,         // dimming applied per step back
    veilMax: 0.62,
    preloadAhead: 2,       // images fetched ahead of the active screen
    preloadBehind: 1
  };

  /* ----------------------------------------------------------- helpers --- */

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function easeOutCubic(t) { var u = 1 - t; return 1 - u * u * u; }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function assign(target, source) {
    if (source) {
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
      }
    }
    return target;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* -------------------------------------------------------- JourneyCard --- */
  /* One screen in the stack. Owns its DOM and only writes CSS custom
     properties that actually changed, so scrolling stays cheap.            */

  function JourneyCard(screen, index, total) {
    this.screen = screen;
    this.index = index;
    this.loaded = false;
    this.last = {};
    this.flags = {};

    var label = screen.title || 'Screen ' + (index + 1);

    var root = el('article', 'jcard');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-roledescription', 'screen');
    root.setAttribute('aria-label', (index + 1) + ' of ' + total + ': ' + label);

    var frame = el('div', 'jcard__screen');

    var chrome = el('div', 'jcard__chrome');
    var lights = el('span', 'jcard__lights');
    lights.appendChild(el('i'));
    lights.appendChild(el('i'));
    lights.appendChild(el('i'));
    chrome.appendChild(lights);
    chrome.appendChild(el('span', 'jcard__tag', label));

    var media = el('div', 'jcard__media');
    var img = document.createElement('img');
    img.alt = screen.alt || (label + (screen.description ? ' - ' + screen.description : ''));
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    this.src = screen.image;
    this.img = img;
    media.appendChild(img);

    frame.appendChild(chrome);
    frame.appendChild(media);

    var meta = el('div', 'jcard__meta');
    meta.appendChild(el('b', 'jcard__index', pad2(index + 1)));
    meta.appendChild(el('h3', null, label));
    if (screen.description) meta.appendChild(el('p', null, screen.description));

    root.appendChild(frame);
    root.appendChild(el('span', 'jcard__veil'));
    root.appendChild(meta);

    this.el = root;
    this.veil = root.querySelector('.jcard__veil');
  }

  JourneyCard.prototype.load = function () {
    if (this.loaded) return;
    this.loaded = true;
    this.img.src = this.src;
  };

  JourneyCard.prototype.setVar = function (name, value) {
    if (this.last[name] === value) return;
    this.last[name] = value;
    this.el.style.setProperty(name, value);
  };

  JourneyCard.prototype.setFlag = function (name, on) {
    if (this.flags[name] === on) return;
    this.flags[name] = on;
    this.el.classList.toggle(name, on);
  };

  JourneyCard.prototype.apply = function (s) {
    this.setVar('--jy', s.y.toFixed(2) + 'px');
    this.setVar('--jsc', s.scale.toFixed(4));
    this.setVar('--jrot', s.rot.toFixed(3) + 'deg');
    this.setVar('--jop', s.opacity.toFixed(3));
    this.setVar('--jz', String(s.z));

    var veil = s.veil.toFixed(3);
    if (this.last.veil !== veil) {
      this.last.veil = veil;
      this.veil.style.opacity = veil;
    }

    this.setFlag('is-active', s.active);
    this.setFlag('is-near', s.near);
    this.setFlag('is-offstage', s.offstage);

    var hidden = s.active ? null : 'true';
    if (this.last.hidden !== hidden) {
      this.last.hidden = hidden;
      if (hidden) this.el.setAttribute('aria-hidden', 'true');
      else this.el.removeAttribute('aria-hidden');
    }
  };

  JourneyCard.prototype.reset = function () {
    this.el.removeAttribute('style');
    this.veil.removeAttribute('style');
    this.el.removeAttribute('aria-hidden');
    this.last = {};
    this.flags = {};
  };

  /* ------------------------------------------------------- JourneyStack --- */

  function JourneyStack(root, screens, options) {
    this.root = root;
    this.screens = (screens && screens.length ? screens : JOURNEY_SCREENS).slice();
    this.opts = assign(assign({}, DEFAULTS), options);
    this.count = this.screens.length;
    this.steps = Math.max(this.count - 1, 0);
    this.cards = [];
    this.progress = -1;
    this.activeIndex = -1;
    this.exitTravel = this.opts.exitTravelMin;
    this.gap = this.opts.stackGap;
    this.peek = this.opts.visibleBehind * this.opts.stackGap;
    this.inView = true;
    this.ticking = false;
    this.reduced = false;

    this.frame = this.frame.bind(this);
    this.requestTick = this.requestTick.bind(this);

    this.build();
    this.bind();
  }

  JourneyStack.prototype.build = function () {
    var self = this;
    var root = this.root;
    var opts = this.opts;

    root.classList.add('jstack');
    root.style.setProperty('--jstack-steps', String(this.steps));
    // Keep the total runway sane as the deck grows.
    var stepVh = this.count > 8 ? 52 : (this.count > 5 ? 64 : opts.stepVh);
    root.style.setProperty('--jstack-step', String(stepVh));
    root.innerHTML = '';

    var track = el('div', 'jstack__track');
    var sticky = el('div', 'jstack__sticky');

    var head = el('div', 'jstack__inner');
    var intro = el('div', 'jstack__intro');
    var headings = el('div');
    headings.appendChild(el('small', null, root.getAttribute('data-eyebrow') || 'DESIGN JOURNEY'));
    headings.appendChild(el('h2', null, root.getAttribute('data-title') || 'The Figma story, one screen at a time.'));
    intro.appendChild(headings);
    head.appendChild(intro);

    var stageWrap = el('div', 'jstack__inner jstack__stage-wrap');
    var stage = el('div', 'jstack__stage');
    for (var j = 0; j < this.count; j++) {
      var card = new JourneyCard(this.screens[j], j, this.count);
      stage.appendChild(card.el);
      this.cards.push(card);
    }
    stageWrap.appendChild(stage);

    sticky.appendChild(head);
    sticky.appendChild(stageWrap);
    track.appendChild(sticky);
    root.appendChild(track);

    this.track = track;
    this.sticky = sticky;
    this.stage = stage;
  };

  JourneyStack.prototype.bind = function () {
    var self = this;
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;

    var applyMode = function () {
      var reduced = !!(mq && mq.matches);
      if (reduced === self.reduced && self.progress !== -1) return;
      self.reduced = reduced;
      self.root.classList.toggle('jstack--static', reduced);
      if (reduced) {
        self.root.style.removeProperty('--jstack-media-h');
        for (var i = 0; i < self.cards.length; i++) {
          self.cards[i].reset();
          self.cards[i].load();
        }
      } else {
        self.measure();
        self.progress = -1;
        self.update();
      }
    };

    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', applyMode);
      else if (mq.addListener) mq.addListener(applyMode);
    }

    global.addEventListener('scroll', this.requestTick, { passive: true });
    global.addEventListener('resize', function () { self.measure(); self.progress = -1; self.requestTick(); }, { passive: true });
    global.addEventListener('orientationchange', function () { self.measure(); self.progress = -1; self.requestTick(); });

    if (global.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.measure(); self.requestTick(); });
      this.ro.observe(this.stage);
    }

    if (global.IntersectionObserver) {
      this.io = new IntersectionObserver(function (entries) {
        self.inView = entries[0].isIntersecting;
        if (self.inView) self.requestTick();
      }, { rootMargin: '250px 0px' });
      this.io.observe(this.root);
    }

    applyMode();
  };

  /* Grow the screen frame to fill the stage. Width follows height through the
     frame's aspect ratio, so this also makes each screen as wide as it can be
     without ever being clipped. Runs on resize only, never per frame. */
  JourneyStack.prototype.fitCard = function () {
    var stageH = this.stage.clientHeight;
    var stageW = this.stage.clientWidth;
    if (!stageH || !stageW || !this.cards.length) return;

    var card = this.cards[this.activeIndex] || this.cards[0];
    if (!card.el.offsetHeight) {
      for (var i = 0; i < this.cards.length; i++) {
        if (this.cards[i].el.offsetHeight) { card = this.cards[i]; break; }
      }
    }
    var media = card.el.querySelector('.jcard__media');
    if (!card.el.offsetHeight || !media.offsetHeight) return;

    var o = this.opts;
    var maxByWidth = stageW / o.aspect;
    // Reserve the room the queued screens need to peek above the settled one,
    // and bias the whole stack down by half of it so nothing escapes the stage.
    // The gap scales with the stage so short viewports don't lose their screen.
    this.gap = clamp(stageH * o.stackGapRatio, o.stackGapMin, o.stackGap);
    this.peek = o.visibleBehind * this.gap;
    this.root.style.setProperty('--jstack-peek', Math.round(this.peek / 2) + 'px');

    // Two passes: a wider card can re-wrap the caption and change the
    // non-media height, so re-measure once the new width has been applied.
    for (var pass = 0; pass < 2; pass++) {
      var extra = card.el.offsetHeight - media.offsetHeight;
      if (extra < 0) return;
      var h = Math.min((stageH - this.peek) * o.stageFill - extra, maxByWidth);
      this.root.style.setProperty('--jstack-media-h', Math.round(clamp(h, o.mediaMin, o.mediaMax)) + 'px');
    }
  };

  JourneyStack.prototype.measure = function () {
    if (this.reduced) return;
    this.fitCard();
    var h = this.stage.clientHeight || this.sticky.clientHeight || 0;
    this.exitTravel = Math.max(this.opts.exitTravelMin, h * this.opts.exitTravel);
  };

  JourneyStack.prototype.requestTick = function () {
    if (this.reduced || this.ticking || !this.inView) return;
    this.ticking = true;
    global.requestAnimationFrame(this.frame);
  };

  JourneyStack.prototype.frame = function () {
    this.ticking = false;
    this.update();
  };

  JourneyStack.prototype.scrollRange = function () {
    return Math.max(this.track.offsetHeight - this.sticky.offsetHeight, 0);
  };

  JourneyStack.prototype.update = function () {
    if (this.reduced || !this.count) return;

    var range = this.scrollRange();
    var ratio = range > 0 ? clamp(-this.track.getBoundingClientRect().top / range, 0, 1) : 0;
    var progress = ratio * this.steps;

    if (Math.abs(progress - this.progress) < 0.0005) return;
    this.progress = progress;

    var o = this.opts;
    var state = {};
    var activeIdx = clamp(Math.round(progress), 0, this.count - 1);

    for (var i = 0; i < this.count; i++) {
      var d = progress - i;

      if (d <= 0) {
        var back = -d;
        var depth = Math.min(back, o.visibleBehind + 1);
        state.y = -depth * this.gap;
        state.scale = 1 - depth * o.stackScale;
        state.rot = depth * o.stackRotate;
        state.veil = Math.min(depth * o.veilStep, o.veilMax);
        state.opacity = back <= o.visibleBehind ? 1 : clamp(1 - (back - o.visibleBehind), 0, 1);
        state.z = 500 - Math.round(depth * 10);
      } else {
        var out = Math.min(d, 1.4);
        var k = easeOutCubic(Math.min(out, 1));
        state.y = k * this.exitTravel;
        state.scale = 1 + k * o.exitScale;
        state.rot = -k * o.exitRotate;
        state.veil = 0;
        state.opacity = clamp(1 - out / o.exitFade, 0, 1);
        state.z = 900;
      }

      state.offstage = state.opacity <= 0.002;
      state.active = !state.offstage && i === activeIdx;
      state.near = Math.abs(d) <= o.visibleBehind + 1;

      this.cards[i].apply(state);
    }

    if (activeIdx !== this.activeIndex) {
      this.activeIndex = activeIdx;
      this.preload(activeIdx);
    }
  };

  /* Only fetch what is about to be seen - keeps 20+ heavy exports cheap. */
  JourneyStack.prototype.preload = function (index) {
    var from = Math.max(index - this.opts.preloadBehind, 0);
    var to = Math.min(index + this.opts.preloadAhead, this.count - 1);
    for (var i = from; i <= to; i++) this.cards[i].load();
  };

  JourneyStack.prototype.goTo = function (index) {
    if (this.reduced) {
      this.cards[index].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    var range = this.scrollRange();
    if (!range || !this.steps) return;
    var top = this.track.getBoundingClientRect().top + (global.pageYOffset || document.documentElement.scrollTop);
    global.scrollTo({ top: Math.round(top + (index / this.steps) * range), behavior: 'smooth' });
  };

  /* -------------------------------------------------------------- init --- */

  function init() {
    var nodes = document.querySelectorAll('[data-journey-stack]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].journeyStack) continue;
      nodes[i].journeyStack = new JourneyStack(nodes[i], global.JOURNEY_SCREENS || JOURNEY_SCREENS);
    }
  }

  global.JourneyStack = JourneyStack;
  global.JourneyCard = JourneyCard;
  global.JOURNEY_SCREENS = global.JOURNEY_SCREENS || JOURNEY_SCREENS;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
