import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { orderService } from '../../services/orderService';

export default function OrderBookPanel({ ticketType, scenicSpot }) {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });

  useEffect(() => {
    const load = async () => {
      try { setOrderBook(await orderService.getOrderBook(ticketType, scenicSpot)); } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [ticketType, scenicSpot]);

  const maxCum = Math.max(
    ...orderBook.bids.map(b => Number(b.cumulative || 0)),
    ...orderBook.asks.map(a => Number(a.cumulative || 0)),
    1
  );

  const Row = ({ item, type }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', px: 1, py: 0.4, fontSize: '0.82rem', position: 'relative', fontVariantNumeric: 'tabular-nums' }}>
      <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.12, width: `${(Number(item.cumulative) / maxCum) * 100}%`, bgcolor: type === 'bid' ? 'success.main' : 'error.main' }} />
      <Typography variant="body2" sx={{ position: 'relative', zIndex: 1, fontWeight: 600, color: type === 'bid' ? 'success.main' : 'error.main' }}>{Number(item.price).toFixed(2)}</Typography>
      <Typography variant="body2" sx={{ position: 'relative', zIndex: 1, textAlign: 'right', color: 'text.secondary' }}>{Number(item.quantity)}</Typography>
      <Typography variant="body2" sx={{ position: 'relative', zIndex: 1, textAlign: 'right', color: 'text.secondary' }}>{Number(item.cumulative)}</Typography>
    </Box>
  );

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Order Book</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', px: 1, pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.disabled">价格 (¥)</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>数量</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>累计</Typography>
      </Box>

      <Box>{[...orderBook.asks].reverse().slice(0, 10).map((ask, i) => <Row key={`ask-${i}`} item={ask} type="ask" />)}</Box>

      <Divider sx={{ my: 0.5 }}>
        {orderBook.bids.length > 0 && orderBook.asks.length > 0 && (
          <Typography variant="caption" color="text.disabled">
            价差: ¥{(Number(orderBook.asks[0]?.price) - Number(orderBook.bids[0]?.price)).toFixed(2)}
          </Typography>
        )}
      </Divider>

      <Box>{orderBook.bids.slice(0, 10).map((bid, i) => <Row key={`bid-${i}`} item={bid} type="bid" />)}</Box>
    </Paper>
  );
}
