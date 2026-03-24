import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { assetService } from '../services/assetService';

const AssetManagement = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [depositForm, setDepositForm] = useState({ asset_type: 'token', contract_address: '0xABCDEF1234567890123456789012345678901234', amount: '', tx_hash: '' });
  const [withdrawForm, setWithdrawForm] = useState({ contract_address: '0xABCDEF1234567890123456789012345678901234', amount: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (currentUser) { loadBalances(); loadTransactions(); }
  }, [currentUser]);

  const loadBalances = async () => {
    if (!currentUser) return;
    setLoading(true);
    try { setBalances(await assetService.getBalance(currentUser.id)); } catch {}
    setLoading(false);
  };

  const loadTransactions = async () => {
    if (!currentUser) return;
    try { setTransactions(await assetService.getTransactions(currentUser.id)); } catch {}
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!currentUser) { setMessage({ type: 'error', text: '请先登录' }); return; }
    try {
      await assetService.deposit({ user_id: currentUser.id, wallet_address: currentUser.wallet_address, ...depositForm });
      setMessage({ type: 'success', text: '充值成功！' });
      setDepositForm({ asset_type: 'token', contract_address: '0xABCDEF1234567890123456789012345678901234', amount: '', tx_hash: '' });
      loadBalances(); loadTransactions();
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.error || '充值失败' }); }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!currentUser) { setMessage({ type: 'error', text: '请先登录' }); return; }
    try {
      await assetService.withdraw({ user_id: currentUser.id, ...withdrawForm });
      setMessage({ type: 'success', text: '提现申请已提交！' });
      setWithdrawForm({ contract_address: '0xABCDEF1234567890123456789012345678901234', amount: '' });
      loadBalances(); loadTransactions();
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.error || '提现失败' }); }
  };

  if (!currentUser) {
    return (
      <Card><CardContent sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>资产管理</Typography>
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>请先登录以查看和管理您的资产</Typography>
      </CardContent></Card>
    );
  }

  const statusColor = (s) => s === 'confirmed' ? 'success' : s === 'pending' ? 'warning' : 'error';
  const statusLabel = (s) => s === 'confirmed' ? '已确认' : s === 'pending' ? '待处理' : '失败';

  return (
    <Card><CardContent sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>资产管理</Typography>

      {message.text && <Alert severity={message.type === 'success' ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="资产余额" />
        <Tab label="充值" />
        <Tab label="提现" />
        <Tab label="交易记录" />
      </Tabs>

      {activeTab === 0 && (
        loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> :
        balances.length === 0 ? <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>暂无资产记录</Typography> :
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>资产类型</TableCell><TableCell>合约地址</TableCell><TableCell>总余额</TableCell>
              <TableCell>锁定金额</TableCell><TableCell>可用余额</TableCell><TableCell>更新时间</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.asset_type === 'token' ? '代币' : 'NFT'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.contract_address}</TableCell>
                  <TableCell>{parseFloat(b.amount).toFixed(2)}</TableCell>
                  <TableCell>{parseFloat(b.locked_amount).toFixed(2)}</TableCell>
                  <TableCell>{parseFloat(b.available_amount).toFixed(2)}</TableCell>
                  <TableCell>{new Date(b.updated_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && (
        <Box component="form" onSubmit={handleDeposit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
          <TextField label="资产类型" select value={depositForm.asset_type} onChange={(e) => setDepositForm({ ...depositForm, asset_type: e.target.value })}>
            <MenuItem value="token">代币</MenuItem><MenuItem value="nft">NFT</MenuItem>
          </TextField>
          <TextField label="合约地址" value={depositForm.contract_address} onChange={(e) => setDepositForm({ ...depositForm, contract_address: e.target.value })} placeholder="0x..." required />
          <TextField label="充值金额" type="number" inputProps={{ step: '0.01' }} value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} required />
          <TextField label="交易哈希" value={depositForm.tx_hash} onChange={(e) => setDepositForm({ ...depositForm, tx_hash: e.target.value })} placeholder="0x..." required />
          <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>确认充值</Button>
        </Box>
      )}

      {activeTab === 2 && (
        <Box component="form" onSubmit={handleWithdraw} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
          <TextField label="合约地址" value={withdrawForm.contract_address} onChange={(e) => setWithdrawForm({ ...withdrawForm, contract_address: e.target.value })} placeholder="0x..." required />
          <TextField label="提现金额" type="number" inputProps={{ step: '0.01' }} value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required />
          <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>确认提现</Button>
        </Box>
      )}

      {activeTab === 3 && (
        transactions.length === 0 ? <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>暂无交易记录</Typography> :
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>交易类型</TableCell><TableCell>资产类型</TableCell><TableCell>金额</TableCell>
              <TableCell>状态</TableCell><TableCell>交易哈希</TableCell><TableCell>时间</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.tx_type === 'deposit' ? '充值' : tx.tx_type === 'withdraw' ? '提现' : '交易'}</TableCell>
                  <TableCell>{tx.asset_type === 'token' ? '代币' : 'NFT'}</TableCell>
                  <TableCell>{tx.amount ? parseFloat(tx.amount).toFixed(2) : '-'}</TableCell>
                  <TableCell><Chip size="small" label={statusLabel(tx.status)} color={statusColor(tx.status)} /></TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.tx_hash || '-'}</TableCell>
                  <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </CardContent></Card>
  );
};

export default AssetManagement;
