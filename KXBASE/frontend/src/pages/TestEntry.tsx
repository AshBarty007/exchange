import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Grid,
  Typography,
  Container,
  IconButton,
  AppBar,
  Toolbar,
  Button,
  Stack,
  Divider,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Home as HomeIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon,
  Chat as ChatIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Hub as HubIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { portals } from '@/config/portalConfig';
import { useThemeMode } from '@/theme/ThemeProvider';
import { useWalletStore } from '@/store/walletStore';

const Brand = {
  blue: '#2563EB',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
};

const ADMIN_ADDRESS = '0xf5e5fd8db3ba48f602619b871e41561954fb312f';

const TestEntry: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';
  const footerBg = isDark ? '#020617' : '#111827';
  const { backendWallets, setCurrentBackendWallet } = useWalletStore();

  const handlePlatformClick = () => {
    // Switch to admin wallet before entering platform
    const adminWallet = backendWallets.find(
      (w) => w.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()
    );
    if (adminWallet) {
      setCurrentBackendWallet(adminWallet);
    } else {
      // Create a mock wallet entry for the admin
      setCurrentBackendWallet({
        address: ADMIN_ADDRESS,
        name: 'ADMIN',
        role: 'admin',
      });
    }
    navigate('/platform');
  };

  // Separate platform portal from business portals
  const platformPortal = portals.find((p) => p.id === 'platform');
  const businessPortals = portals.filter((p) => p.id !== 'platform');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── Glass Navbar ──────────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.85),
          color: 'text.primary',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                background: Brand.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mr: 1, flexShrink: 0, cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              <Typography fontWeight="bold" color="#fff" fontSize={16}>科信</Typography>
            </Box>
            <Typography
              variant="h6" fontWeight="bold"
              sx={{ color: Brand.blue, flexGrow: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              KXDEX
            </Typography>

            <Button
              size="small"
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ mr: 1, textTransform: 'none', fontWeight: 600 }}
            >
              返回首页
            </Button>
            <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            fontWeight="bold"
            gutterBottom
            sx={{
              background: Brand.gradient,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            KXDEX 科信文旅联盟链平台
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            构建可信、高效、合规的文旅数字门票新基建
          </Typography>
          <Typography
            variant="h3"
            fontWeight="bold"
            gutterBottom
            sx={{ color: 'text.disabled' }}
          >
            测试统一入口
          </Typography>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ color: 'text.disabled' }}
          >
            每个系统提供测试账户直接登陆
          </Typography>
        </Box>

        {/* ── Platform Management Card (special) ── */}
        {platformPortal && (
          <Box sx={{ mb: 5 }}>
            <Card
              onClick={handlePlatformClick}
              sx={{
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: `2px solid ${alpha(platformPortal.color, 0.2)}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 16px 40px ${alpha(platformPortal.color, 0.2)}`,
                  borderColor: alpha(platformPortal.color, 0.4),
                },
              }}
            >
              <Box sx={{
                background: `linear-gradient(135deg, ${platformPortal.color} 0%, #5c6bc0 100%)`,
                p: { xs: 3, md: 4 },
                color: '#fff',
              }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{
                        width: 56, height: 56, borderRadius: '50%',
                        bgcolor: alpha('#fff', 0.15), display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <HubIcon sx={{ fontSize: 28 }} />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {platformPortal.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85 }}>
                          {platformPortal.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      {platformPortal.menuItems.map((item) => (
                        <Chip
                          key={item.path}
                          label={item.text}
                          size="small"
                          sx={{
                            bgcolor: alpha('#fff', 0.15),
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{
                      bgcolor: alpha('#fff', 0.1),
                      borderRadius: 3, p: 2.5,
                      backdropFilter: 'blur(8px)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <AdminIcon sx={{ fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600}>
                          管理员账户 (合约部署者)
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: alpha('#000', 0.2),
                          borderRadius: 1.5,
                          px: 1.5, py: 1,
                          fontSize: '0.8rem',
                          wordBreak: 'break-all',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {ADMIN_ADDRESS}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                        点击将自动切换为此管理员账户并进入平台
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Box>
        )}

        {/* ── Business Portal Cards ── */}
        <Grid container spacing={3}>
          {businessPortals.map((portal) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={portal.id}>
              <Card
                onClick={() => navigate(portal.basePath)}
                sx={{
                  height: '100%',
                  borderRadius: 1,
                  p: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 16px 32px ${alpha(portal.color, 0.15)}`,
                  },
                  '&:hover .enter-hint': {
                    opacity: 1,
                  },
                  '&:hover .portal-subtitle': {
                    opacity: 0,
                  },
                }}
              >
                {/* Colored header */}
                <Box sx={{
                  bgcolor: alpha(portal.color, 0.08),
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '50%',
                    bgcolor: alpha(portal.color, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: portal.color,
                  }}>
                    {React.cloneElement(portal.icon, {
                      sx: { fontSize: 24 },
                    })}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ fontSize: '1rem' }}>
                    {portal.name}
                  </Typography>
                </Box>

                {/* Body */}
                <Box sx={{ p: 3, position: 'relative' }}>
                  {/* Menu items as feature list */}
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    {portal.menuItems.slice(0, 4).map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckIcon sx={{ fontSize: 16, color: portal.color, flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary">{item.text}</Typography>
                      </Box>
                    ))}
                  </Stack>

                  {/* Subtitle - fades out on hover */}
                  <Typography
                    className="portal-subtitle"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      textAlign: 'center',
                      pt: 1,
                      borderTop: `1px solid ${theme.palette.divider}`,
                      transition: 'opacity 0.3s',
                    }}
                  >
                    {portal.subtitle}
                  </Typography>

                  {/* Enter hint - appears on hover */}
                  <Box
                    className="enter-hint"
                    sx={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      p: 3, pt: 2,
                      textAlign: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        color: portal.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                      }}
                    >
                      点击进入
                      <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: footerBg, color: '#9CA3AF', py: 6 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex', flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between', alignItems: 'center',
              mb: 4, gap: 3,
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: 2,
                  background: Brand.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Typography fontWeight="bold" color="#fff" fontSize={16}>科信</Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold" color="#fff">科信DEX</Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <IconButton sx={{ color: '#9CA3AF', '&:hover': { color: '#fff' } }}><ChatIcon /></IconButton>
              <IconButton sx={{ color: '#9CA3AF', '&:hover': { color: '#fff' } }}><EmailIcon /></IconButton>
              <IconButton sx={{ color: '#9CA3AF', '&:hover': { color: '#fff' } }}><PhoneIcon /></IconButton>
            </Stack>
          </Box>
          <Divider sx={{ borderColor: alpha('#fff', 0.1), mb: 4 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">&copy; 2026 科信DEX | 基于联盟链的景区门票数字资产交易平台</Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
              本平台为测试环境，所有数据仅用于功能验证，请勿用于正式生产
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default TestEntry;
