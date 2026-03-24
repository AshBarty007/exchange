// src/components/Exchange/Auction.tsx
// 卖家一口价拍卖：卖家挂出固定价格，买家直接以该价格购买
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Button,
  TextField,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Sell as SellIcon,
  ShoppingCart as BuyIcon,
  Refresh as RefreshIcon,
  LocalOffer as TagIcon,
  CheckCircle,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import { fiatToRaw, rawToFiat } from '@/utils/fiatAmount';

interface SubAccountOption {
  address: string;
  label: string;
}

interface AuctionListing {
  orderId: number;
  seller: string;
  ticketId: number;
  price: string;       // 已格式化（元）
  priceRaw: string;    // raw
  amount: number;      // 剩余数量
  createdAt: number;
}

interface AuctionProps {
  ticketId: number;
  subAccounts: SubAccountOption[];
  minPriceRaw?: string;
  maxPriceRaw?: string;
  onDone?: () => void;
}

// 解析 Order 结构体数组
// 字段顺序: [0]orderId [1]account [2]orderType [3]ticketId [4]price
//           [5]amount [6]filledAmount [7]status [8]createdAt [9]expiry [10]orderHash [11]signature
function parseOrder(raw: any): AuctionListing | null {
  const arr = Array.isArray(raw) ? raw : null;
  if (!arr) return null;
  const orderId = Number(arr[0]);
  if (!orderId) return null;
  const orderType = Number(arr[2]); // 1 = SELL
  if (orderType !== 1) return null;
  const status = Number(arr[7]); // 0=OPEN, 1=PARTIAL, 2=FILLED, 3=CANCELLED
  if (status !== 0 && status !== 1) return null;
  const amount = Number(arr[5]);
  const filled = Number(arr[6]);
  const remaining = amount - filled;
  if (remaining <= 0) return null;

  const priceRaw = arr[4]?.toString() || '0';
  return {
    orderId,
    seller: arr[1] || '',
    ticketId: Number(arr[3]),
    price: rawToFiat(priceRaw),
    priceRaw,
    amount: remaining,
    createdAt: Number(arr[8] || 0),
  };
}

// ==================== 挂单面板（卖家） ====================
const ListPanel: React.FC<{
  ticketId: number;
  subAccounts: SubAccountOption[];
  minPriceRaw?: string;
  maxPriceRaw?: string;
  onListed: () => void;
}> = ({ ticketId, subAccounts, minPriceRaw, maxPriceRaw, onListed }) => {
  const { currentBackendWallet } = useWalletStore();
  const [subAccount, setSubAccount] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [ticketBalance, setTicketBalance] = useState('0');
  const [ticketAllowance, setTicketAllowance] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const minDisplay = minPriceRaw && minPriceRaw !== '0' ? rawToFiat(minPriceRaw) : null;
  const maxDisplay = maxPriceRaw && maxPriceRaw !== '0' ? rawToFiat(maxPriceRaw) : null;

  useEffect(() => {
    if (subAccounts.length > 0) {
      setSubAccount((prev) =>
        prev && subAccounts.some((s) => s.address === prev) ? prev : subAccounts[0].address
      );
    } else {
      setSubAccount('');
    }
  }, [subAccounts]);

  useEffect(() => {
    if (!subAccount) return;
    contractService.getTicketBalance(subAccount, ticketId)
      .then(setTicketBalance)
      .catch(() => {});
    const exchangeAddr = contractService.getContract('Exchange')?.address;
    if (exchangeAddr) {
      contractService.getTicketAllowance(subAccount, exchangeAddr, ticketId)
        .then(setTicketAllowance)
        .catch(() => {});
    }
  }, [subAccount, ticketId]);

  const handleApprove = async () => {
    if (!currentBackendWallet || !subAccount) return;
    setLoading(true);
    setError('');
    try {
      const exchangeAddr = contractService.getContract('Exchange')?.address;
      if (!exchangeAddr) throw new Error('Exchange contract not found');
      await contractService.approveTicketForSubAccount(subAccount, exchangeAddr, ticketId, '10000', currentBackendWallet.address);
      const newAllowance = await contractService.getTicketAllowance(subAccount, exchangeAddr, ticketId);
      setTicketAllowance(newAllowance);
      setNeedsApproval(false);
      setSuccess('门票授权成功');
    } catch (err: any) {
      setError('授权失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleList = async () => {
    if (!currentBackendWallet || !subAccount) { setError('请选择账户'); return; }
    if (!price || !amount) { setError('请输入价格和数量'); return; }
    const amountNum = parseInt(amount);
    if (amountNum <= 0) { setError('数量必须大于0'); return; }

    let priceRaw: string;
    try { priceRaw = fiatToRaw(price); } catch { setError('价格格式错误'); return; }

    if (minPriceRaw && minPriceRaw !== '0' && BigInt(priceRaw) < BigInt(minPriceRaw)) {
      setError(`价格低于最低限价 ¥${minDisplay}`); return;
    }
    if (maxPriceRaw && maxPriceRaw !== '0' && BigInt(priceRaw) > BigInt(maxPriceRaw)) {
      setError(`价格高于最高限价 ¥${maxDisplay}`); return;
    }
    if (amountNum > parseInt(ticketBalance)) {
      setError(`门票余额不足（可用 ${ticketBalance} 张）`); return;
    }
    if (amountNum > parseInt(ticketAllowance)) {
      setError('门票授权额度不足，请先授权');
      setNeedsApproval(true);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await contractService.createOrderForSubAccount(1, subAccount, ticketId, priceRaw, amount, currentBackendWallet.address);
      setSuccess('挂单成功！等待买家购买');
      setPrice('');
      setAmount('');
      onListed();
    } catch (err: any) {
      setError('挂单失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SellIcon color="error" />
        <Typography variant="subtitle1" fontWeight="bold">发布一口价挂单</Typography>
      </Box>

      <FormControl fullWidth size="small">
        <InputLabel>卖出账户</InputLabel>
        <Select value={subAccount} label="卖出账户" onChange={(e) => { setSubAccount(e.target.value); setNeedsApproval(false); setError(''); }}>
          {subAccounts.map((s) => (
            <MenuItem key={s.address} value={s.address}>{s.label} ({s.address.slice(0, 8)}...{s.address.slice(-6)})</MenuItem>
          ))}
        </Select>
      </FormControl>

      {subAccounts.length === 0 && (
        <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
          请先在账户管理中创建子账户，并将门票发行到子账户
        </Alert>
      )}

      {subAccount && (
        <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">门票余额</Typography>
            <Typography variant="body2" fontWeight="bold">{ticketBalance} 张</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">已授权</Typography>
            <Typography variant="body2" fontWeight="bold">{ticketAllowance} 张</Typography>
          </Box>
        </Paper>
      )}

      <TextField
        fullWidth size="small" label="一口价（元）" type="number"
        value={price} onChange={(e) => setPrice(e.target.value)}
        placeholder={minDisplay ?? '100.00'}
        inputProps={{ min: 0, step: 0.01 }}
        disabled={loading || !subAccount}
        helperText={minDisplay && maxDisplay ? `合法范围：¥${minDisplay} ~ ¥${maxDisplay}` : undefined}
      />

      <TextField
        fullWidth size="small" label="数量（张）" type="number"
        value={amount} onChange={(e) => setAmount(e.target.value)}
        placeholder="1" inputProps={{ min: 1, step: 1 }}
        disabled={loading || !subAccount}
      />

      {price && amount && (
        <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">总价</Typography>
            <Typography variant="body2" fontWeight="bold">
              ¥{(parseFloat(price || '0') * parseInt(amount || '0')).toFixed(4)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">手续费 (0.5%)</Typography>
            <Typography variant="body2">
              ¥{(parseFloat(price || '0') * parseInt(amount || '0') * 0.005).toFixed(4)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">实际到账</Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ¥{(parseFloat(price || '0') * parseInt(amount || '0') * 0.995).toFixed(4)}
            </Typography>
          </Box>
        </Paper>
      )}

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" icon={<CheckCircle />} onClose={() => setSuccess('')}>{success}</Alert>}

      {needsApproval && (
        <Button variant="outlined" fullWidth onClick={handleApprove} disabled={loading || !subAccount}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}>
          {loading ? '授权中...' : '授权门票'}
        </Button>
      )}

      {subAccount && parseInt(ticketBalance) === 0 && (
        <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
          当前子账户门票余额为 0，无法挂单
        </Alert>
      )}

      <Button
        variant="contained" color="error" fullWidth onClick={handleList}
        disabled={loading || !price || !amount || needsApproval || !subAccount || subAccounts.length === 0 || parseInt(ticketBalance) === 0}
        startIcon={loading ? <CircularProgress size={18} /> : <SellIcon />}
      >
        {loading ? '挂单中...' : '发布一口价'}
      </Button>
    </Stack>
  );
};

// ==================== 购买确认弹窗 ====================
const BuyDialog: React.FC<{
  open: boolean;
  listing: AuctionListing | null;
  subAccounts: SubAccountOption[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, listing, subAccounts, onClose, onSuccess }) => {
  const { currentBackendWallet } = useWalletStore();
  const [subAccount, setSubAccount] = useState('');
  const [buyAmount, setBuyAmount] = useState('1');
  const [fiatBalance, setFiatBalance] = useState('0');
  const [fiatBalanceRaw, setFiatBalanceRaw] = useState('0');
  const [fiatAllowanceRaw, setFiatAllowanceRaw] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (subAccounts.length > 0 && open) {
      setSubAccount(subAccounts[0].address);
      setBuyAmount('1');
      setError('');
      setNeedsApproval(false);
    }
  }, [subAccounts, open]);

  useEffect(() => {
    if (!subAccount || !open) return;
    contractService.getFiatBalance(subAccount).then((raw) => {
      setFiatBalanceRaw(raw);
      setFiatBalance(rawToFiat(raw));
    }).catch(() => {});
    const exchangeAddr = contractService.getContract('Exchange')?.address;
    if (exchangeAddr) {
      contractService.getFiatAllowance(subAccount, exchangeAddr).then(setFiatAllowanceRaw).catch(() => {});
    }
  }, [subAccount, open]);

  const totalRaw = listing ? BigInt(listing.priceRaw) * BigInt(parseInt(buyAmount) || 0) : 0n;

  const handleApprove = async () => {
    if (!currentBackendWallet || !subAccount) return;
    setLoading(true);
    setError('');
    try {
      const exchangeAddr = contractService.getContract('Exchange')?.address;
      if (!exchangeAddr) throw new Error('Exchange contract not found');
      await contractService.approveFiatForSubAccount(subAccount, exchangeAddr, fiatToRaw('100000'), currentBackendWallet.address);
      const newAllowance = await contractService.getFiatAllowance(subAccount, exchangeAddr);
      setFiatAllowanceRaw(newAllowance);
      setNeedsApproval(false);
    } catch (err: any) {
      setError('授权失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!currentBackendWallet || !subAccount || !listing) return;
    const amt = parseInt(buyAmount);
    if (!amt || amt <= 0) { setError('请输入有效数量'); return; }
    if (amt > listing.amount) { setError(`超过可购数量（最多 ${listing.amount} 张）`); return; }
    if (totalRaw > BigInt(fiatBalanceRaw)) { setError(`法币余额不足（可用 ¥${fiatBalance}）`); return; }
    if (totalRaw > BigInt(fiatAllowanceRaw)) {
      setError('法币授权额度不足，请先授权');
      setNeedsApproval(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 以卖家的一口价创建买单，链上自动撮合
      await contractService.createOrderForSubAccount(
        0, subAccount, listing.ticketId, listing.priceRaw, buyAmount, currentBackendWallet.address
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError('购买失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuyIcon color="success" />
        确认购买
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">一口价</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">¥{listing.price} / 张</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">可购数量</Typography>
                <Typography variant="body2">{listing.amount} 张</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">卖家</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {listing.seller.slice(0, 8)}...{listing.seller.slice(-6)}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <FormControl fullWidth size="small">
            <InputLabel>买入账户</InputLabel>
            <Select value={subAccount} label="买入账户" onChange={(e) => { setSubAccount(e.target.value); setNeedsApproval(false); setError(''); }}>
              {subAccounts.map((s) => (
                <MenuItem key={s.address} value={s.address}>{s.label} ({s.address.slice(0, 8)}...{s.address.slice(-6)})</MenuItem>
              ))}
            </Select>
          </FormControl>

          {subAccount && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">法币余额</Typography>
              <Typography variant="body2" fontWeight="bold">¥{fiatBalance}</Typography>
            </Box>
          )}

          <TextField
            fullWidth size="small" label="购买数量（张）" type="number"
            value={buyAmount} onChange={(e) => { setBuyAmount(e.target.value); setNeedsApproval(false); setError(''); }}
            inputProps={{ min: 1, max: listing.amount, step: 1 }}
          />

          {buyAmount && parseInt(buyAmount) > 0 && (
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">需支付</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  ¥{(parseFloat(listing.price) * parseInt(buyAmount)).toFixed(4)}
                </Typography>
              </Box>
            </Paper>
          )}

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {needsApproval && (
            <Button variant="outlined" fullWidth onClick={handleApprove} disabled={loading}
              startIcon={loading ? <CircularProgress size={18} /> : undefined}>
              {loading ? '授权中...' : '授权法币'}
            </Button>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>取消</Button>
        <Button
          variant="contained" color="success" onClick={handleBuy}
          disabled={loading || !subAccount || subAccounts.length === 0 || needsApproval}
          startIcon={loading ? <CircularProgress size={18} /> : <BuyIcon />}
        >
          {loading ? '购买中...' : '立即购买'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==================== 主组件 ====================
const Auction: React.FC<AuctionProps> = ({ ticketId, subAccounts, minPriceRaw, maxPriceRaw, onDone }) => {
  const [listings, setListings] = useState<AuctionListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<AuctionListing | null>(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 子账户地址集合，用于判断挂单是否属于当前用户
  const mySubAccountAddrs = new Set(subAccounts.map((s) => s.address.toLowerCase()));

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      // 获取活跃卖单（orderType=1）
      const rawOrders = await contractService.getActiveOrders(ticketId, 1, 50);
      const parsed: AuctionListing[] = [];
      for (const raw of rawOrders) {
        const listing = parseOrder(raw);
        if (listing) parsed.push(listing);
      }
      // 按价格升序排列
      parsed.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      setListings(parsed);
    } catch (err) {
      console.error('Failed to load auction listings:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleBuyClick = (listing: AuctionListing) => {
    setSelectedListing(listing);
    setBuyDialogOpen(true);
  };

  const handleBuySuccess = () => {
    setSuccessMsg('购买成功！门票已转入您的账户');
    loadListings();
    if (onDone) onDone();
  };

  const truncAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const isMyListing = (listing: AuctionListing) => {
    return mySubAccountAddrs.has(listing.seller.toLowerCase());
  };

  return (
    <Stack spacing={3}>
      {successMsg && (
        <Alert severity="success" icon={<CheckCircle />} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr' }, gap: 3 }}>
        {/* 左：发布挂单 */}
        <Card>
          <CardContent>
            <ListPanel
              ticketId={ticketId}
              subAccounts={subAccounts}
              minPriceRaw={minPriceRaw}
              maxPriceRaw={maxPriceRaw}
              onListed={loadListings}
            />
          </CardContent>
        </Card>

        {/* 右：当前挂单列表 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TagIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                当前一口价挂单
              </Typography>
              <Chip label={`${listings.length} 条`} size="small" color="primary" variant="outlined" />
              <Tooltip title="刷新">
                <IconButton size="small" onClick={loadListings} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>一口价</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">总价</TableCell>
                    <TableCell>卖家</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          暂无一口价挂单
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    listings.map((listing) => (
                      <TableRow key={listing.orderId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="error.main">
                            ¥{listing.price}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{listing.amount} 张</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            ¥{(parseFloat(listing.price) * listing.amount).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={listing.seller}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {truncAddr(listing.seller)}
                            </Typography>
                          </Tooltip>
                          {isMyListing(listing) && (
                            <Chip label="我的" size="small" color="warning" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<BuyIcon />}
                            onClick={() => handleBuyClick(listing)}
                            disabled={isMyListing(listing) || subAccounts.length === 0}
                            sx={{ fontSize: '0.72rem', py: 0.5 }}
                          >
                            立即购买
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {subAccounts.length === 0 && listings.length > 0 && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
                购买需要子账户持有法币。请先在账户管理中创建子账户并充值。
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>

      <BuyDialog
        open={buyDialogOpen}
        listing={selectedListing}
        subAccounts={subAccounts}
        onClose={() => setBuyDialogOpen(false)}
        onSuccess={handleBuySuccess}
      />
    </Stack>
  );
};

export default Auction;
