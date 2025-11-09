# Dionix Portal Design System

## Overview

This document outlines the design system for the Dionix Portal, providing a comprehensive guide to colors, typography, spacing, shadows, and other design tokens used throughout the application.

## Color System

The design system uses **OKLCH** color space for better perceptual uniformity and color manipulation. All colors are defined as CSS custom properties that automatically adapt to light and dark themes.

### Light Theme Colors

- **Background**: `oklch(0.9551 0 0)` - Soft off-white
- **Foreground**: `oklch(0.3211 0 0)` - Dark gray text
- **Primary**: `oklch(0.4891 0 0)` - Medium gray
- **Secondary**: `oklch(0.9067 0 0)` - Light gray
- **Muted**: `oklch(0.8853 0 0)` - Subtle background
- **Accent**: `oklch(0.8078 0 0)` - Light accent
- **Destructive**: `oklch(0.5594 0.1900 25.8625)` - Red for errors/destructive actions
- **Border**: `oklch(0.8576 0 0)` - Subtle borders
- **Input**: `oklch(0.9067 0 0)` - Input field backgrounds

### Dark Theme Colors

- **Background**: `oklch(0.2178 0 0)` - Deep dark
- **Foreground**: `oklch(0.8853 0 0)` - Light text
- **Primary**: `oklch(0.7058 0 0)` - Light gray
- **Secondary**: `oklch(0.3092 0 0)` - Dark gray
- **Muted**: `oklch(0.2850 0 0)` - Subtle dark background
- **Accent**: `oklch(0.3715 0 0)` - Dark accent
- **Destructive**: `oklch(0.6591 0.1530 22.1703)` - Bright red
- **Border**: `oklch(0.3290 0 0)` - Dark borders
- **Input**: `oklch(0.3092 0 0)` - Dark input backgrounds

### Chart Colors

The system includes 5 chart colors for data visualization:
- **Chart 1**: Primary chart color
- **Chart 2**: Secondary chart color (with hue)
- **Chart 3-5**: Additional chart colors for multi-series charts

## Typography

### Font Families

- **Sans-serif (Light Mode)**: Montserrat
- **Sans-serif (Dark Mode)**: Inter
- **Serif**: Georgia (fallback)
- **Monospace**: Fira Code

Fonts are loaded via Next.js font optimization for optimal performance.

### Font Variables

- `--font-sans`: Automatically switches between Montserrat (light) and Inter (dark)
- `--font-serif`: Georgia
- `--font-mono`: Fira Code

## Spacing & Layout

- **Base Spacing Unit**: `0.25rem` (4px)
- **Border Radius**: `0.35rem` (5.6px)
- **Radius Variants**:
  - `--radius-sm`: `calc(var(--radius) - 4px)`
  - `--radius-md`: `calc(var(--radius) - 2px)`
  - `--radius-lg`: `var(--radius)`
  - `--radius-xl`: `calc(var(--radius) + 4px)`

## Shadow System

The design system includes a comprehensive shadow system with multiple levels:

- **shadow-2xs**: `0px 2px 0px 0px hsl(0 0% 20% / 0.07)`
- **shadow-xs**: `0px 2px 0px 0px hsl(0 0% 20% / 0.07)`
- **shadow-sm**: `0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 1px 2px -1px hsl(0 0% 20% / 0.15)`
- **shadow**: `0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 1px 2px -1px hsl(0 0% 20% / 0.15)`
- **shadow-md**: `0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 2px 4px -1px hsl(0 0% 20% / 0.15)`
- **shadow-lg**: `0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 4px 6px -1px hsl(0 0% 20% / 0.15)`
- **shadow-xl**: `0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 8px 10px -1px hsl(0 0% 20% / 0.15)`
- **shadow-2xl**: `0px 2px 0px 0px hsl(0 0% 20% / 0.38)`

All shadows use a consistent offset pattern with a 2px vertical offset for depth.

## Sidebar Theme

The sidebar has its own color tokens for consistent theming:

- **Sidebar Background**: Lighter than main background
- **Sidebar Foreground**: Text color
- **Sidebar Primary**: Primary action color
- **Sidebar Accent**: Accent color
- **Sidebar Border**: Border color
- **Sidebar Ring**: Focus ring color

## Usage in Components

### Using Colors

```tsx
// In Tailwind classes
<div className="bg-background text-foreground">
<div className="bg-primary text-primary-foreground">
<div className="border-border">

// In CSS
.my-component {
  background: var(--background);
  color: var(--foreground);
  border: 1px solid var(--border);
}
```

### Using Typography

```tsx
// In Tailwind classes
<p className="font-sans">Sans-serif text</p>
<code className="font-mono">Monospace code</p>

// In CSS
.text {
  font-family: var(--font-sans);
}
```

### Using Shadows

```tsx
// In Tailwind classes
<div className="shadow-sm">
<div className="shadow-md">
<div className="shadow-lg">

// In CSS
.card {
  box-shadow: var(--shadow-md);
}
```

### Using Radius

```tsx
// In Tailwind classes
<div className="rounded-lg">
<div className="rounded-xl">

// In CSS
.button {
  border-radius: var(--radius-lg);
}
```

## Theme Switching

The design system automatically switches between light and dark themes based on the `.dark` class on the root element. The `ThemeProvider` component handles this automatically.

## Design Principles

1. **Perceptual Uniformity**: Using OKLCH color space ensures colors appear consistent across different contexts
2. **Accessibility**: All color combinations meet WCAG contrast requirements
3. **Consistency**: Unified spacing, typography, and shadow system across all components
4. **Performance**: Fonts are optimized via Next.js font loading
5. **Flexibility**: CSS custom properties allow easy theme customization

## Customization

To customize the design system, modify the CSS custom properties in `app/globals.css`. Changes will automatically propagate throughout the application.

## Browser Support

- Modern browsers with CSS custom properties support
- OKLCH color space support (with fallbacks)
- Next.js font optimization for optimal font loading

