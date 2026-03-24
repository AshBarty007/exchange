import React, { useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PersonIcon from '@mui/icons-material/Person';
import DiamondIcon from '@mui/icons-material/Diamond';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LinkIcon from '@mui/icons-material/Link';
import DnsIcon from '@mui/icons-material/Dns';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import UserManagement from './components/UserManagement';
import AssetManagement from './components/AssetManagement';
import OrderManagement from './components/OrderManagement';
import NFTMarketplace from './components/NFTMarketplace';
import BlockchainStatus from './components/BlockchainStatus';
import NodeManagement from './components/NodeManagement';
import { getTheme } from './theme';

const NAV_ITEMS = [
  { key: 'user', label: '用户', icon: <PersonIcon /> },
  { key: 'asset', label: '资产', icon: <DiamondIcon /> },
  { key: 'order', label: '订单', icon: <ReceiptLongIcon /> },
  { key: 'market', label: '市场', icon: <StorefrontIcon /> },
  { key: 'blockchain', label: '链上', icon: <LinkIcon /> },
  { key: 'node', label: '节点', icon: <DnsIcon /> },
];

function App() {
  const [activeSection, setActiveSection] = useState('user');
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('kxdex-theme') || 'dark';
  });

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    localStorage.setItem('kxdex-theme', next);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部导航栏 */}
        <Paper sx={{ mb: 0, bgcolor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 0 }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Logo 图标 */}
              <Box sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <img src="/src/kxicon.png" height="30" alt="KXDEX" style={{ display: 'block' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1 }}>DEX</Typography>
              </Box>

              {/* Tabs 导航 */}
              <Tabs
                value={activeSection}
                onChange={(_, v) => setActiveSection(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  flex: 1,
                  '& .MuiTab-root': { minHeight: 52, gap: 0.8 },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                }}
              >
                {NAV_ITEMS.map((item) => (
                  <Tab key={item.key} value={item.key} label={item.label} icon={item.icon} iconPosition="start" />
                ))}
              </Tabs>

              {/* 主题切换按钮 */}
              <Tooltip title={themeMode === 'dark' ? '切换浅色主题' : '切换深色主题'}>
                <IconButton onClick={toggleTheme} color="inherit" sx={{ ml: 1 }}>
                  {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Container>
        </Paper>

        {/* 主内容区域 */}
        <Container maxWidth="xl" sx={{ flex: 1, py: 4 }}>

          {activeSection === 'user' && <UserManagement />}
          {activeSection === 'asset' && <AssetManagement />}
          {activeSection === 'order' && <OrderManagement />}
          {activeSection === 'market' && <NFTMarketplace />}
          {activeSection === 'blockchain' && <BlockchainStatus />}
          {activeSection === 'node' && <NodeManagement />}

          <Box component="footer" sx={{ mt: 6, py: 3, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.disabled">
              Kexin Decentralized Exchange(kxdex) &copy; 2026 — NFT 门票交易 &amp; 资金凭证管理
            </Typography>
            <Typography variant="caption" color="text.disabled">
              React + Flask + Spring Boot + FISCO BCOS
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
