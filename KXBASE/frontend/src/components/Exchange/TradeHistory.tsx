// src/components/Exchange/TradeHistory.tsx
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
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon, SwapHoriz } from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import { rawToFiat } from '@/utils/fiatAmount';

interface Trade {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyer: string;
  seller: string;
  ticketId: string;
  price: string;
  amount: string;
  fee: string;
  timestamp: number;
}

interface TradeHistoryProps {
  ticketId?: number;
  limit?: number;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ ticketId, limit = 50 }) => {
  const { currentBackendWallet } = useWalletStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrades();
  }, [currentBackendWallet, ticketId]);

  const loadTrades = async () => {
    if (!currentBackendWallet) return;

    setLoading(true);
    setError('');

    try {
      // 成交记录里 buyer/seller 是子账户地址，需要查主账户 + 所有子账户
      const subAccounts = await contractService.getSubAccounts(currentBackendWallet.address).catch(() => []);
      const allAccounts = [currentBackendWallet.address, ...subAccounts];

      const allTrades = await Promise.all(
        allAccounts.map(addr => contractService.getAccountTrades(addr, limit).catch(() => []))
      );

      // 合并去重（按 tradeId）
      const tradeMap = new Map<string, Trade>();
      allTrades.flat().forEach(raw => {
        const trade = formatTrade(raw);
        if (trade.tradeId !== '0') {
          tradeMap.set(trade.tradeId, trade);
        }
      });

      const formattedTrades = Array.from(tradeMap.values())
        .filter(trade => !ticketId || trade.ticketId === ticketId.toString())
        .sort((a, b) => b.timestamp - a.timestamp);

      console.log('Formatted trades:', formattedTrades);
      setTrades(formattedTrades);
    } catch (err: any) {
      console.error('Failed to load trades:', err);
      setError('加载成交记录失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTrade = (trade: any): Trade => {
    // Trade 结构体字段顺序：
    // [0] tradeId, [1] buyOrderId, [2] sellOrderId, [3] buyer, [4] seller,
    // [5] ticketId, [6] price, [7] amount, [8] fee, [9] timestamp, [10] tradeHash

    // 如果 trade 是数组（结构体展开），按索引访问
    if (Array.isArray(trade)) {
      return {
        tradeId: trade[0]?.toString() || '0',
        buyOrderId: trade[1]?.toString() || '0',
        sellOrderId: trade[2]?.toString() || '0',
        buyer: trade[3] || '',
        seller: trade[4] || '',
        ticketId: trade[5]?.toString() || '0',
        price: rawToFiat(trade[6]?.toString() || '0'),
        amount: trade[7]?.toString() || '0',
        fee: rawToFiat(trade[8]?.toString() || '0'),
        timestamp: Number(trade[9] || 0),
      };
    }

    // 如果 trade 是对象（已解析的结构体），按属性访问
    return {
      tradeId: trade.tradeId?.toString() || '0',
      buyOrderId: trade.buyOrderId?.toString() || '0',
      sellOrderId: trade.sellOrderId?.toString() || '0',
      buyer: trade.buyer || '',
      seller: trade.seller || '',
      ticketId: trade.ticketId?.toString() || '0',
      price: rawToFiat(trade.price?.toString() || '0'),
      amount: trade.amount?.toString() || '0',
      fee: rawToFiat(trade.fee?.toString() || '0'),
      timestamp: trade.timestamp?.toNumber ? trade.timestamp.toNumber() : Number(trade.timestamp || 0),
    };
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const [subAccountAddrs, setSubAccountAddrs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentBackendWallet) return;
    contractService.getSubAccounts(currentBackendWallet.address)
      .then(addrs => setSubAccountAddrs(new Set(addrs.map(a => a.toLowerCase()))))
      .catch(() => {});
  }, [currentBackendWallet]);

  const isBuyer = (trade: Trade) => {
    const buyer = trade.buyer.toLowerCase();
    return buyer === currentBackendWallet?.address.toLowerCase() || subAccountAddrs.has(buyer);
  };

  const calculateTotal = (trade: Trade) => {
    return (parseFloat(trade.price) * parseFloat(trade.amount)).toFixed(4);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">成交记录</Typography>
          <Tooltip title="刷新">
            <IconButton onClick={loadTrades} disabled={loading} size="small">
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>时间</TableCell>
                <TableCell>类型</TableCell>
                <TableCell align="right">价格</TableCell>
                <TableCell align="right">数量</TableCell>
                <TableCell align="right">总额</TableCell>
                <TableCell align="right">手续费</TableCell>
                <TableCell>对手方</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && trades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : trades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      暂无成交记录
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                trades.map((trade) => (
                  <TableRow key={trade.tradeId} hover>
                    <TableCell>
                      <Typography variant="caption">
                        {formatTimestamp(trade.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isBuyer(trade) ? '买入' : '卖出'}
                        size="small"
                        color={isBuyer(trade) ? 'success' : 'error'}
                        icon={<SwapHoriz />}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        ¥{trade.price}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {trade.amount} 张
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        ¥{calculateTotal(trade)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        ¥{trade.fee}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={isBuyer(trade) ? trade.seller : trade.buyer}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {truncateAddress(isBuyer(trade) ? trade.seller : trade.buyer)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {trades.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              共 {trades.length} 条记录
            </Typography>
            <Typography variant="caption" color="text.secondary">
              总成交量: {trades.reduce((sum, t) => sum + parseFloat(t.amount), 0)} 张
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
