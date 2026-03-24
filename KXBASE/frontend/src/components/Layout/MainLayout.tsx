import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
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
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalanceWallet as WalletIcon,
  Description as ContractIcon,
  SwapHoriz as TransactionIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  ViewList as BlockchainIcon,
  LocalActivity as TicketMarketIcon,
  ConfirmationNumber as IssueIcon,
  Assignment as OrdersIcon,
  AccountBalance as AssetsIcon,
  VerifiedUser as VerifyIcon,
  LocalAtm as FiatMintIcon,
  ManageAccounts as AccountMgmtIcon,
  ShowChart as ExchangeIcon,
  AdminPanelSettings as RoleIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import { useThemeMode } from '@/theme/ThemeProvider';
import contractService from '@/services/contractService';

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const menuItems: MenuItem[] = [
  { text: '仪表盘', icon: <DashboardIcon />, path: '/dashboard' },
  { text: '钱包管理', icon: <WalletIcon />, path: '/wallets' },
  { text: '资产管理', icon: <AssetsIcon />, path: '/account' },
  { text: '账户管理', icon: <AccountMgmtIcon />, path: '/account-management' },
  { text: '角色权限', icon: <RoleIcon />, path: '/role-management' },
  { text: '法币通证', icon: <FiatMintIcon />, path: '/fiat-mint' },
  { text: '交易所', icon: <ExchangeIcon />, path: '/exchange' },
  { text: '门票市场', icon: <IssueIcon />, path: '/market' },
  { text: '门票发行', icon: <TicketMarketIcon />, path: '/issue-ticket' },
  { text: '门票核销', icon: <VerifyIcon />, path: '/verify-ticket' },
  { text: '我的订单', icon: <OrdersIcon />, path: '/orders' },
  { text: '合约交互', icon: <ContractIcon />, path: '/contracts' },
  { text: '交易记录', icon: <TransactionIcon />, path: '/transactions' },
  { text: '区块浏览器', icon: <BlockchainIcon />, path: '/blockchain' },
  { text: '系统设置', icon: <SettingsIcon />, path: '/settings' },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = useThemeMode();

  const { currentBackendWallet, loadBackendWallets } = useWalletStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadBackendWallets();
    contractService.initializeContracts().catch((error) => {
      console.warn('Failed to initialize contracts:', error);
    });
  }, [loadBackendWallets]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    navigate('/wallets');
    handleUserMenuClose();
  };

const drawer = (
    <Box
      sx={{
        width: drawerWidth,
        '& img': {
          'height': '20px !important',
          'width': 'auto !important',
          flexShrink: 0
        }
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          'gap': 1
        }}
      >
        <img src="/assets/kxicon.png" />
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          DEX
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ px: 2, py: 2 }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<ExchangeIcon />}
          onClick={() => handleMenuClick('/exchange')}
          sx={{
            fontWeight: 800,
            letterSpacing: 0.5,
            borderRadius: 2,
            py: 1.25,
            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
            boxShadow: '0 10px 20px rgba(25, 118, 210, 0.35)',
            '&:hover': {
              background: 'linear-gradient(90deg, #1565c0 0%, #1e88e5 100%)',
              boxShadow: '0 12px 26px rgba(25, 118, 210, 0.45)',
            },
          }}
        >
          进入交易所
        </Button>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
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
            FISCO 联盟链合约开发测试平台
          </Typography>

          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton onClick={handleUserMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>
              <PersonIcon />
            </Avatar>
          </IconButton>
          {currentBackendWallet ? (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                  {currentBackendWallet.name || currentBackendWallet.address.slice(0, 8) + '...'}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.85 }}>
                  {currentBackendWallet.address.slice(0, 6)}...{currentBackendWallet.address.slice(-4)}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="inherit">
              未选择账户
            </Typography>
          )}

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {currentBackendWallet ? '切换账户' : '选择账户'}
            </MenuItem>
          </Menu>
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
          ModalProps={{
            keepMounted: true,
          }}
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

export default MainLayout;
