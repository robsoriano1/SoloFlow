const parseHex = (hex) => {
  const clean = String(hex || '').trim().replace('#', '');
  const normalized = clean.length === 3 ? [...clean].map((character) => character + character).join('') : clean;
  const value = Number.parseInt(normalized, 16);
  return Number.isFinite(value) && normalized.length === 6
    ? { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 }
    : { r: 0, g: 0, b: 0 };
};

const toHex = ({ r, g, b }) => `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
const mix = (base, tint, amount) => {
  const a = parseHex(base);
  const b = parseHex(tint);
  return toHex({ r: a.r + (b.r - a.r) * amount, g: a.g + (b.g - a.g) * amount, b: a.b + (b.b - a.b) * amount });
};

const luminance = ({ r, g, b }) => {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  };
  return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b);
};

export const contrastRatio = (foreground, background) => {
  const [lighter, darker] = [luminance(parseHex(foreground)), luminance(parseHex(background))].sort((a, b) => b - a);
  return (lighter + .05) / (darker + .05);
};

export const ThemeAccessibilityEngine = {
  parseHex,
  contrastRatio,
  safeText(background, preferred = '#F8FAFC') {
    if (contrastRatio(preferred, background) >= 4.5) return preferred;
    return ['#FFFFFF', '#F8FAFC', '#18181B', '#0A0A0A'].sort((a, b) => contrastRatio(b, background) - contrastRatio(a, background))[0];
  },
  normalize(preset) {
    const textColor = this.safeText(preset.bgColor, preset.textColor);
    const cardTextColor = this.safeText(preset.surfaceColor, preset.cardTextColor || textColor);
    const prefersLightText = contrastRatio('#FFFFFF', preset.surfaceColor) > contrastRatio('#111111', preset.surfaceColor);
    const tintTarget = prefersLightText ? '#FFFFFF' : '#000000';
    return {
      ...preset,
      textColor,
      cardTextColor,
      todoBg: preset.todoBg || mix(preset.surfaceColor, preset.primaryColor, .12),
      inprogBg: preset.inprogBg || mix(preset.surfaceColor, preset.secondaryAccent || preset.primaryColor, .18),
      doneBg: preset.doneBg || mix(preset.surfaceColor, '#10B981', .15),
      surfaceBorder: mix(preset.surfaceColor, tintTarget, prefersLightText ? .17 : .12),
      surfaceBorderStrong: mix(preset.surfaceColor, tintTarget, prefersLightText ? .28 : .22)
    };
  }
};

export const FONT_PRESETS = {
  signal: { name: 'Signal Grotesque', sample: 'Deliberate work', detail: 'Bricolage Grotesque · Schibsted Grotesk', display: "'Bricolage Grotesque', 'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif", body: "'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif", metric: "'Martian Mono', ui-monospace, SFMono-Regular, monospace" },
  broadsheet: { name: 'Broadsheet Editorial', sample: 'The daily ledger', detail: 'Literata · Instrument Sans', display: "'Literata', ui-serif, Georgia, serif", body: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif", metric: "'Geist Mono', ui-monospace, SFMono-Regular, monospace" },
  apparatus: { name: 'Apparatus Technical', sample: 'BUILT TO SHIP', detail: 'Syne · Schibsted Grotesk', display: "'Syne', ui-sans-serif, system-ui, sans-serif", body: "'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif", metric: "'Azeret Mono', ui-monospace, SFMono-Regular, monospace" },
  neo: { name: 'Minimalist Neo-Grotesque', sample: 'Quiet clarity', detail: 'Outfit · DM Mono', display: "'Outfit', sans-serif", body: "'Outfit', sans-serif", metric: "'DM Mono', monospace" },
  cyber: { name: 'Cyber / Industrial Mono', sample: 'SYSTEM READY', detail: 'Chakra Petch · Fira Code', display: "'Chakra Petch', sans-serif", body: "'Fira Code', monospace", metric: "'Fira Code', monospace" },
  executive: { name: 'Executive Editorial', sample: 'Decisive focus', detail: 'Fraunces · Manrope', display: "'Fraunces', serif", body: "'Manrope', sans-serif", metric: "'JetBrains Mono', monospace" },
  geometric: { name: 'Geometric Studio', sample: 'Shape the work', detail: 'Sora · DM Sans', display: "'Sora', sans-serif", body: "'DM Sans', sans-serif", metric: "'Space Mono', monospace" },
  humanist: { name: 'Humanist Warmth', sample: 'Made for people', detail: 'Epilogue · Public Sans', display: "'Epilogue', sans-serif", body: "'Public Sans', sans-serif", metric: "'IBM Plex Mono', monospace" },
  academic: { name: 'Classic Academic Focus', sample: 'Deep work, clearly', detail: 'Newsreader · Source Sans 3', display: "'Newsreader', serif", body: "'Source Sans 3', sans-serif", metric: "'JetBrains Mono', monospace" }
};

export const THEME_PRESETS = {
  graphiteEmber: { name: 'Graphite & Ember', bgColor: '#14110E', surfaceColor: '#1E1A16', textColor: '#F4EEE5', cardTextColor: '#F4EEE5', primaryColor: '#E2622F', secondaryAccent: '#EFB255', todoBg: '#2A231C', inprogBg: '#3A2718', doneBg: '#1F2C22' },
  parchmentInk: { name: 'Parchment & Ink', bgColor: '#F3EEE4', surfaceColor: '#FBF8F2', textColor: '#221F1A', cardTextColor: '#221F1A', primaryColor: '#9C3D2E', secondaryAccent: '#2F6B5E', todoBg: '#F1E6DC', inprogBg: '#F3E9D2', doneBg: '#E3EBE0' },
  blueprintNight: { name: 'Blueprint Night', bgColor: '#0A151E', surfaceColor: '#11212D', textColor: '#E4F0F5', cardTextColor: '#E4F0F5', primaryColor: '#BFD84A', secondaryAccent: '#5FA9C6', todoBg: '#182B38', inprogBg: '#1D3542', doneBg: '#16332C' },
  limestoneMoss: { name: 'Limestone & Moss', bgColor: '#ECEAE2', surfaceColor: '#F7F6F1', textColor: '#1E231F', cardTextColor: '#1E231F', primaryColor: '#3F6B3A', secondaryAccent: '#B4762B', todoBg: '#E6E8DF', inprogBg: '#F0E7D6', doneBg: '#DFE9DD' },
  midnightSlate: { name: 'Midnight Slate', bgColor: '#0F172A', surfaceColor: '#151E32', textColor: '#F8FAFC', cardTextColor: '#F8FAFC', primaryColor: '#6366F1', secondaryAccent: '#38BDF8', todoBg: '#202A44', inprogBg: '#292A52', doneBg: '#123A37' },
  emeraldFocus: { name: 'Emerald Focus', bgColor: '#071A15', surfaceColor: '#0E2820', textColor: '#ECFDF5', cardTextColor: '#ECFDF5', primaryColor: '#10B981', secondaryAccent: '#6EE7B7', todoBg: '#15342B', inprogBg: '#17483A', doneBg: '#0B5B43' },
  cyberSunset: { name: 'Cyber Sunset', bgColor: '#180D2B', surfaceColor: '#25133D', textColor: '#FFF7ED', cardTextColor: '#FFF7ED', primaryColor: '#F97316', secondaryAccent: '#FB7185', todoBg: '#352047', inprogBg: '#4A2438', doneBg: '#3D2B2B' },
  minimalistStudio: { name: 'Minimalist Studio', bgColor: '#F4F4F5', surfaceColor: '#FFFFFF', textColor: '#18181B', cardTextColor: '#18181B', primaryColor: '#18181B', secondaryAccent: '#71717A', todoBg: '#F4F4F5', inprogBg: '#E4E4E7', doneBg: '#D4D4D8' },
  nordicFrost: { name: 'Nordic Frost', bgColor: '#EAF4F8', surfaceColor: '#F8FCFE', textColor: '#163247', cardTextColor: '#163247', primaryColor: '#0EA5E9', secondaryAccent: '#67E8F9', todoBg: '#E0F2FE', inprogBg: '#D8EEF8', doneBg: '#DDF4EF' },
  oledBlack: { name: 'OLED Pure Black', bgColor: '#000000', surfaceColor: '#111111', textColor: '#FFFFFF', cardTextColor: '#FFFFFF', primaryColor: '#F59E0B', secondaryAccent: '#FBBF24' },
  tokyoNeon: { name: 'Tokyo Neon', bgColor: '#120E24', surfaceColor: '#1D1739', textColor: '#F8FAFC', cardTextColor: '#F8FAFC', primaryColor: '#06B6D4', secondaryAccent: '#EC4899' },
  nordicForest: { name: 'Nordic Forest', bgColor: '#0F1E19', surfaceColor: '#172E27', textColor: '#E4EFE9', cardTextColor: '#E4EFE9', primaryColor: '#EAB308', secondaryAccent: '#86A991' },
  dracula: { name: 'Dracula Classic', bgColor: '#282A36', surfaceColor: '#44475A', textColor: '#F8F8F2', cardTextColor: '#F8F8F2', primaryColor: '#BD93F9', secondaryAccent: '#FF79C6' },
  sepia: { name: 'Warm Sepia', bgColor: '#F5EBE1', surfaceColor: '#EDE0D2', textColor: '#3E2723', cardTextColor: '#3E2723', primaryColor: '#C05621', secondaryAccent: '#8B5E3C' },
  solarizedLight: { name: 'Solarized Light', bgColor: '#FDF6E3', surfaceColor: '#EEE8D5', textColor: '#657B83', cardTextColor: '#657B83', primaryColor: '#268BD2', secondaryAccent: '#2AA198' }
};

/* Registry defaults. Kept as named constants so the shipped look can evolve
   without scattering literal preset keys through the module. */
export const DEFAULT_FONT_KEY = 'signal';
export const DEFAULT_THEME_KEY = 'graphiteEmber';

function setInput(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value;
}

function applyDerivedTokens(preset) {
  const root = document.documentElement;
  const primary = parseHex(preset.primaryColor);
  const surface = parseHex(preset.surfaceColor);
  const canvas = parseHex(preset.bgColor);
  const secondary = parseHex(preset.secondaryAccent || preset.primaryColor);
  const setToken = (name, value) => { if (root.style.getPropertyValue(name).trim() !== String(value)) root.style.setProperty(name, value); };
  setToken('--primary-rgb', `${primary.r}, ${primary.g}, ${primary.b}`);
  setToken('--surface-rgb', `${surface.r}, ${surface.g}, ${surface.b}`);
  /* Canvas and secondary channels power the atmospheric gradient/grain layer
     without any component needing a literal color of its own. */
  setToken('--bg-rgb', `${canvas.r}, ${canvas.g}, ${canvas.b}`);
  setToken('--secondary-accent-rgb', `${secondary.r}, ${secondary.g}, ${secondary.b}`);
  root.dataset.themeMode = luminance(canvas) > .38 ? 'light' : 'dark';
  setToken('--surface-border', preset.surfaceBorder);
  setToken('--surface-border-strong', preset.surfaceBorderStrong);
  setToken('--secondary-accent', preset.secondaryAccent || preset.primaryColor);
  setToken('--focus-ring', `rgba(${primary.r}, ${primary.g}, ${primary.b}, .24)`);
  setToken('--primary-contrast-text', ThemeAccessibilityEngine.safeText(preset.primaryColor, '#FFFFFF'));
  root.dataset.contrast = contrastRatio(preset.textColor, preset.bgColor) >= 4.5 && contrastRatio(preset.cardTextColor, preset.surfaceColor) >= 4.5 ? 'aa' : 'adjusted';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preset.bgColor);
}

function renderFontCatalog(activeKey) {
  const catalog = document.getElementById('fontPresetCatalog');
  if (!catalog) return;
  catalog.replaceChildren(...Object.entries(FONT_PRESETS).map(([key, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'font-preset-button';
    button.dataset.font = key;
    button.classList.toggle('active', key === activeKey);
    button.setAttribute('aria-pressed', String(key === activeKey));
    const badge = document.createElement('span');
    badge.className = 'font-sample-badge';
    badge.style.fontFamily = preset.display;
    badge.textContent = 'Aa 42';
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = preset.name;
    name.style.fontFamily = preset.display;
    const sample = document.createElement('span');
    sample.textContent = `${preset.sample} · ${preset.detail}`;
    sample.style.fontFamily = preset.body;
    copy.append(name, sample);
    button.append(badge, copy);
    button.addEventListener('click', () => window.applyFontPreset(key));
    return button;
  }));
}

function renderThemeCatalog(activeKey) {
  const catalog = document.getElementById('themePresetCatalog');
  if (!catalog) return;
  catalog.replaceChildren(...Object.entries(THEME_PRESETS).map(([key, rawPreset]) => {
    const preset = ThemeAccessibilityEngine.normalize(rawPreset);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-preset-swatch';
    button.dataset.preset = key;
    button.classList.toggle('active', key === activeKey);
    button.setAttribute('aria-pressed', String(key === activeKey));
    button.title = `${preset.name} · AA contrast ${contrastRatio(preset.cardTextColor, preset.surfaceColor).toFixed(1)}:1`;
    const dots = document.createElement('span');
    dots.className = 'preset-dots';
    dots.style.background = `linear-gradient(135deg, ${preset.bgColor} 0 52%, ${preset.surfaceColor} 52% 72%, ${preset.primaryColor} 72%)`;
    const label = document.createElement('span');
    label.textContent = preset.name;
    button.append(dots, label);
    button.addEventListener('click', () => window.applyThemePreset(key));
    return button;
  }));
}

export function installThemeModule(store) {
  const root = document.documentElement;

  window.applyFontPreset = (key) => {
    const normalizedKey = FONT_PRESETS[key] ? key : DEFAULT_FONT_KEY;
    const preset = FONT_PRESETS[normalizedKey];
    window.activeFontPreset = normalizedKey;
    window.settings = { ...(window.settings || {}), fontPair: normalizedKey };
    localStorage.setItem('trackerSettings', JSON.stringify(window.settings));
    window.saveSettings?.();
    root.style.setProperty('--font-body', preset.body);
    root.style.setProperty('--font-display', preset.display);
    root.style.setProperty('--font-metric', preset.metric);
    document.body.style.fontFamily = preset.body;
    renderFontCatalog(normalizedKey);
    store.set('settings.fontPair', normalizedKey, { source: 'theme' });
  };

  window.applyThemePreset = (key) => {
    const normalizedKey = THEME_PRESETS[key] ? key : DEFAULT_THEME_KEY;
    const preset = ThemeAccessibilityEngine.normalize(THEME_PRESETS[normalizedKey]);
    window.activeThemePreset = normalizedKey;
    setInput('setBgColor', preset.bgColor);
    setInput('setSurfaceColor', preset.surfaceColor);
    setInput('setTextColor', preset.textColor);
    setInput('setCardTextColor', preset.cardTextColor);
    setInput('setPrimaryColor', preset.primaryColor);
    setInput('setTodoColor', preset.todoBg);
    setInput('setInprogColor', preset.inprogBg);
    setInput('setDoneColor', preset.doneBg);
    window.settings = { ...(window.settings || {}), themePreset: normalizedKey };
    window.saveSettings?.();
    applyDerivedTokens(preset);
    renderThemeCatalog(normalizedKey);
    store.set('settings.themePreset', normalizedKey, { source: 'theme' });
  };

  window.cycleSoloFlowTheme = () => {
    const keys = Object.keys(THEME_PRESETS);
    const index = Math.max(0, keys.indexOf(window.activeThemePreset));
    window.applyThemePreset(keys[(index + 1) % keys.length]);
  };

  const activeFont = FONT_PRESETS[window.settings?.fontPair] ? window.settings.fontPair : DEFAULT_FONT_KEY;
  const activeTheme = THEME_PRESETS[window.settings?.themePreset] ? window.settings.themePreset : DEFAULT_THEME_KEY;
  window.activeFontPreset = activeFont;
  window.activeThemePreset = activeTheme;
  window.settings = { ...(window.settings || {}), fontPair: activeFont, themePreset: activeTheme };
  renderFontCatalog(activeFont);
  renderThemeCatalog(activeTheme);
  const font = FONT_PRESETS[activeFont];
  root.style.setProperty('--font-body', font.body);
  root.style.setProperty('--font-display', font.display);
  root.style.setProperty('--font-metric', font.metric);
  document.body.style.fontFamily = font.body;
  applyDerivedTokens(ThemeAccessibilityEngine.normalize(THEME_PRESETS[activeTheme]));

  const persistedSaveSettings = window.saveSettings;
  window.saveSettings = function saveSettingsWithThemeEngine(...args) {
    const result = persistedSaveSettings?.apply(this, args);
    const activeFontPreset = FONT_PRESETS[window.activeFontPreset] || FONT_PRESETS[DEFAULT_FONT_KEY];
    const activeThemePreset = ThemeAccessibilityEngine.normalize(THEME_PRESETS[window.activeThemePreset] || THEME_PRESETS[DEFAULT_THEME_KEY]);
    root.style.setProperty('--font-body', activeFontPreset.body);
    root.style.setProperty('--font-display', activeFontPreset.display);
    root.style.setProperty('--font-metric', activeFontPreset.metric);
    document.body.style.fontFamily = activeFontPreset.body;
    applyDerivedTokens(activeThemePreset);
    return result;
  };

  const applySemanticRgb = () => {
    const computed = getComputedStyle(root);
    ['danger', 'warning', 'success'].forEach((token) => {
      const rgb = parseHex(computed.getPropertyValue(`--${token}`).trim());
      root.style.setProperty(`--${token}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    });
  };
  applySemanticRgb();
  let enforcementScheduled = false;
  const observer = new MutationObserver(() => {
    if (enforcementScheduled) return;
    enforcementScheduled = true;
    queueMicrotask(() => {
      enforcementScheduled = false;
      const fontKey = FONT_PRESETS[window.settings?.fontPair] ? window.settings.fontPair : window.activeFontPreset;
      const themeKey = THEME_PRESETS[window.settings?.themePreset] ? window.settings.themePreset : window.activeThemePreset;
      const expectedFont = FONT_PRESETS[fontKey] || FONT_PRESETS[DEFAULT_FONT_KEY];
      window.activeFontPreset = fontKey;
      window.activeThemePreset = themeKey;
      if (root.style.getPropertyValue('--font-body').trim() !== expectedFont.body) root.style.setProperty('--font-body', expectedFont.body);
      if (root.style.getPropertyValue('--font-display').trim() !== expectedFont.display) root.style.setProperty('--font-display', expectedFont.display);
      if (root.style.getPropertyValue('--font-metric').trim() !== expectedFont.metric) root.style.setProperty('--font-metric', expectedFont.metric);
      document.body.style.fontFamily = expectedFont.body;
      applyDerivedTokens(ThemeAccessibilityEngine.normalize(THEME_PRESETS[themeKey] || THEME_PRESETS[DEFAULT_THEME_KEY]));
      renderFontCatalog(fontKey);
      renderThemeCatalog(themeKey);
    });
  });
  observer.observe(root, { attributes: true, attributeFilter: ['style'] });
  store.subscribe('settings', applySemanticRgb);
  return { fonts: FONT_PRESETS, themes: THEME_PRESETS, accessibility: ThemeAccessibilityEngine, disconnect: () => observer.disconnect() };
}
