import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  AccountBalanceWallet as WalletIcon,
  SwapHoriz as TransferIcon,
  Refresh as RefreshIcon,
  LocalActivity as TicketIcon,
  ContentCopy as CopyIcon,
  AccountTree as SubAccountIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import contractInteractionService, { ContractInteractionRecord } from '@/services/contractInteractionService';
import ContractInteractionPanel from '@/components/ContractInteractionPanel';
import { fiatToRaw, rawToFiat } from '@/utils/fiatAmount';
import Trading from '@/pages/exchange/Trading';

interface TicketAsset {
  ticketId: number;
  name: string;
  balance: string;
  totalSupply: string;
  minPrice: string;
  maxPrice: string;
  validFrom: number;
  validUntil: number;
  info: string;
  active: boolean;
  issuer: string;
  validCreatedAt?: number;
}

interface AccountAsset {
  address: string;
  label: string;
  isMain: boolean;
  fiatRaw: string;
  fiatBalance: string;
  tickets: TicketAsset[];
  loading: boolean;
}

function truncAddr(addr: string) {
  return addr ? `${addr.slice(0, 10)}...${addr.slice(-8)}` : '';
}

function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function parseBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'bigint') return value !== 0n;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
}

function normalizeTimestamp(input: number): number {
  if (!Number.isFinite(input) || input <= 0) return 0;
  // Backward compatible with contracts that may return second-level timestamps.
  return input < 1_000_000_000_000 ? input * 1000 : input;
}

function formatTicketTime(input: number): string {
  const timestamp = normalizeTimestamp(input);
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatTicketRange(validFrom: number, validUntil: number): string {
  const from = formatTicketTime(validFrom);
  const until = formatTicketTime(validUntil);
  if (from === '-' && until === '-') return '-';
  return `${from} ~ ${until}`;
}

function formatTicketPrice(rawPrice: string): string {
  const value = String(rawPrice || '0').trim();
  if (!value) return '0';
  // Backward compatible with old data that may have stored integer yuan directly.
  if (/^\d+$/.test(value)) {
    const asInt = BigInt(value);
    if (asInt > 0n && asInt < 10000n) {
      return value;
    }
  }
  try {
    return rawToFiat(value);
  } catch {
    return value;
  }
}

async function fetchAccountAsset(address: string, label: string, isMain: boolean): Promise<AccountAsset> {
  // Fetch fiat balance — this is the primary data, must succeed
  const fiatRaw = await contractService.getFiatBalance(address).catch(() => '0');
  const fiatBalance = rawToFiat(fiatRaw || '0');

  // Fetch ticket IDs — optional, skip if Ticket contract not registered
  let ticketIds: number[] = [];
  if (contractService.getContract('Ticket')) {
    ticketIds = await contractService.getAccountTicketIds(address).catch(() => []);
  }

  const tickets: TicketAsset[] = [];
  await Promise.all(
    ticketIds.map(async (ticketId) => {
      const bal = await contractService.getTicketBalance(address, ticketId).catch(() => '0');
      if (Number(bal) <= 0) {
        return;
      }
      let name = `门票 #${ticketId}`;
      let totalSupply = '0';
      let minPriceRaw = '0';
      let maxPriceRaw = '0';
      let validFrom = 0;
      let validUntil = 0;
      let info = '';
      let active = true;
      let issuer = '';
      let validCreatedAt = 0;
      try {
        const [id, ticketIssuer, ticketName, supply, minP, maxP, fromTs, untilTs, infoHash, enabled, createdAt] = await contractService.getTicketInfo(ticketId);
        name = String(ticketName || `门票 #${id ?? ticketId}`);
        totalSupply = String(supply || '0');
        minPriceRaw = String(minP || '0');
        maxPriceRaw = String(maxP || '0');
        validFrom = Number(fromTs || 0);
        validUntil = Number(untilTs || 0);
        info = String(infoHash || '');
        active = parseBool(enabled, true);
        issuer = String(ticketIssuer || '');
        validCreatedAt = Number(createdAt || 0)
      } catch {
        // keep fallback metadata when ticket detail query fails
      }

      tickets.push({
        ticketId: Number(ticketId),
        name,
        balance: String(bal),
        totalSupply,
        minPrice: formatTicketPrice(minPriceRaw),
        maxPrice: formatTicketPrice(maxPriceRaw),
        validFrom,
        validUntil,
        info,
        active,
        validCreatedAt,
        issuer,
      });
    })
  );

  return { address, label, isMain, fiatRaw, fiatBalance, tickets, loading: false };
}

const Account: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();

  const [assets, setAssets] = useState<AccountAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [lastInteraction, setLastInteraction] = useState<ContractInteractionRecord | null>(null);

  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.mode !== 'send') return;
      if (record.method.toLowerCase().includes('transfer')) {
        setLastInteraction(record);
      }
    });
  }, []);

  const loadAssets = useCallback(async () => {
    if (!currentBackendWallet) return;
    setLoading(true);
    try {
      // Ensure contracts are initialized
      await contractService.initializeContracts();

      const mainAddr = currentBackendWallet.address;

      // Fetch sub-accounts from contract (may revert if not registered as main account)
      let subAddrs: string[] = [];
      try {
        subAddrs = await contractService.getSubAccounts(mainAddr);
      } catch (err) {
        console.log('Not registered as main account or no sub-accounts:', err);
      }

      const all = await Promise.all([
        fetchAccountAsset(mainAddr, `主账户 (${currentBackendWallet.name || truncAddr(mainAddr)})`, true),
        ...subAddrs.map((addr, i) => fetchAccountAsset(addr, `子账户 #${i + 1}`, false)),
      ]);

      setAssets(all);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setAssets([]); // Show empty state on error
    } finally {
      setLoading(false);
    }
  }, [currentBackendWallet]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleCopy = (addr: string) => {
    copyToClipboard(addr);
    setCopied(addr);
    setTimeout(() => setCopied(''), 1500);
  };

  const openTransfer = (fromAddr: string) => {
    setTransferFrom(fromAddr);
    setTransferTo('');
    setTransferAmount('');
    setTransferError('');
    setTxHash('');
    setTransferOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferTo.trim()) { setTransferError('请输入目标地址'); return; }
    if (!transferAmount || parseFloat(transferAmount) <= 0) { setTransferError('请输入有效金额'); return; }

    let amountRaw: string;
    try {
      amountRaw = fiatToRaw(transferAmount);
      if (BigInt(amountRaw) <= 0n) {
        setTransferError('请输入有效金额');
        return;
      }
    } catch (err: any) {
      setTransferError(err?.message || '金额格式错误');
      return;
    }

    const fromAsset = assets.find((a) => a.address === transferFrom);
    if (fromAsset && BigInt(amountRaw) > BigInt(fromAsset.fiatRaw || '0')) {
      setTransferError('余额不足');
      return;
    }

    setTransferring(true);
    setTransferError('');
    try {
      const hash = await contractService.sendWithSigner(
        'FiatToken',
        'transfer',
        [transferTo, amountRaw],
        transferFrom
      );
      setTxHash(hash);
      setTransferOpen(false);
      setTimeout(() => loadAssets(), 2000);
    } catch (err: any) {
      setTransferError('转账失败: ' + (err.message || '网络错误'));
    } finally {
      setTransferring(false);
    }
  };

  const totalFiatRaw = assets.reduce((sum, a) => sum + BigInt(a.fiatRaw || '0'), BigInt(0));
  const totalFiat = rawToFiat(totalFiatRaw);
  const showOrderSigning = ['market_maker', 'scenic'].includes((currentBackendWallet?.role || '').toLowerCase());

  if (!currentBackendWallet) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">请先前往钱包管理页面选择账户身份</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">资产管理</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        查看主账户及所有子账户的法币凭证和门票持仓
      </Typography>

      {txHash && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setTxHash('')}>
          转账成功！交易哈希：
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {txHash}
          </Typography>
        </Alert>
      )}

      {/* 汇总卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>法币凭证总计</Typography>
            <Typography variant="h4" fontWeight="bold">{loading ? '...' : totalFiat}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>元</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">账户数量</Typography>
            <Typography variant="h4" fontWeight="bold">{assets.length}</Typography>
            <Typography variant="body2" color="text.secondary">主账户 + 子账户</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">门票种类</Typography>
            <Typography variant="h4" fontWeight="bold">
              {new Set(assets.flatMap((a) => a.tickets.map((t) => t.ticketId))).size}
            </Typography>
            <Typography variant="body2" color="text.secondary">跨所有账户</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 账户资产表格 */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1 }}>
            <Typography variant="h6">账户资产明细</Typography>
            <Button size="small" startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />} onClick={loadAssets} disabled={loading}>
              刷新
            </Button>
          </Box>

          {loading && assets.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>账户</TableCell>
                    <TableCell>地址</TableCell>
                    <TableCell align="right">法币余额（元）</TableCell>
                    <TableCell align="right">门票种类</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets.map((asset) => {
                    const hasTickets = asset.tickets.length > 0;
                    return (
                      <React.Fragment key={asset.address}>
                        <TableRow hover sx={{ '& > *': { borderBottom: hasTickets ? 'none' : undefined } }}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {asset.isMain ? <BankIcon fontSize="small" color="primary" /> : <SubAccountIcon fontSize="small" color="action" />}
                              <Box>
                                <Typography variant="body2" fontWeight={asset.isMain ? 'bold' : 'normal'}>
                                  {asset.label}
                                </Typography>
                                <Chip
                                  label={asset.isMain ? '主账户' : '子账户'}
                                  size="small"
                                  color={asset.isMain ? 'primary' : 'default'}
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {truncAddr(asset.address)}
                              </Typography>
                              <Tooltip title={copied === asset.address ? '已复制' : '复制地址'}>
                                <IconButton size="small" onClick={() => handleCopy(asset.address)}>
                                  <CopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={BigInt(asset.fiatRaw || '0') > 0n ? 'primary' : 'text.secondary'}
                            >
                              {asset.fiatBalance}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {asset.tickets.length > 0 ? asset.tickets.length : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<TransferIcon />}
                              onClick={() => openTransfer(asset.address)}
                              disabled={BigInt(asset.fiatRaw || '0') <= 0n}
                            >
                              转账
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* 门票明细（直接展示） */}
                        {hasTickets && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ py: 0, bgcolor: 'background.default' }}>
                              <Box sx={{ p: 2 }}>
                                <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                                  门票持仓
                                </Typography>
                                <Grid container spacing={1}>
                                  {asset.tickets.map((t) => (
                                    <Grid key={t.ticketId} size={{ xs: 12, sm: 6, md: 4 }}>
                                      <Card variant="outlined" sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                              <TicketIcon fontSize="small" color="primary" />
                                              <Typography variant="body2" fontWeight="medium">{t.name}</Typography>
                                            </Stack>
                                            <Chip
                                              size="small"
                                              color={t.active ? 'success' : 'default'}
                                              label={t.active ? '可用' : '停用'}
                                              sx={{ height: 20, fontSize: '0.65rem' }}
                                            />
                                          </Stack>

                                          <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
                                            <Chip size="small" variant="outlined" label={`ID #${t.ticketId}`} sx={{ height: 20, fontSize: '0.65rem' }} />
                                            <Chip size="small" variant="outlined" label={`发行量 ${t.totalSupply}`} sx={{ height: 20, fontSize: '0.65rem' }} />
                                          </Stack>

                                          <Stack spacing={0.5}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <Typography variant="caption" color="text.secondary">持有数量</Typography>
                                              <Typography variant="body2" fontWeight="bold">{t.balance} 张</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <Typography variant="caption" color="text.secondary">价格区间</Typography>
                                              <Typography variant="body2" color="primary.main" fontWeight="bold">¥{t.minPrice} ~ ¥{t.maxPrice}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <Typography variant="caption" color="text.secondary">有效期</Typography>
                                              <Typography variant="caption" sx={{ ml: 1, textAlign: 'right' }}>
                                                {formatTicketRange(t.validFrom, t.validUntil)}
                                              </Typography>
                                            </Box>
                                            {t.issuer && (
                                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="caption" color="text.secondary">发行账户</Typography>
                                                <Typography variant="caption" sx={{ ml: 1, fontFamily: 'monospace' }}>
                                                  {truncAddr(t.issuer)}
                                                </Typography>
                                              </Box>
                                            )}
                                            {t.validCreatedAt && (
                                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="caption" color="text.secondary">发行时间</Typography>
                                                <Typography variant="caption" sx={{ ml: 1, fontFamily: 'monospace' }}>
                                                  {formatTicketTime(t.validCreatedAt)}
                                                </Typography>
                                              </Box>
                                            )}
                                            {t.info && (
                                              <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
                                                说明：{t.info}
                                              </Typography>
                                            )}
                                          </Stack>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {assets.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          暂无账户数据，请确认当前账户已在链上注册
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 转账对话框 */}
      <Dialog open={transferOpen} onClose={() => !transferring && setTransferOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WalletIcon color="primary" />
            <span>法币凭证转账</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">转出账户</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {transferFrom}
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                可用余额：{assets.find((a) => a.address === transferFrom)?.fiatBalance ?? '0'} 元
              </Typography>
            </Paper>

            <TextField
              fullWidth
              label="目标地址"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x..."
              size="small"
            />

            <TextField
              fullWidth
              type="number"
              label="转账金额（元）"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="100"
              size="small"
              inputProps={{ min: 0, step: 0.0001 }}
            />

            {transferError && <Alert severity="error">{transferError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)} disabled={transferring}>取消</Button>
          <Button variant="contained" onClick={handleTransfer} disabled={transferring}>
            {transferring ? '转账中...' : '确认转账'}
          </Button>
        </DialogActions>
      </Dialog>

      <ContractInteractionPanel title="资产操作合约交互" record={lastInteraction} />
      {showOrderSigning && (
        <Trading
          embedded
          sellSubAccounts={assets
            .filter((asset) => !asset.isMain)
            .map((asset) => ({ address: asset.address, label: asset.label }))}
        />
      )}
    </Box>
  );
};

export default Account;
