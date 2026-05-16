---
name: Atmospheric Glass
colors:
  surface: '#0b0c3d'
  surface-dim: '#0b0c3d'
  surface-bright: '#333465'
  surface-container-lowest: '#060538'
  surface-container-low: '#141545'
  surface-container: '#191a4a'
  surface-container-high: '#232555'
  surface-container-highest: '#2e3060'
  on-surface: '#e1e0ff'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e0ff'
  inverse-on-surface: '#2a2b5b'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#ebb2ff'
  on-secondary: '#520071'
  secondary-container: '#721199'
  on-secondary-container: '#e299ff'
  tertiary: '#fff6ed'
  on-tertiary: '#402d00'
  tertiary-container: '#ffd682'
  on-tertiary-container: '#7b5b00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f8d8ff'
  secondary-fixed-dim: '#ebb2ff'
  on-secondary-fixed: '#320047'
  on-secondary-fixed-variant: '#721199'
  tertiary-fixed: '#ffdfa0'
  tertiary-fixed-dim: '#fbbc00'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#0b0c3d'
  on-background: '#e1e0ff'
  surface-variant: '#2e3060'
typography:
  display-temp:
    fontFamily: Inter
    fontSize: 96px
    fontWeight: '700'
    lineHeight: 100px
    letterSpacing: -0.04em
  display-temp-mobile:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
---

## Brand & Style
The design system is centered on an immersive, "window-to-the-world" experience. It utilizes **Glassmorphism** to create a sense of depth and environmental atmosphere, mimicking the physical properties of light through vapor and ice. 

The aesthetic is futuristic yet approachable, designed to evoke a sense of calm and clarity regardless of the weather conditions. By layering translucent surfaces over vibrant, atmospheric backgrounds, the UI feels lightweight and dynamic. It targets a modern audience that values data density presented with high-end aesthetic polish.

## Colors
The palette is built to reflect the sky's shifting states. 

- **Primary (Vibrant Cyan):** Used for active states, highlights, and high-priority weather data.
- **Secondary (Stormy Violet):** Used for atmospheric depth and stormy weather alerts.
- **Neutral (Deep Indigo):** Serves as the base canvas for dark mode, providing a high-contrast foundation for glass layers.
- **Light Mode Transition:** In light mode, the system shifts to crisp whites and soft cerulean (#87CEEB), maintaining the glass effect through subtle shadows rather than dark blurs.

Semantic colors change the "mood" of the interface dynamically based on the current weather report, affecting background gradients and glow effects.

## Typography
The typography system uses **Inter** for its exceptional legibility and neutral, modern character. 

The hierarchy is dominated by the `display-temp` style, which provides the primary anchor for the dashboard. Tight letter spacing on large displays ensures a "tech-forward" look. Secondary data (wind speed, AQI) uses `label-caps` to distinguish meta-information from primary atmospheric readings. On mobile devices, temperature displays scale down to ensure the layout remains within safe margins while maintaining its visual impact.

## Layout & Spacing
The layout follows a **fluid grid** model that emphasizes breathing room. 

- **Desktop:** A 12-column grid with generous 24px margins. Metrics are housed in a sidebar or a bottom-docked grid, while the primary weather visualization occupies the central or left-most 8 columns.
- **Tablet/Mobile:** Content reflows into a single-column stack. The temperature display remains fixed at the top, while detailed cards scroll horizontally (carousel style) or vertically depending on data importance.
- **Spacing:** A strict 8px rhythm governs all internal component padding to maintain a systematic feel amidst the soft glass textures.

## Elevation & Depth
Depth is achieved through **Backdrop Filtering** and **Multi-layered Shadows**. 

1.  **Base Layer:** Dynamic gradient background representing the sky.
2.  **Glass Layer:** 20px - 40px backdrop blur with a 10% white (light mode) or 5% white (dark mode) fill.
3.  **Stroke:** A 1px "inner-glow" border (white at 20% opacity) is applied to the top and left edges of cards to simulate light hitting a glass edge.
4.  **Shadows:** Shadows are highly diffused and tinted with the background's primary hue (e.g., a soft indigo shadow in dark mode) to prevent the "dirty" look of pure black shadows on glass.

## Shapes
This design system uses a pronounced **roundedness level (2)** to soften the technical nature of the data. 

- **Primary Cards:** 24px (1.5rem) corner radius.
- **Inner Elements/Buttons:** 12px (0.75rem) corner radius.
- **Search Inputs:** Fully pill-shaped to distinguish interactive input from static data containers.

The consistency of the 24px radius across all main dashboard modules creates a cohesive "bento box" aesthetic.

## Components
- **Glass Search Bar:** A pill-shaped container with a high backdrop blur (30px) and a subtle 1px border. The search icon should have a primary cyan glow when active.
- **Metric Cards (AQI, Wind, Humidity):** These use the standard 24px rounded glass container. Icons within these cards are simplified and use a dual-tone (Primary + Low Opacity Primary) style.
- **Animated Weather Icons:** Vector-based icons with subtle CSS or Lottie animations (e.g., drifting clouds, pulsing sun rays). They should appear "above" the glass, casting a very soft shadow onto the card surface.
- **Temperature Toggle:** A glass-morphic segmented control for switching between Celsius and Fahrenheit, using a primary-colored glow to indicate the selection.
- **Lists (Hourly Forecast):** Horizontal scrolling lists where each hour is a mini-glass card. The "current" hour should be highlighted with a higher opacity border or a subtle cyan glow underneath.
- **Interactive Gauges:** For AQI or UV Index, use semi-circular glass tracks with a vibrant, glowing progress indicator.