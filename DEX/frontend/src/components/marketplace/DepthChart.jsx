import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { orderService } from '../../services/orderService';

export default function DepthChart({ ticketType, scenicSpot }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchDepth = async () => {
      try {
        const ob = await orderService.getOrderBook(ticketType, scenicSpot);
        const bids = (ob.bids || []).sort((a, b) => Number(b.price) - Number(a.price));
        const asks = (ob.asks || []).sort((a, b) => Number(a.price) - Number(b.price));
        let bidCum = 0;
        const bidData = bids.map(b => { bidCum += Number(b.quantity); return { price: Number(b.price), bidCum, askCum: 0 }; }).reverse();
        let askCum = 0;
        const askData = asks.map(a => { askCum += Number(a.quantity); return { price: Number(a.price), bidCum: 0, askCum }; });
        setData([...bidData, ...askData]);
      } catch {
        const demo = [];
        const base = 50;
        for (let i = 10; i >= 1; i--) demo.push({ price: base - i * 2, bidCum: i * 3, askCum: 0 });
        for (let i = 1; i <= 10; i++) demo.push({ price: base + i * 2, bidCum: 0, askCum: i * 3 });
        setData(demo);
      }
    };
    fetchDepth();
    const timer = setInterval(fetchDepth, 10000);
    return () => clearInterval(timer);
  }, [ticketType, scenicSpot]);

  return (
    <Paper sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>深度图</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="price" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#121726', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} labelFormatter={v => `价格: ¥${v}`} />
          <Area type="stepAfter" dataKey="bidCum" name="买单累计" stroke="#34c77b" fill="rgba(52,199,123,0.2)" />
          <Area type="stepAfter" dataKey="askCum" name="卖单累计" stroke="#eb5757" fill="rgba(235,87,87,0.2)" />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
}
