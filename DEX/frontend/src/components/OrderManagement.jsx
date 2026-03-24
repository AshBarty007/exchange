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
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { orderService } from '../services/orderService';

const OrderManagement = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [orderForm, setOrderForm] = useState({ side: 'BUY', nftContract: '0xNFT1234567890123456789012345678901234567', tokenId: '', price: '', quantity: '1' });
  const [orderId, setOrderId] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!currentUser) { setMessage({ type: 'error', text: '请先登录' }); return; }
    try {
      const result = await orderService.submitOrder({ userId: currentUser.id, walletAddress: currentUser.wallet_address, ...orderForm });
      setMessage({ type: 'success', text: `订单提交成功！订单ID: ${result.order.orderId}` });
      setOrderForm({ side: 'BUY', nftContract: '0xNFT1234567890123456789012345678901234567', tokenId: '', price: '', quantity: '1' });
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.error || '订单提交失败' }); }
  };

  const handleQueryOrder = async (e) => {
    e.preventDefault();
    try {
      const result = await orderService.getOrder(orderId);
      setOrderInfo(result);
      setMessage({ type: 'success', text: '查询成功' });
    } catch { setMessage({ type: 'error', text: '订单不存在或查询失败' }); setOrderInfo(null); }
  };

  const handleCancelOrder = async () => {
    if (!orderId) { setMessage({ type: 'error', text: '请输入订单ID' }); return; }
    try {
      await orderService.cancelOrder(orderId);
      setMessage({ type: 'success', text: '订单取消成功' });
      setOrderInfo(null); setOrderId('');
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.error || '订单取消失败' }); }
  };

  const statusMap = { PENDING: { label: '待处理', color: 'warning' }, PARTIAL: { label: '部分成交', color: 'info' }, FILLED: { label: '完全成交', color: 'success' }, CANCELLED: { label: '已取消', color: 'default' } };

  if (!currentUser) {
    return (
      <Card><CardContent sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>订单管理</Typography>
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>请先登录以提交和管理订单</Typography>
      </CardContent></Card>
    );
  }

  return (
    <Card><CardContent sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>订单管理</Typography>

      {message.text && <Alert severity={message.type === 'success' ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="提交订单" />
        <Tab label="查询订单" />
      </Tabs>

      {activeTab === 0 && (
        <Box component="form" onSubmit={handleSubmitOrder} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
          <TextField label="订单类型" select value={orderForm.side} onChange={(e) => setOrderForm({ ...orderForm, side: e.target.value })}>
            <MenuItem value="BUY">买入</MenuItem><MenuItem value="SELL">卖出</MenuItem>
          </TextField>
          <TextField label="NFT合约地址" value={orderForm.nftContract} onChange={(e) => setOrderForm({ ...orderForm, nftContract: e.target.value })} placeholder="0x..." required />
          <TextField label="Token ID" type="number" value={orderForm.tokenId} onChange={(e) => setOrderForm({ ...orderForm, tokenId: e.target.value })} required />
          <TextField label="价格" type="number" inputProps={{ step: '0.01' }} value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })} required />
          <TextField label="数量" type="number" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} required />
          <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>提交订单</Button>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box component="form" onSubmit={handleQueryOrder} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}>
            <TextField label="订单ID" type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
            <Stack direction="row" spacing={1.5}>
              <Button type="submit" variant="contained">查询订单</Button>
              {orderInfo && <Button variant="contained" color="error" onClick={handleCancelOrder}>取消订单</Button>}
            </Stack>
          </Box>

          {orderInfo && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {[
                ['订单ID', orderInfo.orderId],
                ['用户ID', orderInfo.userId],
                ['订单类型', orderInfo.side === 'BUY' ? '买入' : '卖出'],
                ['价格', orderInfo.price],
                ['数量', orderInfo.quantity],
                ['已成交数量', orderInfo.filledQuantity],
                ['剩余数量', orderInfo.remainingQuantity],
                ['创建时间', new Date(orderInfo.createdAt).toLocaleString()],
              ].map(([label, value]) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>{value}</Typography>
                  </Paper>
                </Grid>
              ))}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                  <Typography variant="subtitle2" color="text.secondary">状态</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip size="small" label={statusMap[orderInfo.status]?.label || orderInfo.status} color={statusMap[orderInfo.status]?.color || 'default'} />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </CardContent></Card>
  );
};

export default OrderManagement;
