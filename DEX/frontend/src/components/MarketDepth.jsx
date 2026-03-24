import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { orderService } from '../services/orderService';

const MarketDepth = () => {
  const [depth, setDepth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState(10);

  useEffect(() => {
    loadMarketDepth();
    const interval = setInterval(loadMarketDepth, 5000);
    return () => clearInterval(interval);
  }, [levels]);

  const loadMarketDepth = async () => {
    setLoading(true);
    try { setDepth(await orderService.getMarketDepth(levels)); } catch {}
    setLoading(false);
  };

  return (
    <Card><CardContent sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>市场深度</Typography>

      <TextField label="显示档位" select value={levels} onChange={(e) => setLevels(Number(e.target.value))} sx={{ maxWidth: 200, mb: 3 }}>
        <MenuItem value={5}>5档</MenuItem>
        <MenuItem value={10}>10档</MenuItem>
        <MenuItem value={20}>20档</MenuItem>
      </TextField>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : depth ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" sx={{ color: 'success.main', mb: 2 }}>买盘 (BUY)</Typography>
            {depth.buyOrders?.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>价格</TableCell><TableCell>数量</TableCell><TableCell>累计</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {depth.buyOrders.map((order, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>{order.price}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>暂无买单</Typography>}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" sx={{ color: 'error.main', mb: 2 }}>卖盘 (SELL)</Typography>
            {depth.sellOrders?.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>价格</TableCell><TableCell>数量</TableCell><TableCell>累计</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {depth.sellOrders.map((order, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>{order.price}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>暂无卖单</Typography>}
          </Grid>
        </Grid>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>暂无市场数据</Typography>
      )}

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>数据每5秒自动刷新</Typography>
    </CardContent></Card>
  );
};

export default MarketDepth;
