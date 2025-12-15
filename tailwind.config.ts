/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // toggled with .dark on <html> or <body>
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--color-background) / <alpha-value>)",
        foreground: "hsl(var(--color-foreground) / <alpha-value>)",

        card: "hsl(var(--color-card) / <alpha-value>)",
        "card-foreground": "hsl(var(--color-card-foreground) / <alpha-value>)",

        popover: "hsl(var(--color-popover) / <alpha-value>)",
        "popover-foreground": "hsl(var(--color-popover-foreground) / <alpha-value>)",

        primary: "hsl(var(--color-primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--color-primary-foreground) / <alpha-value>)",

        secondary: "hsl(var(--color-secondary) / <alpha-value>)",
        "secondary-foreground": "hsl(var(--color-secondary-foreground) / <alpha-value>)",

        muted: "hsl(var(--color-muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--color-muted-foreground) / <alpha-value>)",

        accent: "hsl(var(--color-accent) / <alpha-value>)",
        "accent-foreground": "hsl(var(--color-accent-foreground) / <alpha-value>)",

        destructive: "hsl(var(--color-destructive) / <alpha-value>)",
        "destructive-foreground": "hsl(var(--color-destructive-foreground) / <alpha-value>)",

        border: "hsl(var(--color-border) / <alpha-value>)",
        input: "hsl(var(--color-input) / <alpha-value>)",
        "input-background": "hsl(var(--color-input-background) / <alpha-value>)",
        "switch-background": "hsl(var(--color-switch-background) / <alpha-value>)",
        ring: "hsl(var(--color-ring) / <alpha-value>)",

        // Sidebar
        sidebar: "hsl(var(--color-sidebar) / <alpha-value>)",
        "sidebar-foreground": "hsl(var(--color-sidebar-foreground) / <alpha-value>)",
        "sidebar-primary": "hsl(var(--color-sidebar-primary) / <alpha-value>)",
        "sidebar-primary-foreground": "hsl(var(--color-sidebar-primary-foreground) / <alpha-value>)",
        "sidebar-accent": "hsl(var(--color-sidebar-accent) / <alpha-value>)",
        "sidebar-accent-foreground": "hsl(var(--color-sidebar-accent-foreground) / <alpha-value>)",
        "sidebar-border": "hsl(var(--color-sidebar-border) / <alpha-value>)",
        "sidebar-ring": "hsl(var(--color-sidebar-ring) / <alpha-value>)",

        // Charts
        "chart-1": "hsl(var(--color-chart-1) / <alpha-value>)",
        "chart-2": "hsl(var(--color-chart-2) / <alpha-value>)",
        "chart-3": "hsl(var(--color-chart-3) / <alpha-value>)",
        "chart-4": "hsl(var(--color-chart-4) / <alpha-value>)",
        "chart-5": "hsl(var(--color-chart-5) / <alpha-value>)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        DEFAULT: "0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)",
        md: "0 6px 12px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)",
        lg: "0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"), // optional, improves <input>, <select>, etc
  ],
};
