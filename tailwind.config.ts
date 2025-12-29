import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.145 0 0)",
        card: "oklch(0.98 0 0)",
        "card-foreground": "oklch(0.145 0 0)",
        popover: "oklch(1 0 0)",
        "popover-foreground": "oklch(0.145 0 0)",
        primary: "oklch(0.145 0 0)",
        "primary-foreground": "oklch(1 0 0)",
        secondary: "oklch(0.96 0 0)",
        "secondary-foreground": "oklch(0.145 0 0)",
        muted: "oklch(0.96 0 0)",
        "muted-foreground": "oklch(0.45 0 0)",
        accent: "oklch(0.85 0.2 105)",
        "accent-foreground": "oklch(1 0 0)",
        destructive: "oklch(0.577 0.245 27.325)",
        "destructive-foreground": "oklch(1 0 0)",
        border: "oklch(0.9 0 0)",
        input: "oklch(0.9 0 0)",
        ring: "oklch(0.85 0.2 105)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
