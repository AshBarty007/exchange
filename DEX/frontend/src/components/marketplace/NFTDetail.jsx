import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { TICKET_META, SCENIC_ICONS } from './NFTCard';
import DepthChart from './DepthChart';
import PriceChart from './PriceChart';
import OrderPanel from './OrderPanel';
import OrderBookPanel from './OrderBookPanel';
import RecentTrades from './RecentTrades';
import { orderService } from '../../services/orderService';

export default function NFTDetail({ ticket, onBack }) {
  const meta = TICKET_META[ticket.ticketType] || TICKET_META['普通门票'];
  const scenicIcon = SCENIC_ICONS[ticket.scenicSpot] || '🎪';
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [high24h, setHigh24h] = useState(null);
  const [low24h, setLow24h] = useState(null);
  const [vol24h, setVol24h] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const trades = await orderService.getRecentTrades(50);
        const filtered = trades.filter(t => t.ticketType === ticket.ticketType);
        if (filtered.length > 0) {
          const latest = Number(filtered[0].price);
          setLastPrice(latest);
          const prices = filtered.map(t => Number(t.price));
          setHigh24h(Math.max(...prices));
          setLow24h(Math.min(...prices));
          setVol24h(filtered.length);
          if (filtered.length > 1) {
            const prev = Number(filtered[filtered.length - 1].price);
            setPriceChange(prev > 0 ? ((latest - prev) / prev * 100) : 0);
          }
        }
      } catch {
        setLastPrice(ticket.basePrice);
        setHigh24h(ticket.basePrice * 1.05);
        setLow24h(ticket.basePrice * 0.95);
        setVol24h(0);
      }
    };
    fetchStats();
    const timer = setInterval(fetchStats, 10000);
    return () => clearInterval(timer);
  }, [ticket.ticketType, ticket.basePrice]);

  const displayPrice = lastPrice ?? ticket.basePrice;
  const isUp = priceChange >= 0;

  return (
    <Box>
      {/* Top bar: back + compact ticket info */}
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={onBack}>
          返回
        </Button>

        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.gradient, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 18 }}>{meta.icon}</Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{ticket.ticketType}</Typography>
            <Typography variant="caption" color="text.secondary">{scenicIcon} {ticket.scenicSpot}</Typography>
          </Box>
          <Typography variant="caption" color="text.disabled">NFT合约: 0xNFTTicket</Typography>
        </Box>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {/* Current price */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: isUp ? 'success.main' : 'error.main', lineHeight: 1.2 }}>
              ¥{displayPrice?.toFixed(2)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.3 }}>
              {isUp ? <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />}
              <Typography variant="caption" sx={{ color: isUp ? 'success.main' : 'error.main', fontWeight: 600 }}>
                {isUp ? '+' : ''}{priceChange.toFixed(2)}%
              </Typography>
            </Box>
          </Box>

          {/* Stats */}
          {[
            ['24h高', high24h != null ? `¥${high24h.toFixed(2)}` : '—'],
            ['24h低', low24h != null ? `¥${low24h.toFixed(2)}` : '—'],
            ['24h量', vol24h],
            ['基准价', `¥${ticket.basePrice}`],
          ].map(([label, value]) => (
            <Box key={label} sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Main trading layout: chart left, order right */}
      <Grid container spacing={2} alignItems="flex-start">
        {/* Left: charts + orderbook */}
        <Grid size={{ xs: 12, md: 8 }}>
          <PriceChart ticketType={ticket.ticketType} />

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <OrderBookPanel ticketType={ticket.ticketType} scenicSpot={ticket.scenicSpot} />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <RecentTrades ticketType={ticket.ticketType} />
            </Grid>
          </Grid>

          <DepthChart ticketType={ticket.ticketType} scenicSpot={ticket.scenicSpot} />
        </Grid>

        {/* Right: order panel sticky */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: 'sticky', top: 80 }}>
            <OrderPanel ticketType={ticket.ticketType} scenicSpot={ticket.scenicSpot} basePrice={ticket.basePrice} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
