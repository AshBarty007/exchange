// src/components/Exchange/OrderBook.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Stack,
  Alert,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import contractService from '@/services/contractService';
import { rawToFiat } from '@/utils/fiatAmount';

interface Order {
  orderId: string;
  account: string;
  orderType: number;
  ticketId: string;
  price: string;
  amount: string;
  filledAmount: string;
  status: number;
}

interface BestPrices {
  bestBuyPrice: string;
  bestSellPrice: string;
  hasBuy: boolean;
  hasSell: boolean;
}

interface OrderBookProps {
  ticketId: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ ticketId }) => {
  const [buyOrders, setBuyOrders] = useState<Order[]>([]);
  const [sellOrders, setSellOrders] = useState<Order[]>([]);
  const [bestPrices, setBestPrices] = useState<BestPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrderBook();

    // 订阅实时更新
    const interval = setInterval(loadOrderBook, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  const loadOrderBook = async () => {
    setLoading(true);
    setError('');

    try {
      // 获取买单和卖单
      const [buyOrdersData, sellOrdersData, pricesData] = await Promise.all([
        contractService.getActiveOrders(ticketId, 0, 20), // BUY
        contractService.getActiveOrders(ticketId, 1, 20), // SELL
        contractService.getBestPrices(ticketId),
      ]);

      console.log('Buy orders data:', buyOrdersData);
      console.log('Sell orders data:', sellOrdersData);

      setBuyOrders(buyOrdersData.map(formatOrder));
      setSellOrders(sellOrdersData.map(formatOrder));
      setBestPrices({
        bestBuyPrice: rawToFiat(pricesData.bestBuyPrice),
        bestSellPrice: rawToFiat(pricesData.bestSellPrice),
        hasBuy: pricesData.hasBuy,
        hasSell: pricesData.hasSell,
      });
    } catch (err: any) {
      console.error('Failed to load order book:', err);
      setError('加载订单簿失败');
    } finally {
      setLoading(false);
    }
  };

  const formatOrder = (order: any): Order => {
    // Order 结构体字段顺序：
    // [0] orderId, [1] account, [2] orderType, [3] ticketId, [4] price,
    // [5] amount, [6] filledAmount, [7] status, [8] createdAt, [9] expiry,
    // [10] orderHash, [11] signature

    // 如果 order 是数组（结构体展开），按索引访问
    if (Array.isArray(order)) {
      return {
        orderId: order[0]?.toString() || '0',
        account: order[1] || '',
        orderType: Number(order[2] || 0),
        ticketId: order[3]?.toString() || '0',
        price: rawToFiat(order[4]?.toString() || '0'),
        amount: order[5]?.toString() || '0',
        filledAmount: order[6]?.toString() || '0',
        status: Number(order[7] || 0),
      };
    }

    // 如果 order 是对象（已解析的结构体），按属性访问
    return {
      orderId: order.orderId?.toString() || '0',
      account: order.account || '',
      orderType: order.orderType || 0,
      ticketId: order.ticketId?.toString() || '0',
      price: rawToFiat(order.price?.toString() || '0'),
      amount: order.amount?.toString() || '0',
      filledAmount: order.filledAmount?.toString() || '0',
      status: order.status || 0,
    };
  };

  const calculateRemaining = (order: Order) => {
    return (Number(order.amount) - Number(order.filledAmount)).toString();
  };

  const getSpread = () => {
    if (!bestPrices?.hasBuy || !bestPrices?.hasSell) return null;
    const spread = Number(bestPrices.bestSellPrice) - Number(bestPrices.bestBuyPrice);
    const spreadPercent = (spread / Number(bestPrices.bestBuyPrice)) * 100;
    return { spread: spread.toFixed(4), spreadPercent: spreadPercent.toFixed(2) };
  };

  const spread = getSpread();

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {/* 标题和最佳价格 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">订单簿</Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {/* 最佳买卖价和价差 */}
          {bestPrices && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {bestPrices.hasBuy && (
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'success.light', flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="success.dark">买一价</Typography>
                  <Typography variant="h6" color="success.dark" fontWeight="bold">
                    ¥{bestPrices.bestBuyPrice}
                  </Typography>
                </Paper>
              )}

              {bestPrices.hasSell && (
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'error.light', flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="error.dark">卖一价</Typography>
                  <Typography variant="h6" color="error.dark" fontWeight="bold">
                    ¥{bestPrices.bestSellPrice}
                  </Typography>
                </Paper>
              )}

              {spread && (
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default', flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">价差</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{spread.spread} ({spread.spreadPercent}%)
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* 卖单列表 */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp color="error" />
              <Typography variant="subtitle2" color="error.main">卖单 ({sellOrders.length})</Typography>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>价格</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">剩余</TableCell>
                    <TableCell align="right">状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sellOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">暂无卖单</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sellOrders.map((order) => (
                      <TableRow
                        key={order.orderId}
                        hover
                        sx={{ '&:hover': { bgcolor: 'error.lighter' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="error.main" fontWeight="medium">
                            ¥{order.price}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{order.amount}</TableCell>
                        <TableCell align="right">{calculateRemaining(order)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={order.status === 0 ? '待成交' : '部分成交'}
                            size="small"
                            color={order.status === 0 ? 'default' : 'warning'}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* 买单列表 */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingDown color="success" />
              <Typography variant="subtitle2" color="success.main">买单 ({buyOrders.length})</Typography>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>价格</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">剩余</TableCell>
                    <TableCell align="right">状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buyOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">暂无买单</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    buyOrders.map((order) => (
                      <TableRow
                        key={order.orderId}
                        hover
                        sx={{ '&:hover': { bgcolor: 'success.lighter' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="success.main" fontWeight="medium">
                            ¥{order.price}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{order.amount}</TableCell>
                        <TableCell align="right">{calculateRemaining(order)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={order.status === 0 ? '待成交' : '部分成交'}
                            size="small"
                            color={order.status === 0 ? 'default' : 'warning'}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default OrderBook;
