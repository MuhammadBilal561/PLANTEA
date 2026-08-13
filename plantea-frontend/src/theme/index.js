export const COLORS = {
  p900: '#0B2E1A',
  p800: '#1A4731',
  p700: '#276044',
  p600: '#317854',
  p500: '#3A8C62',
  p400: '#52A87D',
  p300: '#8ECBA8',
  p200: '#B8E0CB',
  p100: '#D6F0E2',
  p50:  '#EDF8F3',
  org:  '#F07D3A',
  red:  '#E5493A',
  yel:  '#F5B731',
  bg:   '#F5F7F5',
  white: '#FFFFFF',
  t1:   '#111B15',
  t2:   '#3D5448',
  t3:   '#7A9487',
  t4:   '#B5CAC0',
  // semantic
  info: '#2F6FED',
  success: '#1E9E5A',
  warning: '#E5A32F',
  danger: '#E5493A',
  overlay: 'rgba(11, 46, 26, 0.55)',
  border: '#E6EDE8',
  divider: '#EDF2EE',
  star: '#F5B731',
  verified: '#1E9E5A',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const RADII = {
  xs: 6,
  sm: 10,
  card: 20,
  btn: 14,
  chip: 50,
  full: 999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#0A2814',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  strong: {
    shadowColor: '#0A2814',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
};

export const FONTS = {
  sora: 'Sora_400Regular',
  soraBold: 'Sora_700Bold',
  soraExtraBold: 'Sora_800ExtraBold',
  nunito: 'Nunito_400Regular',
  nunitoBold: 'Nunito_700Bold',
  nunitoExtraBold: 'Nunito_800ExtraBold',
};

// Reusable gradient pairs for plant cards / hero sections
export const GRADIENTS = {
  mint: ['#E8F5E9', '#C8E6C9'],
  lavender: ['#F3F0FF', '#DDD6FE'],
  sky: ['#E0F2FE', '#BAE6FD'],
  peach: ['#FFF7ED', '#FED7AA'],
  hero: ['#0B2E1A', '#276044'],
};

export const GRADIENT_CYCLE = [GRADIENTS.mint, GRADIENTS.lavender, GRADIENTS.sky, GRADIENTS.peach];
