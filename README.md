# Yappin' - A Modern Social Media PWA

A lightweight, fast and modern Progressive Web Application (PWA) for sharing short thoughts called "Yaps".

## Features

- **Optimized Design**: Clean, modern UI with green-gray theme
- **Dark Mode Support**: Toggle between light and dark themes using the button in the header.
- **Responsive Layout**: Works on all devices with optimized mobile experience
- **Progressive Web App**: Installable on devices with offline support

## Development Notes

### CSS Structure

- `style.css`: Core styling
- `optimized.css`: Combined and optimized modern UI enhancements

### Testing

- `test-optimization.html`: Test page for dark mode and mobile layout optimization
- Access this page to verify that:
  - Dark mode properly styles the header and UI elements
  - Mobile layout properly adapts with bottom navigation bar

### Optimizations

The CSS was optimized by:
1. Combining `modern.css` and `modern-enhancements.css` into a single `optimized.css`
2. Ensuring proper dark mode colors for header and mobile navigation
3. Improving the contrast in dark mode
4. Enhancing touch targets for mobile users

### PWA Features

- Service worker caches essential assets
- Offline page available when network is unavailable
- Installable on desktop and mobile devices

### Dark Mode

- The dark mode can be toggled using the moon/sun icon in the header.
- User preference is saved in `localStorage` and applied on subsequent visits.
