import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#eff8ff",
          100: "#dff0ff",
          500: "#1e88e5",
          600: "#0b6fbe",
          900: "#0d2f4f"
        },
        leaf: {
          50: "#ecfdf4",
          100: "#d6f9e4",
          500: "#22a76f",
          600: "#16865a",
          900: "#0d3b2a"
        },
        ink: "#172033"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
