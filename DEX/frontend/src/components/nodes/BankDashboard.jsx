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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { nodeService } from '../../services/nodeService';
import NodeStatusPanel from './NodeStatusPanel';

const BankDashboard = () => {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [d, tx] = await Promise.all([nodeService.getBankData(), nodeService.getRecentTransactions('bank')]);
      setData(d); setTransactions(tx);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <NodeStatusPanel nodeType="bank" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[['已铸造凭证总量', data.totalMinted?.toLocaleString()], ['待处理存款证明', data.pendingProofs], ['托管账户数', data.custodyAccounts], ['托管总值 (Token)', data.custodyValue?.toLocaleString()]].map(([label, value]) => (
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
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>每日铸造/销毁量</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.dailyMintBurn}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend /><Bar dataKey="minted" fill="#52c41a" name="铸造" /><Bar dataKey="burned" fill="#ff4d4f" name="销毁" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>总供应量趋势</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.supplyTrend}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Line type="monotone" dataKey="supply" stroke="#667eea" strokeWidth={2} dot={false} name="总供应量" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>存款证明记录</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>证明ID</TableCell><TableCell>存款人</TableCell><TableCell>金额 (Token)</TableCell><TableCell>状态</TableCell><TableCell>时间</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentProofs.map((proof, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{proof.id}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{proof.depositor}</TableCell>
                  <TableCell>{proof.amount?.toLocaleString()}</TableCell>
                  <TableCell><Chip size="small" label={proof.status} color={proof.status === '已铸造' ? 'success' : proof.status === '已通过' ? 'info' : 'warning'} /></TableCell>
                  <TableCell>{proof.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>最近交易记录</Typography>
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

export default BankDashboard;
