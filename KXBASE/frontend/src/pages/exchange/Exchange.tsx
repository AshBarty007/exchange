// src/pages/Exchange.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ShowChart as ChartIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as PriceIcon,
  BugReport as BugIcon,
  CheckCircle as OkIcon,
  Error as ErrorIcon,
  LocalOffer as AuctionIcon,
  SwapHoriz as OrderBookIcon,
} from '@mui/icons-material';
import contractInteractionService, { ContractInteractionRecord } from '@/services/contractInteractionService';
import PlaceOrder from '@/components/Exchange/PlaceOrder';
import TradeHistory from '@/components/Exchange/TradeHistory';
import MarketDepth from '@/components/Exchange/MarketDepth';
import Auction from '@/components/Exchange/Auction';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import { rawToFiat } from '@/utils/fiatAmount';

function normalizeTimestamp(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return 0;
  return input < 1_000_000_000_000 ? input * 1000 : input;
}

function formatDate(input: number): string {
  const ts = normalizeTimestamp(input);
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('zh-CN');
}

function formatDateTime(input: number): string {
  const ts = normalizeTimestamp(input);
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', { hour12: false });
}

function formatPrice(raw: string): string {
  if (!raw || raw === '0') return '0';
  try { return rawToFiat(raw); } catch { return raw; }
}

interface TicketOption {
  id: number;
  name: string;
  minPrice: string;
  maxPrice: string;
  validFrom: number;
  validUntil: number;
  createdAt: number;
  info: string;
}

// 从 ID=1 开始逐个查询，直到 getTicketInfo 返回 ticketId=0（不存在）为止
async function fetchAllTickets(): Promise<TicketOption[]> {
  const tickets: TicketOption[] = [];
  let id = 1;
  while (true) {
    try {
      // 字段顺序: [0]ticketId [1]scenicArea [2]name [3]totalSupply
      // [4]minPrice [5]maxPrice [6]validFrom [7]validUntil [8]infoHash [9]active [10]createdAt
      const info = await contractService.getTicketInfo(id);
      const ticketId = Number(info[0]);
      if (!ticketId) break;

      const name = String(info[2] || `门票 #${id}`);
      const active = info[9] !== false && info[9] !== 'false' && info[9] !== '0';

      console.log(`Ticket ${id}: name=${name}, active=${active}`);

      if (active) {
        tickets.push({
          id: ticketId,
          name,
          minPrice: String(info[4] || '0'),
          maxPrice: String(info[5] || '0'),
          validFrom: Number(info[6] || 0),
          validUntil: Number(info[7] || 0),
          info: String(info[8] || ''),
          createdAt: Number(info[10] || 0),
        });
      }
      id++;

      // 安全限制：最多查询100个门票
      if (id > 100) break;
    } catch (err) {
      console.log(`Ticket ${id} fetch error:`, err);
      break;
    }
  }
  console.log('All tickets:', tickets);
  return tickets;
}

// ==================== 调试组件 ====================

function isReverted(record: ContractInteractionRecord): boolean {
  if (record.mode !== 'send') return false;
  // receipt.status === '0x0' 表示链上失败
  if (record.receipt?.status === '0x0') return true;
  // 后端标记的 reverted 字段
  if (record.interaction?.response?.reverted) return true;
  return false;
}

const TxLogEntry: React.FC<{ record: ContractInteractionRecord }> = ({ record }) => {
  const reverted = isReverted(record);
  const revertMsg: string =
    record.interaction?.response?.revertMessage ||
    record.interaction?.response?.message ||
    record.receipt?.revertMessage ||
    '';

  const time = new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour12: false });

  const requestData = record.interaction?.request ?? {
    contractName: record.contractName,
    contractAddress: record.contractAddress,
    method: record.method,
    params: record.params,
  };

  const responseData = record.interaction?.response ?? {
    txHash: record.txHash,
    output: record.output,
    receipt: record.receipt,
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: reverted ? 'error.main' : record.mode === 'send' ? 'success.light' : 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* 摘要行 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
        {reverted
          ? <ErrorIcon fontSize="small" color="error" />
          : <OkIcon fontSize="small" color={record.mode === 'send' ? 'success' : 'disabled'} />
        }
        <Chip
          label={record.mode === 'send' ? '上链' : '查询'}
          size="small"
          color={record.mode === 'send' ? 'primary' : 'default'}
          sx={{ height: 18, fontSize: '0.65rem' }}
        />
        {record.contractName && (
          <Chip label={record.contractName} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
        )}
        <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.method}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>{time}</Typography>
      </Box>

      {/* revert 原因 */}
      {reverted && (
        <Alert severity="error" sx={{ borderRadius: 0, py: 0.5, px: 1.5, '& .MuiAlert-message': { fontSize: '0.78rem' } }}>
          {revertMsg || '链上交易被回滚（无 revert 原因，可能是 require 未带 message 或 gas 不足）'}
        </Alert>
      )}

      {/* 详情 */}
      <Divider />
      <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
            发送内容
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0, p: 1,
              bgcolor: 'background.default',
              borderRadius: 1,
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {JSON.stringify(requestData, null, 2)}
          </Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
            链上返回
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0, p: 1,
              bgcolor: reverted ? 'error.lighter' : 'background.default',
              borderRadius: 1,
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {JSON.stringify(responseData, null, 2)}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

const Exchange: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();
  const [selectedTicketId, setSelectedTicketId] = useState<number | ''>('');
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [subAccounts, setSubAccounts] = useState<Array<{ address: string; label: string }>>([]);
  const [txLogs, setTxLogs] = useState<ContractInteractionRecord[]>([]);
  const [tradeMode, setTradeMode] = useState<'orderbook' | 'auction'>('orderbook');

  // 订阅所有合约交互记录，只显示 Exchange 下单相关操作
  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.contractName === 'Exchange' && record.method?.includes('createOrderFor')) {
        setTxLogs((prev) => [record, ...prev].slice(0, 10));
      }
    });
  }, []);

  useEffect(() => {
    setLoadingTickets(true);
    fetchAllTickets()
      .then((list) => {
        setTickets(list);
        if (list.length > 0) {
          setSelectedTicketId(list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tickets:', err);
      })
      .finally(() => setLoadingTickets(false));
  }, []);

  // 获取子账户列表，并附带当前选中门票的余额
  useEffect(() => {
    if (!currentBackendWallet) {
      setSubAccounts([]);
      return;
    }
    contractService.getSubAccounts(currentBackendWallet.address)
      .then(async (addrs) => {
        if (addrs.length === 0) {
          setSubAccounts([]);
          return;
        }
        const ticketId = selectedTicketId !== '' ? (selectedTicketId as number) : null;
        const labels = await Promise.all(addrs.map(async (addr, i) => {
          let label = `子账户 #${i + 1}`;
          if (ticketId !== null) {
            try {
              const bal = await contractService.getTicketBalance(addr, ticketId);
              if (parseInt(bal) > 0) {
                label += ` (持有 ${bal} 张)`;
              }
            } catch {
              // ignore
            }
          }
          return { address: addr, label };
        }));
        setSubAccounts(labels);
      })
      .catch((err) => {
        console.error('Failed to fetch sub-accounts:', err);
        setSubAccounts([]);
      });
  }, [currentBackendWallet, selectedTicketId]);

  const handleOrderCreated = useCallback(() => {
    console.log('Order created, refreshing...');
  }, []);

  if (!currentBackendWallet) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">请先前往钱包管理页面选择账户</Alert>
      </Box>
    );
  }

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            交易所
          </Typography>
          <Typography variant="body2" color="text.secondary">
            链上自动撮合交易系统 - 实时成交
          </Typography>
        </Box>

        {/* 门票选择 */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ChartIcon color="primary" />
                <Typography variant="h6">选择门票</Typography>
                <Chip label="自动撮合" color="success" size="small" sx={{ ml: 'auto' }} />
              </Box>

              {loadingTickets ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : tickets.length === 0 ? (
                <Alert severity="warning">暂无可交易门票</Alert>
              ) : (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {tickets.map((ticket) => {
                    const selected = selectedTicketId === ticket.id;
                    return (
                      <Card
                        key={ticket.id}
                        sx={{
                          width: 260,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: selected ? 'primary.main' : 'divider',
                          bgcolor: selected ? 'primary.lighter' : 'background.paper',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'translateY(-2px)',
                            boxShadow: 3,
                          },
                        }}
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                                {ticket.name}
                              </Typography>
                              {selected && <Chip label="已选" color="primary" size="small" sx={{ ml: 1, flexShrink: 0 }} />}
                            </Box>

                            <Chip label={`ID #${ticket.id}`} size="small" variant="outlined" sx={{ alignSelf: 'flex-start', height: 20, fontSize: '0.7rem' }} />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PriceIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography variant="body2" color="success.main" fontWeight="bold">
                                ¥{formatPrice(ticket.minPrice)} ~ ¥{formatPrice(ticket.maxPrice)}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                              <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary', mt: '2px' }} />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {formatDate(ticket.validFrom)} ~ {formatDate(ticket.validUntil)}
                              </Typography>
                            </Box>

                            <Typography variant="caption" color="text.disabled">
                              发行于 {formatDateTime(ticket.createdAt)}
                            </Typography>

                            {ticket.info && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
                                  pt: 1,
                                }}
                              >
                                {ticket.info}
                              </Typography>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {selectedTicketId === '' && !loadingTickets && tickets.length > 0 && (
          <Alert severity="info">请点击上方门票卡片选择要交易的门票</Alert>
        )}

        {/* 交易模式切换 */}
        {selectedTicketId !== '' && (
          <Card>
            <Tabs
              value={tradeMode}
              onChange={(_, v) => setTradeMode(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab
                value="orderbook"
                label="订单簿交易"
                icon={<OrderBookIcon />}
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
              <Tab
                value="auction"
                label="一口价拍卖"
                icon={<AuctionIcon />}
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
            </Tabs>

            <CardContent>
              {/* 订单簿模式 */}
              {tradeMode === 'orderbook' && (
                <Stack spacing={3}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <MarketDepth ticketId={selectedTicketId as number} levels={10} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <PlaceOrder
                        ticketId={selectedTicketId as number}
                        subAccounts={subAccounts}
                        onOrderCreated={handleOrderCreated}
                        minPriceRaw={selectedTicket?.minPrice}
                        maxPriceRaw={selectedTicket?.maxPrice}
                      />
                    </Grid>
                  </Grid>
                  <TradeHistory ticketId={selectedTicketId as number} limit={50} />
                </Stack>
              )}

              {/* 一口价拍卖模式 */}
              {tradeMode === 'auction' && (
                <Auction
                  ticketId={selectedTicketId as number}
                  subAccounts={subAccounts}
                  minPriceRaw={selectedTicket?.minPrice}
                  maxPriceRaw={selectedTicket?.maxPrice}
                  onDone={handleOrderCreated}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              使用说明
            </Typography>
            <Stack spacing={1}>
              {tradeMode === 'orderbook' ? [
                '选择要交易的门票，切换到「订单簿交易」模式',
                '买单：子账户持有法币；卖单：子账户持有门票',
                '首次交易需先授权合约（买方授权法币，卖方授权门票）',
                '主账户签名下单，价格匹配时链上自动撮合成交',
                '手续费率为 0.5%，从总交易额中扣除',
              ] : [
                '切换到「一口价拍卖」模式',
                '卖家：选择持有门票的子账户，设定一口价和数量，发布挂单',
                '买家：在挂单列表中选择心仪的挂单，点击「立即购买」',
                '系统以卖家一口价创建买单，链上自动撮合，即时成交',
                '手续费率为 0.5%，由卖家承担',
              ].map((text, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {i + 1}. {text}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* 调试面板 */}
        <Card sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BugIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1 }}>
                交易调试面板
              </Typography>
              {txLogs.length > 0 && (
                <Chip
                  label={`最近 ${txLogs.length} 条`}
                  size="small"
                  color={txLogs.some(isReverted) ? 'error' : 'default'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            {txLogs.length === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
                暂无记录，执行下单或授权操作后会在此显示
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {txLogs.map((log) => (
                  log.contractName === 'Exchange' ? <TxLogEntry key={`${log.timestamp}-${log.method}`} record={log} /> : null
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default Exchange;
