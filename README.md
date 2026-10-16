James's Journey static website. Upload the ZIP directly. Images are grayscale by default and reveal colour on hover (the Figma stack and the prototype video are deliberately exempt and stay in full colour).

## Whole-page scroll tracker (`journey-ui.js` / `.css`)

A single fixed pill shows the current section name plus overall progress through the entire page (0% at the top, 100% at the bottom). Sections are discovered from the page itself: a `data-pill="..."` attribute wins, otherwise the section's own `h1`/`h2`/`h3` is used. The chevron opens a jump menu. Scroll handling is rAF-throttled.

To rename an entry in the tracker, set or edit `data-pill` on that section in `index.html`.

## Click-to-expand lightbox (`journey-ui.js` / `.css`)

Scoped on purpose: only the Figma screens on the stack and the prototype video are expandable. Add `data-lightbox` to any other container to opt it in. Closes on the X, on click-outside, and on Escape.

## Design journey stack (`journey-stack.js` / `.css`)

The OYS Objective Tracker screens are presented as a scroll-driven stack of cards. Edit the `JOURNEY_SCREENS` array at the top of `journey-stack.js` to add, remove or reorder screens:

```js
{ image: 'figma/my-export.png',
  title: 'Short title',
  description: 'Caption shown under the screen.' }
```

Adding an entry automatically adds a card and a scroll step. The card frame is sized to 1592x1020 (1.56), matching most of the exports, and images are `object-fit: contain` so nothing is ever cropped. Filenames containing spaces must be URL-encoded (`getting%20started.png`).

## Prototype video

`assets/prototype-walkthrough.mp4` is a web-optimised re-encode (1272px wide, ~3.7 MB) of the original 468 MB recording, with `assets/prototype-poster.jpg` as its poster. It uses `preload="none"`, so nothing downloads until play is pressed. The original file is untouched in the project root and is not referenced by the page.