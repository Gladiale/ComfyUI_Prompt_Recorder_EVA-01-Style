/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // 初号機パレット
        eva: {
          'purple-deep': '#2a0a4a',
          purple: '#5b1f8e',
          'purple-bright': '#8a3fc8',
          green: '#39ff14',
          'green-soft': '#7dff5c',
          magenta: '#ff2e88',
          amber: '#ffcc33',
          'bg-void': '#070310',
          'bg-panel': '#0f0820',
          'bg-panel-2': '#160a2e',
          ink: '#e9dcff',
          'ink-dim': '#9a86c8',
          line: '#3a1f5e',
          'line-soft': '#241244',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        'cinzel-deco': ['"Cinzel Decorative"', 'serif'],
        garamond: ['"EB Garamond"', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 14px rgba(57,255,20,0.45)',
        'glow-purple': '0 0 22px rgba(138,63,200,0.45)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        flicker: 'flicker 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
