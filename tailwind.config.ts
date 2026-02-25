import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: "#137fec",
                "background-light": "#f6f7f8",
                "background-dark": "#101922"
            },
            fontFamily: {
                display: ["Inter", "sans-serif"]
            }
        },
    },
    plugins: [],
}
export default config
