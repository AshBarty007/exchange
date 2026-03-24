import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { orderService } from '../../services/orderService';

export default function RecentTrades({ ticketType }) {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const allTrades = await orderService.getRecentTrades(50);
        const filtered = ticketType ? allTrades.filter(t => t.ticketType === ticketType) : allTrades;
        setTrades(filtered.slice(0, 15));
      } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [ticketType]);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>最近成交</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', px: 1, pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.disabled">价格 (¥)</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>数量</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>时间</Typography>
      </Box>

      <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
        {trades.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3 }}>暂无成交记录</Typography>
        ) : (
          trades.map((trade, i) => {
            const time = trade.createdAt ? new Date(trade.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
            const isBuy = trade.side === 'BUY';
            return (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', px: 1, py: 0.5, fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: isBuy ? 'success.main' : 'error.main' }}>
                  {Number(trade.price).toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'right', color: 'text.secondary' }}>
                  {Number(trade.quantity || 1)}
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'right', color: 'text.disabled', fontSize: '0.75rem' }}>
                  {time}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Paper>
  );
}
