# Cydon Framework Introduction Video

## Overview

A 3-minute video introducing the Cydon framework — a lightweight reactive web component library (~400 lines of TypeScript, zero dependencies). The video targets web developers, showcasing Cydon's philosophy, APIs, directives, and EMT template language.

## Colors

```yaml
colors:
  primary: "#0D1B2A"
  secondary: "#1B263B"
  accent: "#FCA311"
  on-primary: "#E0E1DD"
  muted: "#778DA9"
  code-bg: "#141F2D"
```

## Typography

```yaml
typography:
  headline:
    fontFamily: "DM Serif Display"
    fontSize: "4.5rem"
    fontWeight: 400
  body:
    fontFamily: "DM Sans"
    fontSize: "1.5rem"
    fontWeight: 400
  code:
    fontFamily: "JetBrains Mono"
    fontSize: "1.25rem"
    fontWeight: 400
  stat:
    fontFamily: "DM Sans"
    fontSize: "3.5rem"
    fontWeight: 700
  label:
    fontFamily: "DM Sans"
    fontSize: "1rem"
    fontWeight: 500
    letterSpacing: "0.12em"
    textTransform: "uppercase"
```

## Elevation

```yaml
depth: subtle
shadows:
  card: "0 4px 24px rgba(0,0,0,0.4)"
  glow: "0 0 60px rgba(252,163,17,0.15)"
  text-glow: "0 0 30px rgba(252,163,17,0.3)"
```

## Components

```yaml
rounded:
  card: 12px
  tag: 6px
  button: 8px
spacing:
  xs: 8px
  sm: 16px
  md: 32px
  lg: 64px
  xl: 120px
```

## Motion

```yaml
energy: medium-high
easing:
  entry: "power3.out"
  exit: "power3.in"
  ambient: "sine.inOut"
duration:
  entrance: 0.5
  stagger: 0.15
  transition: 0.6
  hold: 2.0
```

## Do's and Don'ts

- DO use golden accent (#FCA311) as the primary attention color
- DO keep backgrounds dark with subtle radial glows
- DO pair DM Serif Display headlines with DM Sans body text
- DO use JetBrains Mono for all code snippets
- DON'T use neon effects or overly saturated colors
- DON'T use light backgrounds — keep it dark and premium
- DON'T use Inter, Roboto, or other banned fonts
- DON'T use gradient text effects
