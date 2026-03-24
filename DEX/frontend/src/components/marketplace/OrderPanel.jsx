import React, { useState, useRef, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import { orderService } from '../../services/orderService';

export default function OrderPanel({ ticketType, scenicSpot, basePrice }) {
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('LIMIT');
  const [price, setPrice] = useState(basePrice ?? '');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [bestBid, setBestBid] = useState(null);
  const [bestAsk, setBestAsk] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const loadOrderBook = async () => {
      try {
        const ob = await orderService.getOrderBook(ticketType, scenicSpot);
        if (ob.bids?.length > 0) setBestBid(Number(ob.bids[0].price));
        if (ob.asks?.length > 0) setBestAsk(Number(ob.asks[0].price));
      } catch {}
    };
    loadOrderBook();
    const timer = setInterval(loadOrderBook, 5000);
    return () => clearInterval(timer);
  }, [ticketType, scenicSpot]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setResult(null); setOrderStatus(null);
    try {
      const orderData = {
        userId: 1, walletAddress: '0xUser_' + Math.random().toString(36).substring(2, 10),
        orderType, side, nftContract: '0xNFTTicket',
        tokenId: Math.floor(Math.random() * 90000) + 10000,
        ticketType, scenicSpot,
        price: orderType === 'MARKET' ? (side === 'BUY' ? bestAsk : bestBid) : parseFloat(price),
        quantity: parseFloat(quantity),
      };
      const res = await orderService.submitOrder(orderData);
      setResult({ success: true, message: orderType === 'MARKET' ? '市价单已提交' : '限价单已提交，等待撮合', order: res.order });
      setOrderStatus(res.order?.status || 'PENDING');
      if (res.order?.orderId) {
        pollRef.current = setInterval(async () => {
          try {
            const updated = await orderService.getOrder(res.order.orderId);
            setOrderStatus(updated.status);
            if (updated.status === 'FILLED' || updated.status === 'CANCELLED') {
              clearInterval(pollRef.current); pollRef.current = null;
              setResult(prev => ({ ...prev, message: updated.status === 'FILLED' ? '✓ 撮合成功，交易已上链' : '订单已取消', txHash: updated.settlementTxHash }));
            }
          } catch {}
        }, 3000);
      }
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || '提交失败' });
    } finally { setSubmitting(false); }
  };

  const quickPriceButtons = [
    { label: '-5%', factor: 0.95 },
    { label: '-2%', factor: 0.98 },
    { label: '+2%', factor: 1.02 },
    { label: '+5%', factor: 1.05 },
  ];

  const handleQuickPrice = (factor) => {
    const base = basePrice ?? 100;
    setPrice((base * factor).toFixed(2));
  };

  const total = orderType === 'MARKET'
    ? (side === 'BUY' ? bestAsk : bestBid) * parseFloat(quantity || 0)
    : parseFloat(price || 0) * parseFloat(quantity || 0);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>交易面板</Typography>

      {/* Buy/Sell toggle */}
      <ToggleButtonGroup value={side} exclusive onChange={(_, v) => v && setSide(v)} fullWidth sx={{ mb: 2 }}>
        <ToggleButton value="BUY" sx={{ fontWeight: 600, py: 1.2, '&.Mui-selected': { bgcolor: 'success.main', color: '#fff', '&:hover': { bgcolor: 'success.dark' } } }}>
          买入
        </ToggleButton>
        <ToggleButton value="SELL" sx={{ fontWeight: 600, py: 1.2, '&.Mui-selected': { bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' } } }}>
          卖出
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Order type tabs */}
      <Tabs value={orderType} onChange={(_, v) => setOrderType(v)} sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}>
        <Tab label="限价单" value="LIMIT" />
        <Tab label="市价单" value="MARKET" />
      </Tabs>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Price input (only for limit orders) */}
        {orderType === 'LIMIT' && (
          <>
            <TextField
              label="价格 (¥)"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              size="small"
            />
            <Stack direction="row" spacing={0.5}>
              {quickPriceButtons.map(btn => (
                <Button
                  key={btn.label}
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickPrice(btn.factor)}
                  sx={{ fontSize: '0.7rem', minWidth: 0, flex: 1 }}
                >
                  {btn.label}
                </Button>
              ))}
            </Stack>
          </>
        )}

        {/* Market price display */}
        {orderType === 'MARKET' && (
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">市价成交</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {side === 'BUY'
                ? (bestAsk ? `≈ ¥${bestAsk.toFixed(2)}` : '—')
                : (bestBid ? `≈ ¥${bestBid.toFixed(2)}` : '—')}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {side === 'BUY' ? '按卖一价成交' : '按买一价成交'}
            </Typography>
          </Box>
        )}

        {/* Quantity */}
        <TextField
          label="数量"
          type="number"
          inputProps={{ step: '1', min: '1' }}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
          size="small"
        />

        {/* Quick quantity buttons */}
        <Stack direction="row" spacing={0.5}>
          {[1, 5, 10, 20].map(q => (
            <Button
              key={q}
              size="small"
              variant="outlined"
              onClick={() => setQuantity(String(q))}
              sx={{ fontSize: '0.7rem', minWidth: 0, flex: 1 }}
            >
              {q}张
            </Button>
          ))}
        </Stack>

        <Divider />

        {/* Total */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">总计</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>¥{total.toFixed(2)}</Typography>
        </Box>

        {/* Best bid/ask display */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <Box>
            <Typography variant="caption" color="text.disabled">买一</Typography>
            <Typography variant="caption" sx={{ ml: 0.5, color: 'success.main', fontWeight: 600 }}>
              {bestBid ? `¥${bestBid.toFixed(2)}` : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.disabled">卖一</Typography>
            <Typography variant="caption" sx={{ ml: 0.5, color: 'error.main', fontWeight: 600 }}>
              {bestAsk ? `¥${bestAsk.toFixed(2)}` : '—'}
            </Typography>
          </Box>
        </Box>

        {/* Submit button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          color={side === 'BUY' ? 'success' : 'error'}
          sx={{ py: 1.5, fontSize: '1rem', fontWeight: 700 }}
        >
          {submitting ? '提交中...' : side === 'BUY' ? `买入 ${ticketType}` : `卖出 ${ticketType}`}
        </Button>
      </Box>

      {/* Result alert */}
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          <Typography variant="body2">{result.message}</Typography>
          {orderStatus && (
            <Box sx={{ mt: 1 }}>
              状态: <Chip size="small" label={orderStatus} color={orderStatus === 'FILLED' ? 'success' : orderStatus === 'CANCELLED' ? 'default' : 'warning'} />
            </Box>
          )}
          {result.txHash && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', color: 'primary.main' }}>
              链上哈希: {result.txHash}
            </Typography>
          )}
        </Alert>
      )}
    </Paper>
  );
}
