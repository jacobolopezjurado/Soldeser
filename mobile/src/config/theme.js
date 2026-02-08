// Tema de la aplicación - Colores del logo Soldeser
// Paleta: azul corporativo (#1E3A5F) + naranja acento (#E85D04)
export const colors = {
  // Colores principales del logo
  primary: '#1E3A5F',       // Azul Soldeser
  primaryDark: '#152942',
  primaryLight: '#2A5190',
  
  // Acento naranja (del logo)
  accent: '#E85D04',
  accentDark: '#DC2F02',
  accentLight: '#F48C06',
  
  // Fondos
  background: '#0F1729',
  backgroundSecondary: '#1E3A5F',
  surface: '#1A2D4A',
  surfaceLight: '#243B5C',
  
  // Texto (contraste alto sobre fondos oscuros)
  text: '#FFFFFF',
  textSecondary: '#B8C5D6',
  textMuted: '#8B9CB0',
  
  // Estados
  success: '#22C55E',
  successLight: '#4ADE80',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#F87171',
  info: '#3B82F6',
  
  // Otros
  border: '#334155',
  divider: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.6)',
  
  // Fichaje
  clockIn: '#22C55E',
  clockOut: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  // Usando fuentes del sistema con fallbacks
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'Courier',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    hero: 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};

// Aliases para compatibilidad
export const COLORS = colors;
export const FONTS = {
  ...typography.fontFamily,
  semiBold: 'System',
};
