import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Person as PersonIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import { useThemeMode } from '@/theme/ThemeProvider';
import contractService from '@/services/contractService';
import { getPortalById } from '@/config/portalConfig';

const drawerWidth = 240;

interface PortalLayoutProps {
  portalId: string;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ portalId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = useThemeMode();

  const { currentBackendWallet, loadBackendWallets } = useWalletStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const portal = getPortalById(portalId);

  useEffect(() => {
    loadBackendWallets();
    contractService.initializeContracts().catch((error) => {
      console.warn('Failed to initialize contracts:', error);
    });
  }, [loadBackendWallets]);

  if (!portal) {
    return <Typography>Portal not found</Typography>;
  }

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleMenuClick = (childPath: string) => {
    navigate(`${portal.basePath}/${childPath}`);
    if (isMobile) setMobileOpen(false);
  };

  const currentChildPath = location.pathname.replace(portal.basePath + '/', '');

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Toolbar
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: portal.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
          }}
        >
          {React.cloneElement(portal.icon, { sx: { fontSize: 20 } })}
        </Box>
        <Typography variant="h6" noWrap fontWeight="bold">
          {portal.name}
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/entry')}
          sx={{ borderRadius: 2 }}
        >
          返回测试门户
        </Button>
      </Box>
      <Divider />
      <List>
        {portal.menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={currentChildPath === item.path}
              onClick={() => handleMenuClick(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {portal.name}
          </Typography>

          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {currentBackendWallet && (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <PersonIcon />
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                  {currentBackendWallet.role || currentBackendWallet.name || '用户'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: 'monospace', opacity: 0.85 }}
                >
                  {currentBackendWallet.address.slice(0, 6)}...
                  {currentBackendWallet.address.slice(-4)}
                </Typography>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default PortalLayout;
