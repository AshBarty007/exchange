import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: { main: '#2081e2', light: '#4da3ff', dark: '#1868b7' },
    secondary: { main: '#7b61ff', light: '#a78bfa', dark: '#5b3fd9' },
    success: { main: '#34c77b', light: '#6ee7a0', dark: '#2db36d' },
    error: { main: '#eb5757', light: '#ff7b7b', dark: '#d94444' },
    warning: { main: '#f2994a', light: '#ffb77a', dark: '#d97f33' },
    info: { main: '#2d9cdb', light: '#5bb8e8', dark: '#1a7ab5' },
    ...(mode === 'dark' ? {
      background: { default: '#0b0e17', paper: '#121726' },
      text: { primary: '#e4e8ef', secondary: '#8a919e', disabled: '#545b6a' },
      divider: 'rgba(255,255,255,0.08)',
    } : {
      background: { default: '#f5f7fa', paper: '#ffffff' },
      text: { primary: '#1a202c', secondary: '#4a5568', disabled: '#a0aec0' },
      divider: 'rgba(0,0,0,0.08)',
    }),
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h4: { fontWeight: 700, letterSpacing: '-0.3px' },
    h5: { fontWeight: 700, letterSpacing: '-0.3px' },
    h6: { fontWeight: 700, letterSpacing: '-0.2px' },
    subtitle2: {
      fontWeight: 600,
      fontSize: '0.8rem',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      color: mode === 'dark' ? '#8a919e' : '#4a5568'
    },
    body2: { color: mode === 'dark' ? '#8a919e' : '#4a5568' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderRadius: 3
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)'
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          transition: 'border-color 0.2s ease, transform 0.2s ease'
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10, padding: '10px 24px' },
        containedPrimary: { '&:hover': { boxShadow: '0 6px 20px rgba(32,129,226,0.25)' } },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'
            },
            '&:hover fieldset': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)'
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          fontSize: '0.82rem'
        },
        head: {
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.72rem',
          color: mode === 'dark' ? '#8a919e' : '#4a5568'
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
          }
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, minHeight: 44 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' },
      },
    },
  },
});

export default getTheme('dark');
