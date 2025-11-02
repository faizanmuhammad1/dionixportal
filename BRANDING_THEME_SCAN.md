# DIONIX Portal - Complete Branding & Theme Scan

## 🎨 Brand Identity

### Company Name
- **Brand Name**: `dionix.ai` / `Dionix.ai`
- **Full Name**: DIONIX Portal
- **Usage**: Consistent across all components and metadata

### Brand Assets

#### Logo Files
Located in `/public/images/`:
- `logo.svg` - Light mode logo
- `darklogo.svg` - Dark mode logo  
- `main-logo.svg` - Alternative logo variant

#### Logo Implementation
- **Login Form** (`components/login-form.tsx`): 
  - Displays logo in themed container with backdrop blur
  - Switches between light/dark logos based on theme
  - Size: 16x16 container (w-16 h-16)

- **Dashboard Layout** (`components/dashboard-layout.tsx`):
  - Logo displayed in:
    - Desktop sidebar (top)
    - Mobile header
    - Sidebar overlay
  - Always shows "dionix.ai" text next to logo
  - Size: 24x24 pixels (w-6 h-6)

---

## 🎭 Theme System

### Theme Provider
- **Library**: `next-themes`
- **Component**: `components/theme-provider.tsx`
- **Configuration** (`app/layout.tsx`):
  - `defaultTheme="system"` - Follows system preference
  - `enableSystem` - Enables system detection
  - `disableTransitionOnChange` - Prevents transition flash
  - `attribute="class"` - Uses class-based theming

### Theme Toggle
- **Component**: `components/theme-toggle.tsx`
- **Location**: Dashboard header (mobile & desktop)
- **Icons**: Sun (light) / Moon (dark) from lucide-react
- **Animation**: Smooth rotation and scale transitions

---

## 🎨 Color System

### Color Palette (OKLCH Format)

#### Light Mode (`:root`)
```css
--background: oklch(1 0 0);                    /* Pure white */
--foreground: oklch(0.145 0 0);               /* Near black */
--primary: oklch(0.205 0 0);                   /* Dark gray/black */
--primary-foreground: oklch(0.985 0 0);        /* Near white */
--secondary: oklch(0.97 0 0);                   /* Very light gray */
--secondary-foreground: oklch(0.205 0 0);      /* Dark gray */
--muted: oklch(0.97 0 0);                       /* Light gray */
--muted-foreground: oklch(0.556 0 0);           /* Medium gray */
--accent: oklch(0.97 0 0);                      /* Light gray */
--destructive: oklch(0.577 0.245 27.325);      /* Red-orange */
--border: oklch(0.922 0 0);                     /* Light border */
--input: oklch(0.922 0 0);                      /* Input border */
--ring: oklch(0.708 0 0);                       /* Focus ring */
```

#### Dark Mode (`.dark`)
```css
--background: oklch(0.145 0 0);                 /* Near black */
--foreground: oklch(0.985 0 0);                /* Near white */
--primary: oklch(0.985 0 0);                    /* White */
--primary-foreground: oklch(0.205 0 0);        /* Dark gray */
--secondary: oklch(0.269 0 0);                  /* Dark gray */
--muted: oklch(0.269 0 0);                      /* Dark gray */
--muted-foreground: oklch(0.708 0 0);           /* Light gray */
--accent: oklch(0.269 0 0);                     /* Dark gray */
--destructive: oklch(0.396 0.141 25.723);      /* Dark red */
--border: oklch(0.269 0 0);                     /* Dark border */
--ring: oklch(0.439 0 0);                       /* Light focus ring */
```

#### Chart Colors
**Light Mode:**
- Chart 1: `oklch(0.646 0.222 41.116)` - Orange-red
- Chart 2: `oklch(0.6 0.118 184.704)` - Blue
- Chart 3: `oklch(0.398 0.07 227.392)` - Purple-blue
- Chart 4: `oklch(0.828 0.189 84.429)` - Yellow-green
- Chart 5: `oklch(0.769 0.188 70.08)` - Yellow

**Dark Mode:**
- Chart 1: `oklch(0.488 0.243 264.376)` - Purple
- Chart 2: `oklch(0.696 0.17 162.48)` - Cyan-blue
- Chart 3: `oklch(0.769 0.188 70.08)` - Yellow
- Chart 4: `oklch(0.627 0.265 303.9)` - Magenta-purple
- Chart 5: `oklch(0.645 0.246 16.439)` - Orange

#### Sidebar Colors
- Light sidebar: `oklch(0.985 0 0)` (near white)
- Dark sidebar: `oklch(0.205 0 0)` (dark gray)
- Sidebar primary (dark): `oklch(0.488 0.243 264.376)` (purple accent)

### Border Radius
- `--radius: 0.625rem` (10px base)
- `--radius-sm: calc(var(--radius) - 4px)` (6px)
- `--radius-md: calc(var(--radius) - 2px)` (8px)
- `--radius-lg: var(--radius)` (10px)
- `--radius-xl: calc(var(--radius) + 4px)` (14px)

---

## 🔤 Typography

### Font Family
- **Primary Font**: Geist Sans (`--font-geist-sans`)
- **Monospace Font**: Geist Mono (`--font-geist-mono`)
- **Source**: `geist` package (Vercel font)

### Font Usage
- Applied via CSS variables in `app/globals.css`
- Set in root layout: `${GeistSans.variable} ${GeistMono.variable}`
- Class: `antialiased` for smooth rendering

---

## 🎯 Brand Usage Throughout Project

### Metadata
- **Page Title**: "dionix.ai Dashboard"
- **Description**: "Professional admin and employee dashboard for dionix.ai"
- **Favicon**: `/favicon.ico` (multiple sizes)

### Email Domains
- Primary: `@dionix.ai`
- Examples: `admin@dionix.ai`, `faizan@dionix.ai`
- SMTP From: `noreply@dionix.ai`

### Allowed Origins
- `https://dionix.ai`
- `https://portal.dionix.ai`

### Component Branding

#### Login Form
- Gradient background: `from-slate-50 via-blue-50 to-slate-100` (light)
- Dark gradient: `from-slate-950 via-blue-950 to-slate-900` (dark)
- Animated gradient orbs (blue, purple, pink)
- Glass morphism card effect
- Logo in primary-colored container

#### Dashboard Layout
- Brand name: "dionix.ai" in sidebar and headers
- Consistent logo placement
- Theme toggle in header

#### Status Badges
- **Active**: Green (`bg-green-100 text-green-800`)
- **Completed**: Blue (`bg-blue-100 text-blue-800`)
- **On Hold**: Yellow (`bg-yellow-100 text-yellow-800`)
- **In Progress**: Blue (`bg-blue-100 text-blue-800`)
- **Review**: Purple (`bg-purple-100 text-purple-800`)
- **High Priority**: Red (`bg-red-100 text-red-800`)
- **Medium Priority**: Orange (`bg-orange-100 text-orange-800`)

---

## ✨ Design System Features

### Animations
- **fadeIn**: Opacity 0 → 1
- **slideInUp**: Translate Y +10px → 0
- **slideInDown**: Translate Y -10px → 0
- **scaleIn**: Scale 0.95 → 1
- **blob**: Animated gradient orbs (7s infinite)
- **pulse-subtle**: Opacity pulse (2s infinite)
- **shimmer**: Loading skeleton animation

### Effects
- **Glass Morphism**: `backdrop-filter: blur(10px)` with semi-transparent background
- **Card Hover**: Lift effect with shadow (`translateY(-2px)`)
- **Smooth Transitions**: `cubic-bezier(0.4, 0, 0.2, 1)` (0.3s)

### Scrollbars
- **Width**: 8px (thin)
- **Color**: Muted foreground with opacity
- **Hover**: Increased opacity

### Custom Classes
- `.card-hover` - Card lift effect on hover
- `.glass-morphism` - Glass effect
- `.skeleton` - Loading skeleton
- `.animate-fade-in` - Fade animation
- `.animate-slide-in-up` - Slide up animation
- `.animate-slide-in-down` - Slide down animation
- `.animate-scale-in` - Scale animation
- `.loading-pulse` - Pulse animation

---

## 📍 Brand References in Code

### Files with Brand References
1. `app/layout.tsx` - Metadata & theme setup
2. `app/globals.css` - Color system & animations
3. `components/login-form.tsx` - Login branding
4. `components/dashboard-layout.tsx` - Dashboard branding
5. `components/theme-provider.tsx` - Theme system
6. `components/theme-toggle.tsx` - Theme switcher
7. `lib/auth.ts` - User email domains
8. `lib/api-middleware.ts` - Allowed origins
9. `env.example` - Environment configuration

### Service Type: "Branding"
The project includes a "branding" service type for client submissions:
- **Fields**: Logo ideas, Color & Brand Theme
- **Used in**: Project creation, client submissions
- **Database fields**: `logo_ideas`, `color_preferences`

---

## 🔍 Brand Consistency Checklist

✅ **Logo Usage**
- [x] Light and dark variants available
- [x] Consistent sizing (24x24 in headers, 16x16 in login)
- [x] Proper alt text ("Dionix.ai")
- [x] Theme-aware switching

✅ **Color System**
- [x] OKLCH color format for accuracy
- [x] Complete light/dark theme support
- [x] Semantic color variables
- [x] Consistent chart colors

✅ **Typography**
- [x] Geist Sans for body text
- [x] Geist Mono for code
- [x] Consistent font weights and sizes

✅ **Theme Support**
- [x] System preference detection
- [x] Manual toggle available
- [x] Smooth transitions
- [x] No flash on load

✅ **Brand Text**
- [x] Consistent "dionix.ai" capitalization
- [x] Used in metadata, headers, and descriptions
- [x] Email domains follow pattern

---

## 🎨 Brand Recommendations

### Current Strengths
1. ✅ Modern OKLCH color system
2. ✅ Comprehensive theme support
3. ✅ Consistent logo usage
4. ✅ Professional animations
5. ✅ Accessible color contrast

### Potential Improvements
1. Consider adding brand-specific accent colors (beyond grayscale)
2. Add favicon variants for different themes
3. Create brand guidelines document
4. Consider brand-specific gradients beyond generic colors
5. Add brand watermark/logo in footers if needed

---

## 📝 Quick Reference

**Brand Name**: `dionix.ai`  
**Logo Path**: `/images/logo.svg` (light), `/images/darklogo.svg` (dark)  
**Theme**: System-aware dark/light mode  
**Primary Color**: Grayscale (monochrome theme)  
**Font**: Geist Sans  
**Design Style**: Modern, minimalist, glass-morphism

---

*Last Scanned: Complete project scan*
*Theme System: next-themes with OKLCH colors*
*Brand Identity: DIONIX.ai - Professional dashboard platform*

