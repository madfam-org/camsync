---
name: camsync
description: MADFAM's house world used plainly for an internal tool; the page is the product's own diagram.
colors:
  obsidian: "#0a0e27"
  deep: "#0c1131"
  panel: "#12173a"
  rule: "#1d2347"
  edge: "#2f3561"
  dash: "#3b4277"
  pearl: "#fafafa"
  stone: "#d2d3cc"
  muted: "#a1a49c"
  green: "#2c8136"
  green-deep: "#23692b"
  on-green: "#ffffff"
  yellow: "#eebc15"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.4vw, 3.75rem)"
    fontWeight: 760
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(1.625rem, 2.6vw, 2.25rem)"
    fontWeight: 720
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 680
  lede:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1.3vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  figure:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.375rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  frame: "20px"
  pill: "999px"
spacing:
  gutter: "clamp(1.25rem, 4vw, 3.5rem)"
  section: "clamp(3rem, 8vh, 5rem)"
  xs: "0.75rem"
  sm: "1rem"
  md: "1.25rem"
  lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.md}"
    padding: "0 1.25rem"
    height: "2.875rem"
  button-primary-hover:
    backgroundColor: "{colors.green-deep}"
    textColor: "{colors.on-green}"
  command-block:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.pearl}"
    typography: "{typography.mono}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  code-inline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.pearl}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "0.1rem 0.45rem"
  chip-tag:
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.65rem"
  nav-bar:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.muted}"
    padding: "1.1rem clamp(1.25rem, 4vw, 3.5rem)"
  program-frame:
    backgroundColor: "{colors.deep}"
    rounded: "{rounded.frame}"
---

# Design System: camsync

## Overview

**Creative North Star: "The Signal Diagram"**

The page is drawn the way the product works: sources are lines, the program is one vertical 9:16 frame, and every line says in its own stroke whether it is real today. A solid pearl line exists; a dashed indigo line is not built. Everything else on the page inherits that grammar, from the three-stop path below the fold to the dashed list of what is not built. The diagram is the proof; there is no footage, no photograph and no device mockup.

It is MADFAM's house world used plainly: an obsidian ground that never changes, pearl text, the logo's green for the one action and the logo's yellow for the point where things meet. The density is a technical sheet: hairline indigo rules between sections, measurements and commands set in monospace because they are measurements and code, and no decorative surface beyond the frame itself.

The page is built from markup, one stylesheet and inline SVG: no script, no inline style attribute, no web font, no image or video file, no third-party request (CSP `default-src 'none'`), and exactly one outbound link, to the public repository. Those are product constraints, and the visual system is shaped to live inside them.

**Key Characteristics:**
- One dark ground (obsidian) for the whole page; depth comes from three slightly lighter indigos, not from shadow.
- Two stroke states carry meaning: solid pearl = exists, dashed indigo = not built.
- Yellow marks convergence and live readouts; green is the action and nothing else.
- System sans for words, system monospace with tabular figures for numbers and commands.
- Drawn in CSS and inline SVG only; static unless motion explains the diagram.

## Colors

A near-black indigo ground with warm neutrals for text and two brand accents that each hold one job.

### Primary
- **Logo Green** (`green`): the single action, the repository button, and the underline colour of every text link. Its hover is **Deep Logo Green** (`green-deep`); its text is plain white (`on-green`, 4.9:1 on green).

### Secondary
- **Logo Yellow** (`yellow`): the signal colour. The convergence point where every source meets the frame, the REC readout, the second phrase of the headline, the last stop of the path, ordered-list numbers, the focus ring, text selection, and link hover.

### Neutral
- **Obsidian** (`obsidian`): the ground of every page, the browser theme colour, and the knock-out ring around the convergence point.
- **Deep Indigo** (`deep`): the bottom of the program frame's interior gradient.
- **Panel Indigo** (`panel`): the fill of command blocks and inline code.
- **Rule Indigo** (`rule`): hairlines between sections, under the top bar, between table rows and between figures.
- **Edge Indigo** (`edge`): outlines of command blocks, inline code, the status chip and the table header rule; the scrollbar thumb.
- **Dash Indigo** (`dash`): every not-built line (diagram strokes, list dashes) and the frame's dashed safe area. Decorative only; never carries text.
- **Pearl** (`pearl`): primary text, the live source line, the frame's outline, the solid path.
- **Stone** (`stone`): ledes and longer reading text under headings.
- **Muted Sage** (`muted`): labels, captions, table headers, figure descriptions, not-built source labels, the footer (7.4:1 on obsidian).

### Named Rules
**The Live-or-Dashed Rule.** A thing that exists is drawn as a solid pearl stroke; a thing that is not built is drawn as a dashed `dash` stroke. There is no third state, and nothing not built is ever drawn solid.

**The One Green Rule.** Green fills exactly one control per view: the primary action. Elsewhere it appears only as a link underline.

**The Yellow Marks the Point Rule.** Yellow is for where things meet and what is live (the convergence point, REC, the final stop, focus). It fills only small or momentary things (points, the REC dot, the focused skip link, selected text), never a panel or the action button.

## Typography

**Display Font:** system sans (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`)
**Body Font:** the same system sans
**Label/Mono Font:** system monospace (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) with tabular numerals

**Character:** The platform's own sans, set heavy and tight for headings, reads as a tool from the house rather than a campaign; the monospace marks anything that is a measurement or something to type.

### Hierarchy
- **Display** (760, clamp 2.25–3.75rem, 1.02, −0.03em, balanced): the one page headline. Two lines; the second phrase is a block in yellow.
- **Headline** (720, clamp 1.625–2.25rem, 1.12, −0.02em, balanced): section titles below the fold.
- **Title** (680, 1.0625rem): stop names in the path.
- **Lede** (400, clamp 1.0625–1.1875rem, 1.55, stone): the paragraph under the headline, max 40rem; section ledes at body size, max 42rem.
- **Body** (400, 1.0625rem, 1.55): running text; measures held at 42–44rem.
- **Label** (400, 0.8125rem, muted): captions, the run label, table headers (600), figure descriptions, the footer. Sentence case, no tracking.
- **Figure** (mono 700, 1.375rem, −0.01em, tabular): the measured figures beside the frame (0.9375rem on phones).
- **Mono** (mono 400, 0.9375rem, tabular): commands, inline code, source labels (0.8125rem), the REC readout (0.75rem), table values.

### Named Rules
**The Measurement Is Mono Rule.** Any resolution, rate, duration, timecode or command is set in the monospace with tabular numerals; prose around it stays in the sans. A value that was not measured is set back in the sans, in muted.

**The No Web Font Rule.** Type comes from the system stacks only. No font file is loaded.

## Layout

A full-bleed single column with a fluid side gutter (`gutter`, 1.25rem to 3.5rem) and sections separated by a top hairline and generous vertical padding (`section`). Text measures stay at 40–48rem even on wide screens; only the diagram uses the full width.

The first viewport is the diagram: a three-column grid of source lines (fluid), the 9:16 frame (its width follows its height), and a narrow column of three figures (10–12.5rem). The diagram's height is computed from what the headline, lede and action leave of the viewport (`clamp(13rem, 100svh − 29rem, 28rem)`), so the action stays in view at 1440×900 and 1280×700. The pitch sits under it, bottom left.

**Below 62rem the diagram stands up:** the pitch and action move first; the sources become a stacked list, each with a short dash or solid stroke before its label; a vertical set of curves converges onto the frame's top edge, and the convergence point moves there; the figures become a three-column row under the frame; the path's three stops stack. **Below 34rem** the status chip hides, the frame shortens and figures shrink. **On short desktops (under 50rem tall)** the frame keeps only its shape and drops the caption text.

Spacing steps used repeatedly: 0.75rem (run gap, list gaps), 1rem, 1.25rem (lede to action), 2rem (section lede to content).

## Elevation & Depth

Flat by default. Depth is tonal: obsidian ground, `deep`/`panel` fills a step lighter, `rule` and `edge` hairlines a step lighter again. The program frame is the single raised object and the only element with a shadow.

### Shadow Vocabulary
- **Frame lift** (`box-shadow: 0 1.5rem 3rem -1rem rgb(0 0 0 / 0.6)`): under the 9:16 frame only.
- **Knock-out ring** (`box-shadow: 0 0 0 3px #0a0e27`): separates the yellow convergence point from the lines it sits on. A ring, not elevation.

### Named Rules
**The One Raised Object Rule.** Only the program frame casts a shadow. Panels, code blocks and buttons are flat and are separated by tone and a 1px edge.

## Shapes

Lines and rounded rectangles. Strokes are round-capped and non-scaling: 3px for live lines and the path, 2px for dashed lines (dash 6, gap 9), 1.5px inside the frame's drawing, 1px for hairlines. Corners are small and functional: 6px on inline code and the skip link, 8px on the command block and the button, a pill on the status chip, and a 20px radius on the program frame so it reads as a screen. Points are circles: the 14px convergence point and path stops, the 8px REC dot. The frame's safe area is a 1px dashed inset at 13% / 7% / 19%.

## Components

### Buttons
Plain and decided; there is one.
- **Shape:** gently rounded (8px), at least 46px tall.
- **Primary:** Logo Green fill, white text at 650 weight, 0 1.25rem padding, no underline.
- **Hover / Focus:** fill darkens to Deep Logo Green and lifts 1px over 0.2s on the house ease; active returns to rest. Focus is the global 2px yellow outline, 3px offset.
- No secondary button exists; a second action is a text link.

### Command block
- **Style:** the command to run, in mono 0.9375rem, Panel Indigo fill, 1px Edge Indigo outline, 8px radius, 0.75rem 1rem padding, selects whole on click (`user-select: all`). Sits beside the primary button, with a muted label line above that says what it needs.

### Inline code
- **Style:** Panel Indigo, 1px Edge Indigo outline, 6px radius, 0.1rem 0.45rem padding, mono 0.9375rem; inside steps and notes.

### Chips
- **Status tag:** the only chip. 1px Edge Indigo outline, pill radius, muted 0.75rem text, no fill; in the top bar to say what the page is.

### Navigation
- **Top bar:** a single row on obsidian with a hairline below. The name in pearl 700 at 1.125rem, the status chip, and the other-language link pushed right in muted. No menu, at any width.
- **Links:** pearl text with a green underline (0.1em thick, 0.22em offset); hover turns the text yellow.

### Program frame (signature)
A 9:16 rounded screen (20px, 2px pearl outline) filled with a vertical gradient into Deep Indigo, holding a yellow REC readout top left, a dashed safe area, a line drawing of one person fed by the live line, and a muted caption with the 9:16 ratio in mono. The yellow convergence point sits on its left edge (top edge when the diagram stands up).

### Source lines (signature)
Five labels, each riding just above the start of its line; only the first is pearl and solid. Lines are SVG curves converging to one point. The live line draws in once over 1.6s; the convergence point grows in at 1.2s. Both are removed under reduced motion.

### Path and dashed list
- **Path:** three stops on a 3px solid pearl top rule, each marked by a 14px ring; the last stop is filled yellow. It is the live line continued.
- **Not built list:** each item led by a 2px dashed `dash` stroke (4.5rem, 2.5rem on phones). It is the dashed lines continued.

### Measured table
Full-width up to 48rem, left aligned, 1px rule under each row, muted 600 headers over an edge rule, values in mono at body size; an unmeasured value falls back to the sans in muted.

## Do's and Don'ts

### Do:
- **Do** draw anything that exists as a solid pearl stroke and anything not built as a 2px `dash` stroke with a 6/9 dash (The Live-or-Dashed Rule).
- **Do** keep the whole page on obsidian and separate sections with a 1px `rule` hairline.
- **Do** set every measured value, command and timecode in the system monospace with tabular numerals.
- **Do** use the global focus ring: 2px yellow outline, 3px offset.
- **Do** animate only to explain the diagram, on `cubic-bezier(0.16, 1, 0.3, 1)`, and remove it under `prefers-reduced-motion`.
- **Do** keep the action (command plus green button) inside the first viewport at desktop sizes, and put it before the diagram below 62rem.

### Don't:
- **Don't** load a web font, a script, an image or video file, or anything from a third party; don't use inline style attributes. Draw with CSS and inline SVG.
- **Don't** fill anything but the one primary action with green.
- **Don't** use yellow as a panel fill or for the action button.
- **Don't** add shadows to anything other than the program frame.
- **Don't** introduce colours outside this token set.
- **Don't** draw a not-built source, feature or step in solid pearl, or set an unmeasured value in the monospace.
