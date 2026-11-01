// Shared palettes for every generated SVG (GitHub light + dark).
export const themes = {
  dark: {
    bg: '#0d1117', panel: '#161b22', border: '#30363d', grid: '#21262d',
    text: '#e6edf3', muted: '#8b949e', green: '#3fb950', blue: '#58a6ff',
    purple: '#d2a8ff', orange: '#ffa657', red: '#ff7b72', string: '#a5d6ff',
    bar: '#2ea043', barDim: '#1b3a26',
  },
  light: {
    bg: '#ffffff', panel: '#f6f8fa', border: '#d0d7de', grid: '#eaeef2',
    text: '#1f2328', muted: '#656d76', green: '#1a7f37', blue: '#0969da',
    purple: '#8250df', orange: '#bc4c00', red: '#cf222e', string: '#0a3069',
    bar: '#2da44e', barDim: '#d1f0db',
  },
};

export const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
