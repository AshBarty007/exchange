// src/components/Exchange/MarketDepth.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import contractService from '@/services/contractService';
import { rawToFiat } from '@/utils/fiatAmount';

interface MarketDepthProps {
  ticketId: number;
  levels?: number;
}

interface DepthLevel {
  price: string;
  amount: string;
  total: string;
  percentage: number;
}

const MarketDepth: React.FC<MarketDepthProps> = ({ ticketId, levels = 10 }) => {
  const [buyDepth, setBuyDepth] = useState<DepthLevel[]>([]);
  const [sellDepth, setSellDepth] = useState<DepthLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarketDepth();

    const interval = setInterval(loadMarketDepth, 10000);
    return () => clearInterval(interval);
  }, [ticketId, levels]);

  const loadMarketDepth = async () => {
    setLoading(true);
    setError('');

    try {
      const depth = await contractService.getMarketDepth(ticketId, levels);
      console.log('Market depth data:', depth);

      // 处理买单深度
      const buyLevels: DepthLevel[] = [];
      let buyTotal = 0;
      const maxBuyAmount = Math.max(...depth.buyAmounts.map(a => parseFloat(a)), 0);

      for (let i = 0; i < depth.buyPrices.length; i++) {
        const amount = parseFloat(depth.buyAmounts[i]);
        buyTotal += amount;
        buyLevels.push({
          price: rawToFiat(depth.buyPrices[i]),
          amount: depth.buyAmounts[i],
          total: buyTotal.toString(),
          percentage: maxBuyAmount > 0 ? (amount / maxBuyAmount) * 100 : 0,
        });
      }

      // 处理卖单深度
      const sellLevels: DepthLevel[] = [];
      let sellTotal = 0;
      const maxSellAmount = Math.max(...depth.sellAmounts.map(a => parseFloat(a)), 0);

      for (let i = 0; i < depth.sellPrices.length; i++) {
        const amount = parseFloat(depth.sellAmounts[i]);
        sellTotal += amount;
        sellLevels.push({
          price: rawToFiat(depth.sellPrices[i]),
          amount: depth.sellAmounts[i],
          total: sellTotal.toString(),
          percentage: maxSellAmount > 0 ? (amount / maxSellAmount) * 100 : 0,
        });
      }

      setBuyDepth(buyLevels);
      setSellDepth(sellLevels);
    } catch (err: any) {
      console.error('Failed to load market depth:', err);
      setError('加载市场深度失败');
    } finally {
      setLoading(false);
    }
  };

  const DepthBar: React.FC<{ level: DepthLevel; color: string; align: 'left' | 'right' }> = ({
    level,
    color,
    align,
  }) => (
    <Box
      sx={{
        position: 'relative',
        height: 32,
        mb: 0.5,
        display: 'flex',
        alignItems: 'center',
        px: 1,
      }}
    >
      {/* 背景条 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          [align]: 0,
          height: '100%',
          width: `${level.percentage}%`,
          bgcolor: color,
          opacity: 0.2,
          transition: 'width 0.3s ease',
        }}
      />

      {/* 内容 */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          zIndex: 1,
        }}
      >
        <Typography variant="body2" fontWeight="medium" sx={{ minWidth: 80 }}>
          ¥{level.price}
        </Typography>
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
          {level.amount}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
          {level.total}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">订单簿</Typography>
          <Tooltip title="刷新">
            <IconButton onClick={loadMarketDepth} disabled={loading} size="small">
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={3}>
          {/* 卖单深度 */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">价格</Typography>
              <Typography variant="caption" color="text.secondary">数量</Typography>
              <Typography variant="caption" color="text.secondary">累计</Typography>
            </Box>

            <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
              {sellDepth.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  暂无卖单
                </Typography>
              ) : (
                [...sellDepth].reverse().map((level, index) => (
                  <DepthBar
                    key={`sell-${index}`}
                    level={level}
                    color="error.main"
                    align="right"
                  />
                ))
              )}
            </Paper>
          </Box>

          {/* 分隔线 */}
          <Box sx={{ borderTop: 2, borderColor: 'divider', py: 1 }}>
            
          </Box>

          {/* 买单深度 */}
          <Box>
            <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
              {buyDepth.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  暂无买单
                </Typography>
              ) : (
                buyDepth.map((level, index) => (
                  <DepthBar
                    key={`buy-${index}`}
                    level={level}
                    color="success.main"
                    align="left"
                  />
                ))
              )}
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">价格</Typography>
              <Typography variant="caption" color="text.secondary">数量</Typography>
              <Typography variant="caption" color="text.secondary">累计</Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MarketDepth;
