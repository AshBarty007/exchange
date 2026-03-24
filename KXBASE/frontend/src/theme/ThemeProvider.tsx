import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material';

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

interface ThemeProviderWrapperProps {
  children: ReactNode;
}

export const ThemeProviderWrapper: React.FC<ThemeProviderWrapperProps> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    // 从 localStorage 读取用户偏好
    const saved = localStorage.getItem('theme-mode');
    return (saved as PaletteMode) || 'light';
  });

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      return newMode;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#1976d2' : '#90caf9',
            light: mode === 'light' ? '#42a5f5' : '#e3f2fd',
            dark: mode === 'light' ? '#1565c0' : '#42a5f5',
          },
          secondary: {
            main: mode === 'light' ? '#9c27b0' : '#ce93d8',
          },
          background: {
            default: mode === 'light' ? '#f5f7fa' : '#0f172a',
            paper: mode === 'light' ? '#ffffff' : '#1e293b',
          },
          text: {
            primary: mode === 'light' ? '#1a2027' : '#ffffff',
            secondary: mode === 'light' ? '#3e5060' : '#e2e8f0',
          },
          divider: mode === 'light' ? 'rgba(0,0,0,0.12)' : '#334155',
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
          h4: {
            fontWeight: 700,
            letterSpacing: '-0.5px',
          },
          h6: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          'none',
          mode === 'light'
            ? '0px 2px 4px rgba(0,0,0,0.05)'
            : '0px 2px 4px rgba(0,0,0,0.5)',
          mode === 'light'
            ? '0px 4px 8px rgba(0,0,0,0.08)'
            : '0px 4px 8px rgba(0,0,0,0.6)',
          mode === 'light'
            ? '0px 8px 16px rgba(0,0,0,0.1)'
            : '0px 8px 16px rgba(0,0,0,0.7)',
          mode === 'light'
            ? '0px 12px 24px rgba(0,0,0,0.12)'
            : '0px 12px 24px rgba(0,0,0,0.8)',
          mode === 'light'
            ? '0px 16px 32px rgba(0,0,0,0.14)'
            : '0px 16px 32px rgba(0,0,0,0.9)',
          ...Array(19).fill(
            mode === 'light'
              ? '0px 20px 40px rgba(0,0,0,0.16)'
              : '0px 20px 40px rgba(0,0,0,0.95)'
          ),
        ] as any,
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 8,
              },
              contained: {
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow:
                  mode === 'light'
                    ? '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)'
                    : '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.6)',
                // 玻璃态效果
                backdropFilter: 'blur(10px)',
                backgroundColor:
                  mode === 'light'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : 'rgba(30, 41, 59, 0.8)',
                border: mode === 'light' ? '1px solid rgba(255,255,255,0.3)' : '1px solid #334155',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              elevation1: {
                backdropFilter: 'blur(10px)',
                backgroundColor:
                  mode === 'light'
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(30, 41, 59, 0.9)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                // 玻璃态侧边栏
                backdropFilter: 'blur(20px)',
                backgroundColor:
                  mode === 'light'
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(15, 23, 42, 0.95)',
                borderRight:
                  mode === 'light'
                    ? '1px solid rgba(0,0,0,0.08)'
                    : '1px solid #334155',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                // 玻璃态顶栏
                backdropFilter: 'blur(20px)',
                backgroundColor:
                  mode === 'light'
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(15, 23, 42, 0.95)',
                color: mode === 'light' ? '#1a2027' : '#fff',
                boxShadow:
                  mode === 'light'
                    ? '0 1px 3px rgba(0,0,0,0.05)'
                    : '0 1px 3px rgba(0,0,0,0.5)',
                borderBottom:
                  mode === 'light'
                    ? '1px solid rgba(0,0,0,0.08)'
                    : '1px solid #334155',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 500,
                borderRadius: 8,
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
