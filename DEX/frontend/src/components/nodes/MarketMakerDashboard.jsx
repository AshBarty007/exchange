import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { nodeService } from '../../services/nodeService';
import NodeStatusPanel from './NodeStatusPanel';

const MarketMakerDashboard = () => {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [d, tx] = await Promise.all([nodeService.getMarketMakerData(), nodeService.getRecentTransactions('market_maker')]);
      setData(d); setTransactions(tx);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <NodeStatusPanel nodeType="market_maker" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[['活跃订单数', data.activeOrders], ['成交率', `${data.matchRate}%`], ['总成交量 (Token)', data.totalVolume?.toLocaleString()], ['当前价差', `${data.currentSpread}%`]].map(([label, value]) => (
          <Grid size={{ xs: 6, sm: 3 }} key={label}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>买卖订单量趋势</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.orderTrend}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend />
                <Area type="monotone" dataKey="buyOrders" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} name="买单" />
                <Area type="monotone" dataKey="sellOrders" stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.3} name="卖单" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>价差历史</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.spreadHistory}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <Tooltip /><Line type="monotone" dataKey="spread" stroke="#fa8c16" strokeWidth={2} dot={false} name="价差 %" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>当前挂单</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>订单ID</TableCell><TableCell>方向</TableCell><TableCell>价格</TableCell>
              <TableCell>数量</TableCell><TableCell>已成交</TableCell><TableCell>状态</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.currentOrders.map((order, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{order.id}</TableCell>
                  <TableCell sx={{ color: order.side === '买入' ? 'success.main' : 'error.main', fontWeight: 600 }}>{order.side}</TableCell>
                  <TableCell>{order.price}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.filled}</TableCell>
                  <TableCell><Chip size="small" label={order.status} color={order.status === '挂单中' ? 'info' : 'warning'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>最近撮合记录</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>交易哈希</TableCell><TableCell>类型</TableCell><TableCell>发送方</TableCell><TableCell>接收方</TableCell><TableCell>区块号</TableCell><TableCell>时间</TableCell><TableCell>状态</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {transactions.map((tx, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.txHash}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.from}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx.to}</TableCell>
                  <TableCell>{tx.blockNumber}</TableCell><TableCell>{tx.timestamp}</TableCell>
                  <TableCell><Chip size="small" label={tx.status} color={tx.status === '成功' ? 'success' : 'warning'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default MarketMakerDashboard;
