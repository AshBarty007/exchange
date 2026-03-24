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
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { nodeService } from '../../services/nodeService';
import NodeStatusPanel from './NodeStatusPanel';

const ScenicSpotDashboard = () => {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [d, tx] = await Promise.all([nodeService.getScenicSpotData(), nodeService.getRecentTransactions('scenic_spot')]);
      setData(d); setTransactions(tx);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <NodeStatusPanel nodeType="scenic_spot" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[['已发行门票总数', data.totalTickets?.toLocaleString()], ['门票类型数', data.ticketTypes], ['已售出', data.soldTickets?.toLocaleString()], ['总收入 (Token)', data.revenue?.toLocaleString()]].map(([label, value]) => (
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
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>各类型门票发行量</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.ticketsByType}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend /><Bar dataKey="issued" fill="#667eea" name="已发行" /><Bar dataKey="sold" fill="#52c41a" name="已售出" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>门票状态分布</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.statusDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.statusDistribution.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>最近 NFT 交易记录</Typography>
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

export default ScenicSpotDashboard;
