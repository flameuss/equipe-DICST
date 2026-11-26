import { defineTheme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '../../astryx-themes';

export const ccstTheme = defineTheme({
  name: 'ccst-inpe',
  extends: themes[defaultThemeSlug],
  tokens: {
    '--color-accent': '#2563EB',
    '--color-text-accent': '#2563EB',
    '--color-background-body': '#FFFFFF',
    '--color-background-surface': '#F8FAFC',
    '--color-background-card': '#FFFFFF',
    '--color-text-primary': '#0F172A',
    '--color-text-secondary': '#475569',
  },
});
