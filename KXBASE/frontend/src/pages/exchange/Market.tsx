import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Stack,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LocalActivity as TicketIcon,
  AttachMoney as PriceIcon,
  CalendarToday as CalendarIcon,
  ShowChart as ExchangeIcon,
} from '@mui/icons-material';
import contractService from '@/services/contractService';
import { rawToFiat } from '@/utils/fiatAmount';
import { usePortalBase } from '@/hooks/usePortalBase';

interface TicketInfo {
  ticketId: number;
  name: string;
  totalSupply: number;
  minPrice: string;
  maxPrice: string;
  validFrom: number;
  validUntil: number;
  info: string;
  active: boolean;
  createdAt: number;
  activeOrders: number;
  totalTrades: number;
  totalVolume: string;
}

function normalizeTimestamp(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return 0;
  return input < 1_000_000_000_000 ? input * 1000 : input;
}

function formatDate(input: number): string {
  const ts = normalizeTimestamp(input);
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('zh-CN');
}

function formatPrice(raw: string): string {
  if (!raw || raw === '0') return '0';
  try { return rawToFiat(raw); } catch { return raw; }
}

async function fetchAllTickets(): Promise<TicketInfo[]> {
  const tickets: TicketInfo[] = [];
  let id = 1;
  while (true) {
    try {
      const info = await contractService.getTicketInfo(id);
      const ticketId = Number(info[0]);
      if (!ticketId) break;

      const active = info[9] !== false && info[9] !== 'false' && info[9] !== '0';
      if (active) {
        // Fetch order stats for this ticket
        let activeOrders = 0;
        let totalTrades = 0;
        let totalVolume = '0';
        try {
          const stats = await contractService.getOrderStats(id);
          activeOrders = stats.activeOrders;
          totalTrades = stats.totalTrades;
          totalVolume = stats.totalVolume;
        } catch {
          // ignore stats failure
        }

        tickets.push({
          ticketId,
          name: String(info[2] || `门票 #${id}`),
          totalSupply: Number(info[3] || 0),
          minPrice: String(info[4] || '0'),
          maxPrice: String(info[5] || '0'),
          validFrom: Number(info[6] || 0),
          validUntil: Number(info[7] || 0),
          info: String(info[8] || ''),
          active,
          createdAt: Number(info[10] || 0),
          activeOrders,
          totalTrades,
          totalVolume,
        });
      }
      id++;
      if (id > 100) break;
    } catch {
      break;
    }
  }
  return tickets;
}

const Market: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchAllTickets();
      setTickets(list);
    } catch (err: any) {
      setError('获取门票列表失败: ' + (err.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((ticket) =>
    ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticketId.toString().includes(searchQuery)
  );

  const handleGoToExchange = (_ticketId: number) => {
    // Navigate to exchange — the exchange page auto-selects the first ticket,
    // so we just navigate there. A future enhancement could pass the ticketId via state.
    navigate(`${portalBase}/trading`);
  };

  return (
    <Box>
      <Stack spacing={3}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              门票市场
            </Typography>
            <Typography variant="body2" color="text.secondary">
              浏览链上所有已发行门票，前往交易所买卖
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchTickets}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 搜索栏 */}
        <Card>
          <CardContent>
            <TextField
              fullWidth
              placeholder="搜索门票名称或 ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* 门票列表 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <TicketIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {searchQuery ? '未找到匹配的门票' : '暂无门票上架'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredTickets.map((ticket) => (
              <Grid key={ticket.ticketId} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                      <TicketIcon color="primary" sx={{ mt: 0.3 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                          {ticket.name}
                        </Typography>
                        <Chip label={`ID #${ticket.ticketId}`} size="small" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} />
                      </Box>
                    </Box>

                    <Stack spacing={1.5}>
                      {/* 价格区间 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PriceIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          ¥{formatPrice(ticket.minPrice)} ~ ¥{formatPrice(ticket.maxPrice)}
                        </Typography>
                      </Box>

                      <Divider />

                      {/* 发行量 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">总发行量</Typography>
                        <Typography variant="body2" fontWeight="medium">{ticket.totalSupply} 张</Typography>
                      </Box>

                      {/* 有效期 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(ticket.validFrom)} ~ {formatDate(ticket.validUntil)}
                        </Typography>
                      </Box>

                      <Divider />

                      {/* 市场数据 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">活跃挂单</Typography>
                        <Chip
                          label={`${ticket.activeOrders} 笔`}
                          size="small"
                          color={ticket.activeOrders > 0 ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">历史成交</Typography>
                        <Typography variant="body2" fontWeight="medium">{ticket.totalTrades} 笔</Typography>
                      </Box>

                      {ticket.totalVolume && ticket.totalVolume !== '0' && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">成交总额</Typography>
                          <Typography variant="body2" fontWeight="medium" color="primary">
                            ¥{formatPrice(ticket.totalVolume)}
                          </Typography>
                        </Box>
                      )}

                      {/* 说明 */}
                      {ticket.info && (
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {ticket.info}
                          </Typography>
                        </Paper>
                      )}
                    </Stack>
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ExchangeIcon />}
                      onClick={() => handleGoToExchange(ticket.ticketId)}
                    >
                      前往交易所
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 说明 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>使用说明</Typography>
            <Stack spacing={1}>
              {[
                '门票市场展示链上所有已发行的活跃门票',
                '点击「前往交易所」可在交易所进行买卖，支持订单簿和一口价两种模式',
                '价格区间由发行方设定，交易价格必须在此范围内',
                '活跃挂单数量越多，流动性越好',
              ].map((text, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {i + 1}. {text}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default Market;
