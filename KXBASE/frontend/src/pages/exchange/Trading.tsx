import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Alert,
  Chip,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ShoppingCart as BuyIcon,
  Sell as SellIcon,
  Draw as SignIcon,
  Verified as VerifyIcon,
  ContentCopy as CopyIcon,
  Delete as ClearIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import { OrderType } from '@/types';
import type { SignedOrder } from '@/types';
import keyManager from '@/services/keyManager';
import contractService from '@/services/contractService';
import contractInteractionService, { ContractInteractionRecord } from '@/services/contractInteractionService';
import MarketDepth from '@/components/Exchange/MarketDepth';
import ContractInteractionPanel from '@/components/ContractInteractionPanel';
import { fiatToRaw, rawToFiat } from '@/utils/fiatAmount';

interface TradingProps {
  embedded?: boolean;
  sellSubAccounts?: Array<{ address: string; label: string }>;
}

const Trading: React.FC<TradingProps> = ({ embedded = false, sellSubAccounts = [] }) => {
  const { currentBackendWallet } = useWalletStore();

  const backendAddress = currentBackendWallet?.address || '';

  const [orderType, setOrderType] = useState<OrderType>(OrderType.BUY);
  const [sellSignerAddress, setSellSignerAddress] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [nonce, setNonce] = useState('0');

  const [signedOrder, setSignedOrder] = useState<SignedOrder | null>(null);
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [signedHistory, setSignedHistory] = useState<SignedOrder[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastOrderInteraction, setLastOrderInteraction] = useState<ContractInteractionRecord | null>(null);

  const sellSignerOptions = useMemo(() => {
    if (!backendAddress) return [];
    return [
      { address: backendAddress, label: `主账户 (${currentBackendWallet?.name || '未命名账户'})` },
      ...sellSubAccounts.filter((item) => item.address && item.address !== backendAddress),
    ];
  }, [backendAddress, currentBackendWallet?.name, sellSubAccounts]);

  useEffect(() => {
    if (sellSignerOptions.length === 0) {
      setSellSignerAddress(backendAddress);
      return;
    }
    setSellSignerAddress((prev) => {
      if (prev && sellSignerOptions.some((item) => item.address === prev)) {
        return prev;
      }
      return sellSignerOptions[0].address;
    });
  }, [backendAddress, sellSignerOptions]);

  const signerAddress = orderType === OrderType.SELL ? (sellSignerAddress || backendAddress) : backendAddress;
  const signerName = sellSignerOptions.find((item) => item.address === signerAddress)?.label || currentBackendWallet?.name || '';
  const signerTag = orderType === OrderType.SELL ? '卖出账户' : '后端主账户';

  const canSign = !!signerAddress && !!ticketId && !!price && !!amount;

  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.mode !== 'send') return;
      if ((record.contractName || '').toLowerCase() !== 'exchange') return;
      if (!record.method.toLowerCase().includes('createorder')) return;
      setLastOrderInteraction(record);
    });
  }, []);

  const handleSign = async () => {
    setError('');
    setTxHash('');
    setSubmitSuccess(false);
    if (!canSign) return;

    if (!backendAddress) {
      setError('请先在钱包管理页面选择后端钱包');
      return;
    }

    const parsedTicketId = parseInt(ticketId, 10);
    const parsedAmount = parseInt(amount, 10);
    const parsedNonce = parseInt(nonce, 10);
    const priceNum = parseFloat(price);
    if (
      Number.isNaN(parsedTicketId) || parsedTicketId < 0 ||
      Number.isNaN(priceNum) || priceNum <= 0 ||
      Number.isNaN(parsedAmount) || parsedAmount <= 0 ||
      Number.isNaN(parsedNonce) || parsedNonce < 0
    ) {
      setError('订单参数格式错误，请检查 ticketId / price / amount / nonce');
      return;
    }

    let parsedPrice: number;
    try {
      parsedPrice = Number(fiatToRaw(price));
    } catch {
      setError('价格格式错误，最多支持4位小数');
      return;
    }

    if (orderType === OrderType.SELL) {
      try {
        const ticketBalance = await contractService.getTicketBalance(signerAddress, parsedTicketId);
        if (BigInt(ticketBalance) < BigInt(parsedAmount)) {
          setError(
            `卖单账户门票余额不足：当前账户 ${signerAddress.slice(0, 10)}...${signerAddress.slice(-8)} ` +
            `持有 ${ticketBalance}，下单数量 ${parsedAmount}。请切换卖出账户或降低数量。`
          );
          return;
        }
      } catch (err: any) {
        setError('下单前检查门票余额失败: ' + (err?.message || '网络错误'));
        return;
      }
    }

    let result: SignedOrder | null = null;
    try {
      const orderParams = {
        orderType,
        ticketId: parsedTicketId,
        price: parsedPrice,
        amount: parsedAmount,
        nonce: parsedNonce,
      };
      result = await contractService.signOrderWithBackend(orderParams, signerAddress);
    } catch (err: any) {
      setError('签名失败: ' + (err?.message || '网络错误'));
      return;
    }

    if (result) {
      setSignedOrder(result);
      setVerifyResult(null);
      setSignedHistory((prev) => [result, ...prev]);
      setNonce(String(parseInt(nonce) + 1));

      setSubmitting(true);
      try {
        const hash = await contractService.submitOrderWithSigner(result, signerAddress);
        setTxHash(hash);
        setSubmitSuccess(true);
      } catch (err: any) {
        setError('签名成功，但下单失败: ' + (err?.message || '网络错误'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleVerify = () => {
    if (!signedOrder) return;
    const valid = keyManager.verifyOrderSignature(signedOrder);
    setVerifyResult(valid);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleReset = () => {
    setTicketId('');
    setPrice('');
    setAmount('');
    setSignedOrder(null);
    setVerifyResult(null);
    setError('');
    setTxHash('');
    setSubmitSuccess(false);
  };


  const CopyableCell = ({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) => (
    <TableRow>
      <TableCell sx={{ fontWeight: 500, width: 140, color: 'text.secondary', border: 'none', py: 1 }}>
        {label}
      </TableCell>
      <TableCell sx={{ border: 'none', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: mono ? 'monospace' : 'inherit',
              wordBreak: 'break-all',
              fontSize: mono ? '0.8rem' : '0.875rem',
            }}
          >
            {value}
          </Typography>
          {mono && (
            <Tooltip title="复制">
              <IconButton size="small" onClick={() => handleCopy(value)}>
                <CopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={embedded ? { mt: 4 } : undefined}>
      {!embedded && (
        <>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            订单签名
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            构造交易订单并使用后端钱包签名，生成可提交到 Exchange 合约的签名数据
          </Typography>
        </>
      )}

      <Stack spacing={3}>
        {!backendAddress && (
          <Alert severity="warning">请先在钱包管理页面选择后端钱包</Alert>
        )}

        {signerAddress && (
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">签名账户:</Typography>
                <Chip label={signerName || '未命名账户'} size="small" color="primary" variant="outlined" />
                <Chip label={signerTag} size="small" color="default" />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {signerAddress}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {ticketId && parseInt(ticketId) > 0 && (
          <MarketDepth ticketId={parseInt(ticketId)} levels={5} />
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              订单参数
            </Typography>

            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  订单类型
                </Typography>
                <ToggleButtonGroup
                  fullWidth
                  exclusive
                  value={orderType}
                  onChange={(_, value) => {
                    if (value !== null) {
                      setOrderType(value as OrderType);
                    }
                  }}
                  size="small"
                >
                  <ToggleButton value={OrderType.BUY}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuyIcon color="success" fontSize="small" />
                      买单 (BUY)
                    </Box>
                  </ToggleButton>
                  <ToggleButton value={OrderType.SELL}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SellIcon color="error" fontSize="small" />
                      卖单 (SELL)
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {orderType === OrderType.SELL && (
                <FormControl fullWidth>
                  <InputLabel>卖出账户</InputLabel>
                  <Select
                    value={sellSignerAddress}
                    label="卖出账户"
                    onChange={(e) => setSellSignerAddress(String(e.target.value))}
                  >
                    {sellSignerOptions.map((item, idx) => (
                      <MenuItem key={item.address} value={item.address}>
                        {idx === 0 ? item.label : `${item.label} (${item.address.slice(0, 10)}...${item.address.slice(-8)})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="门票 ID (ticketId)"
                  type="number"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="1"
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  fullWidth
                  label="单价（元）"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="100.00"
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="数量 (amount)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10"
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Box>


              <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SignIcon />}
                  onClick={handleSign}
                  disabled={!canSign || submitting}
                  size="large"
                >
                  {submitting ? '签名下单中...' : '签名并下单'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleReset}
                >
                  重置
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {signedOrder && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  签名结果
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<VerifyIcon />}
                    onClick={handleVerify}
                  >
                    验证签名
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CopyIcon />}
                    onClick={() => handleCopy(JSON.stringify(signedOrder, null, 2))}
                  >
                    复制 JSON
                  </Button>
                </Box>
              </Box>

              {verifyResult !== null && (
                <Alert severity={verifyResult ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {verifyResult
                    ? '签名验证通过 — ecrecover 恢复地址与签名者一致'
                    : '签名验证失败 — 恢复地址与签名者不匹配'}
                </Alert>
              )}

              {submitSuccess && txHash && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    订单已成功提交到区块链！
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    交易哈希: {txHash}
                  </Typography>
                </Alert>
              )}

              <Table size="small">
                <TableBody>
                  <CopyableCell label="订单类型" value={signedOrder.orderType === OrderType.BUY ? 'BUY (买单)' : 'SELL (卖单)'} mono={false} />
                  <CopyableCell label="门票 ID" value={String(signedOrder.ticketId)} mono={false} />
                  <CopyableCell label="单价" value={`¥${rawToFiat(signedOrder.price)} (raw: ${signedOrder.price})`} mono={false} />
                  <CopyableCell label="数量" value={String(signedOrder.amount)} mono={false} />
                  <CopyableCell label="Nonce" value={String(signedOrder.nonce)} mono={false} />
                  <TableRow>
                    <TableCell colSpan={2} sx={{ border: 'none', py: 0.5 }}>
                      <Divider />
                    </TableCell>
                  </TableRow>
                  <CopyableCell label="签名者" value={signedOrder.signer} />
                  <CopyableCell label="订单��希" value={signedOrder.orderHash} />
                  <CopyableCell label="签名 (r+s+v)" value={signedOrder.signature} />
                </TableBody>
              </Table>

              <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Exchange.createOrder 调用参数
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
{`createOrder(
  orderType:  ${signedOrder.orderType}  // ${signedOrder.orderType === OrderType.BUY ? 'BUY' : 'SELL'}
  ticketId:   ${signedOrder.ticketId}
  price:      ${signedOrder.price}  // ¥${rawToFiat(signedOrder.price)}
  amount:     ${signedOrder.amount}
  signature:  ${signedOrder.signature}
)`}
                </Box>
              </Paper>
            </CardContent>
          </Card>
        )}

        {signedHistory.length > 0 && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  签名历史 ({signedHistory.length})
                </Typography>
                <Button size="small" onClick={() => setSignedHistory([])}>
                  清空
                </Button>
              </Box>

              <Stack spacing={1}>
                {signedHistory.map((order, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.default',
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => {
                      setSignedOrder(order);
                      setVerifyResult(null);
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={order.orderType === OrderType.BUY ? 'BUY' : 'SELL'}
                        size="small"
                        color={order.orderType === OrderType.BUY ? 'success' : 'error'}
                      />
                      <Typography variant="body2">
                        门票#{order.ticketId} / ¥{rawToFiat(order.price)} x {order.amount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        nonce={order.nonce}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', ml: 'auto' }}>
                        {order.orderHash.slice(0, 18)}...
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <ContractInteractionPanel title="下单交易请求" record={lastOrderInteraction} />
      </Stack>
    </Box>
  );
};

export default Trading;
