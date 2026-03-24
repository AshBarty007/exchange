import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import LandscapeIcon from '@mui/icons-material/Landscape';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PolicyIcon from '@mui/icons-material/Policy';
import ScenicSpotDashboard from './nodes/ScenicSpotDashboard';
import ExchangeDashboard from './nodes/ExchangeDashboard';
import MarketMakerDashboard from './nodes/MarketMakerDashboard';
import BankDashboard from './nodes/BankDashboard';
import RegulatorDashboard from './nodes/RegulatorDashboard';

const NODE_TABS = [
  { key: 'scenic_spot', label: '景区节点', icon: <LandscapeIcon /> },
  { key: 'exchange', label: '交易所节点', icon: <SwapHorizIcon /> },
  { key: 'market_maker', label: '做市商节点', icon: <ShowChartIcon /> },
  { key: 'bank', label: '银行节点', icon: <AccountBalanceIcon /> },
  { key: 'regulator', label: '监管节点', icon: <PolicyIcon /> },
];

const NodeManagement = () => {
  const [activeNodeTab, setActiveNodeTab] = useState('scenic_spot');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role && ['scenic_spot', 'exchange', 'market_maker', 'bank', 'regulator'].includes(user.role)) {
          setActiveNodeTab(user.role);
        }
      }
    } catch {}
  }, []);

  return (
    <Card><CardContent sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>节点管理</Typography>

      <Tabs value={activeNodeTab} onChange={(_, v) => setActiveNodeTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {NODE_TABS.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={tab.label} icon={tab.icon} iconPosition="start" />
        ))}
      </Tabs>

      {activeNodeTab === 'scenic_spot' && <ScenicSpotDashboard />}
      {activeNodeTab === 'exchange' && <ExchangeDashboard />}
      {activeNodeTab === 'market_maker' && <MarketMakerDashboard />}
      {activeNodeTab === 'bank' && <BankDashboard />}
      {activeNodeTab === 'regulator' && <RegulatorDashboard />}

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>数据每5秒自动刷新</Typography>
    </CardContent></Card>
  );
};

export default NodeManagement;
