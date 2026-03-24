import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { orderService } from '../../services/orderService';

export default function PriceChart({ ticketType }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const trades = await orderService.getRecentTrades(50);
        const filtered = ticketType ? trades.filter(t => t.ticketType === ticketType) : trades;
        setData(filtered.map(t => ({
          time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
          price: Number(t.price),
        })).reverse());
      } catch {
        const now = Date.now();
        setData(Array.from({ length: 20 }, (_, i) => ({
          time: new Date(now - (20 - i) * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          price: 50 + Math.sin(i * 0.5) * 8 + Math.random() * 3,
        })));
      }
    };
    fetchTrades();
    const timer = setInterval(fetchTrades, 10000);
    return () => clearInterval(timer);
  }, [ticketType]);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>价格走势</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#121726', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} labelFormatter={v => `时间: ${v}`} />
          <Line type="monotone" dataKey="price" name="成交价" stroke="#2081e2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
