import { createTheme } from '@mui/material/styles';

export const Colors = {
  navy: '#0F1A2A',
  navyAlt: '#1A2332',
  navyLight: '#243044',
  gold: '#B8860B',
  goldLight: '#D4A93A',
  goldSoft: '#C9A961',
  cream: '#FFF8E7',
  creamAlt: '#F5EDD7',
  bg: '#F4F1E8',
  card: '#FFFFFF',
  cardAlt: '#FAF6EC',
  textPrimary: '#1A2332',
  textSecondary: '#5C6573',
  textMuted: '#8B92A0',
  textOnDark: '#FFFFFF',
  tierA: '#1A8B3E',
  tierB: '#B8860B',
  tierC: '#8B1A1A',
  success: '#1A8B3E',
  warning: '#D89614',
  danger: '#C0392B',
  info: '#2E5984',
  border: '#E8E2D4',
  borderLight: '#F0EBE0',
  black: '#000',
  white: '#fff',
};

export const Shadows = {
  sm: '0 1px 3px rgba(15,26,42,0.04)',
  md: '0 2px 8px rgba(15,26,42,0.06)',
  lg: '0 8px 24px rgba(15,26,42,0.08)',
};

const theme = createTheme({
  palette: {
    primary: { main: Colors.navy, light: Colors.navyLight, contrastText: '#fff' },
    secondary: { main: Colors.gold, light: Colors.goldLight, contrastText: '#fff' },
    success: { main: Colors.success },
    warning: { main: Colors.warning },
    error: { main: Colors.danger },
    info: { main: Colors.info },
    background: { default: Colors.bg, paper: Colors.card },
    text: { primary: Colors.textPrimary, secondary: Colors.textSecondary, disabled: Colors.textMuted },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.5px' },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '-0.3px' },
    h3: { fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.25rem', fontWeight: 500 },
    h4: { fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.125rem', fontWeight: 500 },
    h5: { fontFamily: '"Inter", sans-serif', fontSize: '1rem', fontWeight: 600 },
    h6: { fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.75rem' },
    caption: {
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSize: '0.625rem',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    overline: {
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSize: '0.5625rem',
      fontWeight: 700,
      letterSpacing: '0.15em',
    },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700, borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: Shadows.sm,
          border: `1px solid ${Colors.borderLight}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 700, fontSize: '0.625rem', letterSpacing: '0.04em' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          backgroundColor: Colors.bg,
          color: Colors.textSecondary,
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
