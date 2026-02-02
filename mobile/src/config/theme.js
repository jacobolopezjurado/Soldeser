// Tema de la aplicación - Estética industrial/construcción
export const colors = {
  // Colores principales
  primary: '#E85D04',      // Naranja construcción/seguridad
  primaryDark: '#DC2F02',
  primaryLight: '#F48C06',
  
  // Fondo oscuro elegante
  background: '#0D1117',
  backgroundSecondary: '#161B22',
  surface: '#21262D',
  surfaceLight: '#30363D',
  
  // Texto
  text: '#F0F6FC',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',
  
  // Estados
  success: '#3FB950',
  successLight: '#238636',
  warning: '#D29922',
  error: '#F85149',
  errorLight: '#DA3633',
  info: '#58A6FF',
  
  // Otros
  border: '#30363D',
  divider: '#21262D',
  overlay: 'rgba(0, 0, 0, 0.6)',
  
  // Fichaje
  clockIn: '#3FB950',
  clockOut: '#F85149',
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
