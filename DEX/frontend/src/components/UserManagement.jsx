import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LogoutIcon from '@mui/icons-material/Logout';
import { userService } from '../services/userService';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'market_maker', wallet_address: '' });
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentUser, setCurrentUser] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const result = await userService.register(formData);
      setMessage({ type: 'success', text: '注册成功！' });
      setCurrentUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '注册失败' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await userService.login(loginData);
      setMessage({ type: 'success', text: '登录成功！' });
      setCurrentUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '登录失败' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setMessage({ type: 'success', text: '已退出登录' });
  };

  React.useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const ROLE_LABELS = { scenic_spot: '景区', exchange: '交易所', bank: '银行', market_maker: '做市商', regulator: '监管机构' };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>用户管理</Typography>

        {message.text && (
          <Alert severity={message.type === 'success' ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {currentUser ? (
          <Box>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {[
                ['用户ID', currentUser.id],
                ['用户名', currentUser.username],
                ['邮箱', currentUser.email],
                ['角色', ROLE_LABELS[currentUser.role] || currentUser.role],
                ['钱包地址', currentUser.wallet_address],
                ['KYC状态', currentUser.kyc_verified ? '已验证' : '未验证'],
              ].map(([label, value]) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5, wordBreak: 'break-all' }}>{value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ mt: 3 }}>
              退出登录
            </Button>
          </Box>
        ) : (
          <>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="注册" />
              <Tab label="登录" />
            </Tabs>

            {activeTab === 0 ? (
              <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
                <TextField label="用户名" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                <TextField label="邮箱" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                <TextField label="密码" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                <TextField label="角色" select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <MenuItem value="scenic_spot">景区</MenuItem>
                  <MenuItem value="exchange">交易所</MenuItem>
                  <MenuItem value="bank">银行</MenuItem>
                  <MenuItem value="market_maker">做市商</MenuItem>
                  <MenuItem value="regulator">监管机构</MenuItem>
                </TextField>
                <TextField label="钱包地址" value={formData.wallet_address} onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })} placeholder="0x..." required />
                <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>注册</Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
                <TextField label="用户名" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} required />
                <TextField label="密码" type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required />
                <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>登录</Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
