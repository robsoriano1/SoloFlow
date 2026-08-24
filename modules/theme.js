const parseHex = (hex) => {
  const clean = String(hex || '').replace('#', '');
  const normalized = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  const value = Number.parseInt(normalized, 16);
  return Number.isFinite(value) ? { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 } : { r: 0, g: 0, b: 0 };
};

const luminance = ({ r, g, b }) => {
  const channel = (value) => {
    const s = value / 255;
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
  };
  return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b);
};

export const contrastRatio = (foreground, background) => {
  const [a, b] = [luminance(parseHex(foreground)), luminance(parseHex(background))].sort((x, y) => y - x);
  return (a + .05) / (b + .05);
};

export function installThemeModule(store) {
  const root = document.documentElement;
  const applySemanticRgb = () => {
    const computed = getComputedStyle(root);
    ['danger', 'warning', 'success'].forEach((token) => {
      const rgb = parseHex(computed.getPropertyValue(`--${token}`).trim());
      root.style.setProperty(`--${token}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    });
    const bg = computed.getPropertyValue('--bg').trim();
    const text = computed.getPropertyValue('--text').trim();
    root.dataset.contrast = contrastRatio(text, bg) >= 4.5 ? 'aa' : 'needs-adjustment';
  };
  applySemanticRgb();
  const observer = new MutationObserver(applySemanticRgb);
  observer.observe(root, { attributes: true, attributeFilter: ['style', 'class'] });
  store.subscribe('settings', applySemanticRgb);
  return () => observer.disconnect();
}

