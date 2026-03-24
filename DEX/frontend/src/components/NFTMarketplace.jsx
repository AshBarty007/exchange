import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import NFTCard from './marketplace/NFTCard';
import NFTDetail from './marketplace/NFTDetail';
import { orderService } from '../services/orderService';
import { SCENIC_ICONS } from './marketplace/NFTCard';

const DEFAULT_SPOTS = [
  { name: '故宫博物院', tickets: [{ ticketType: '普通门票', basePrice: 60 }, { ticketType: 'VIP门票', basePrice: 300 }, { ticketType: '年卡', basePrice: 800 }, { ticketType: '学生票', basePrice: 20 }, { ticketType: '夜场票', basePrice: 120 }] },
  { name: '长城·八达岭', tickets: [{ ticketType: '普通门票', basePrice: 45 }, { ticketType: 'VIP门票', basePrice: 200 }, { ticketType: '学生票', basePrice: 25 }] },
  { name: '西湖风景区', tickets: [{ ticketType: '普通门票', basePrice: 0 }, { ticketType: 'VIP门票', basePrice: 150 }, { ticketType: '夜场票', basePrice: 80 }] },
  { name: '张家界国家森林公园', tickets: [{ ticketType: '普通门票', basePrice: 225 }, { ticketType: 'VIP门票', basePrice: 500 }, { ticketType: '学生票', basePrice: 115 }, { ticketType: '年卡', basePrice: 1200 }] },
  { name: '九寨沟', tickets: [{ ticketType: '普通门票', basePrice: 169 }, { ticketType: 'VIP门票', basePrice: 400 }, { ticketType: '学生票', basePrice: 80 }] },
  { name: '黄山风景区', tickets: [{ ticketType: '普通门票', basePrice: 190 }, { ticketType: 'VIP门票', basePrice: 450 }, { ticketType: '学生票', basePrice: 95 }, { ticketType: '年卡', basePrice: 999 }] },
  { name: '丽江古城', tickets: [{ ticketType: '普通门票', basePrice: 50 }, { ticketType: 'VIP门票', basePrice: 180 }, { ticketType: '夜场票', basePrice: 100 }] },
  { name: '鼓浪屿', tickets: [{ ticketType: '普通门票', basePrice: 35 }, { ticketType: 'VIP门票', basePrice: 160 }, { ticketType: '学生票', basePrice: 18 }, { ticketType: '夜场票', basePrice: 70 }] },
];

export default function NFTMarketplace() {
  const [scenicSpots, setScenicSpots] = useState(DEFAULT_SPOTS);
  const [selectedSpot, setSelectedSpot] = useState('全部');
  const [selected, setSelected] = useState(null);
  const [mmInitialized, setMmInitialized] = useState(false);
  const [mmLoading, setMmLoading] = useState(false);
  const [marketMakers, setMarketMakers] = useState([]);
  const [showMM, setShowMM] = useState(false);

  useEffect(() => {
    const init = async () => {
      try { const spots = await orderService.getScenicSpots(); if (spots?.length > 0) setScenicSpots(spots); } catch {}
      try { const mm = await orderService.getMarketMakers(); setMmInitialized(mm.initialized); setMarketMakers(mm.marketMakers || []); } catch {}
    };
    init();
  }, []);

  const handleInitMM = async () => {
    setMmLoading(true);
    try {
      const res = await orderService.initMarketMakers();
      setMmInitialized(true); setMarketMakers(res.marketMakers || []);
      const spots = await orderService.getScenicSpots(); setScenicSpots(spots);
    } catch {}
    setMmLoading(false);
  };

  const allTickets = [];
  for (const spot of scenicSpots) {
    for (const ticket of (spot.tickets || [])) {
      allTickets.push({ scenicSpot: spot.name, ticketType: ticket.ticketType, basePrice: ticket.basePrice, listedCount: 0 });
    }
  }

  const filteredTickets = selectedSpot === '全部' ? allTickets : allTickets.filter(t => t.scenicSpot === selectedSpot);
  const spotNames = ['全部', ...scenicSpots.map(s => s.name)];

  if (selected) return <NFTDetail ticket={selected} onBack={() => setSelected(null)} />;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>NFT 门票市场</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>链上托管 · 撮合交易 · 实时结算 · {scenicSpots.length} 个景区</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          ['景区数量', scenicSpots.length],
          ['门票种类', allTickets.length],
          ['做市商', marketMakers.length],
        ].map(([label, value]) => (
          <Grid size={{ xs: 6, sm: 3 }} key={label}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" color="text.secondary">做市状态</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={mmInitialized ? '运行中' : '未启动'} color={mmInitialized ? 'success' : 'warning'} size="small" />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>做市商管理</Typography>
            <Typography variant="body2" color="text.secondary">10个做市商为每个景区提供买卖挂单流动性</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {!mmInitialized && (
              <Button variant="contained" onClick={handleInitMM} disabled={mmLoading}>
                {mmLoading ? '初始化中...' : '启动做市商'}
              </Button>
            )}
            <Button variant="outlined" color="inherit" onClick={() => setShowMM(!showMM)}>
              {showMM ? '收起' : '查看做市商'}
            </Button>
          </Stack>
        </Box>

        {showMM && marketMakers.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>名称</TableCell><TableCell>钱包地址</TableCell><TableCell>余额 (¥)</TableCell>
                <TableCell>持票数</TableCell><TableCell>挂单数</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {marketMakers.map(mm => (
                  <TableRow key={mm.userId}>
                    <TableCell sx={{ fontWeight: 600 }}>{mm.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'primary.main' }}>{mm.walletAddress}</TableCell>
                    <TableCell>{Number(mm.balance).toLocaleString()}</TableCell>
                    <TableCell>{mm.ticketsHeld}</TableCell>
                    <TableCell>{mm.ordersPlaced}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Stack direction="row" spacing={0.8} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
        {spotNames.map(name => (
          <Chip
            key={name}
            label={name !== '全部' ? `${SCENIC_ICONS[name] || '🎪'} ${name}` : name}
            onClick={() => setSelectedSpot(name)}
            color={selectedSpot === name ? 'primary' : 'default'}
            variant={selectedSpot === name ? 'filled' : 'outlined'}
            sx={{ fontWeight: 500 }}
          />
        ))}
      </Stack>

      {filteredTickets.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
          {mmInitialized ? '暂无门票数据' : '请先启动做市商以生成挂单数据'}
        </Typography>
      ) : (
        <Grid container spacing={2.5}>
          {filteredTickets.map(t => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`${t.scenicSpot}-${t.ticketType}`}>
              <NFTCard ticket={t} onClick={() => setSelected(t)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
