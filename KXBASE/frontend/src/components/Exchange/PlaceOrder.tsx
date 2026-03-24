// src/components/Exchange/PlaceOrder.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { TrendingUp, TrendingDown, CheckCircle } from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import { fiatToRaw, rawToFiat } from '@/utils/fiatAmount';

interface SubAccountOption {
  address: string;
  label: string;
}

interface PlaceOrderProps {
  ticketId: number;
  subAccounts?: SubAccountOption[];
  onOrderCreated?: () => void;
  minPriceRaw?: string;
  maxPriceRaw?: string;
}

const PlaceOrder: React.FC<PlaceOrderProps> = ({ ticketId, subAccounts = [], onOrderCreated, minPriceRaw, maxPriceRaw }) => {
  const { currentBackendWallet } = useWalletStore();
  const [orderType, setOrderType] = useState<0 | 1>(0); // 0 = BUY, 1 = SELL
  const [selectedSubAccount, setSelectedSubAccount] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fiatBalance, setFiatBalance] = useState('0');
  const [fiatBalanceRaw, setFiatBalanceRaw] = useState('0');
  const [ticketBalance, setTicketBalance] = useState('0');
  const [fiatAllowanceRaw, setFiatAllowanceRaw] = useState('0');
  const [ticketAllowance, setTicketAllowance] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);

  // 将 raw 值转为可读元，用于显示价格范围提示
  const minPriceDisplay = minPriceRaw && minPriceRaw !== '0' ? rawToFiat(minPriceRaw) : null;
  const maxPriceDisplay = maxPriceRaw && maxPriceRaw !== '0' ? rawToFiat(maxPriceRaw) : null;

  // 当子账户列表变化时，自动选中第一个
  useEffect(() => {
    if (subAccounts.length > 0) {
      setSelectedSubAccount((prev) => {
        if (prev && subAccounts.some((s) => s.address === prev)) return prev;
        return subAccounts[0].address;
      });
    } else {
      setSelectedSubAccount('');
    }
  }, [subAccounts]);

  // 当选中的子账户或订单类型变化时，刷新余额和授权
  useEffect(() => {
    if (selectedSubAccount) {
      loadBalances();
      checkAllowances();
    }
  }, [selectedSubAccount, ticketId, orderType]);

  const loadBalances = async () => {
    if (!selectedSubAccount) return;

    try {
      const [fiatRaw, ticket] = await Promise.all([
        contractService.getFiatBalance(selectedSubAccount),
        contractService.getTicketBalance(selectedSubAccount, ticketId),
      ]);

      setFiatBalanceRaw(fiatRaw);
      setFiatBalance(rawToFiat(fiatRaw));
      setTicketBalance(ticket);
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  };

  const checkAllowances = async () => {
    if (!selectedSubAccount) return;

    try {
      const exchangeAddress = contractService.getContract('Exchange')?.address;
      if (!exchangeAddress) return;

      if (orderType === 0) {
        const raw = await contractService.getFiatAllowance(selectedSubAccount, exchangeAddress);
        setFiatAllowanceRaw(raw);
      } else {
        const allowance = await contractService.getTicketAllowance(
          selectedSubAccount,
          exchangeAddress,
          ticketId
        );
        setTicketAllowance(allowance);
      }
    } catch (err) {
      console.error('Failed to check allowances:', err);
    }
  };

  const handleApprove = async () => {
    if (!currentBackendWallet || !selectedSubAccount) return;

    setLoading(true);
    setError('');

    try {
      const exchangeAddress = contractService.getContract('Exchange')?.address;
      if (!exchangeAddress) {
        throw new Error('Exchange contract not found');
      }

      if (orderType === 0) {
        // 主账户代子账户授权法币
        await contractService.approveFiatForSubAccount(
          selectedSubAccount,
          exchangeAddress,
          fiatToRaw('100000'),
          currentBackendWallet.address
        );
        setSuccess('法币授权成功');
      } else {
        // 主账户代子账户授权门票
        await contractService.approveTicketForSubAccount(
          selectedSubAccount,
          exchangeAddress,
          ticketId,
          '10000',
          currentBackendWallet.address
        );
        setSuccess('门票授权成功');
      }

      await checkAllowances();
      setNeedsApproval(false);
    } catch (err: any) {
      console.error('Approval failed:', err);
      setError('授权失败: ' + (err.message || err.toString() || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentBackendWallet) {
      setError('请先选择账户');
      return;
    }

    if (!selectedSubAccount) {
      setError('请选择下单账户');
      return;
    }

    if (!price || !amount) {
      setError('请输入价格和数量');
      return;
    }

    const priceNum = parseFloat(price);
    const amountNum = parseInt(amount);

    if (priceNum <= 0 || amountNum <= 0) {
      setError('价格和数量必须大于0');
      return;
    }

    let priceRaw: string;
    try {
      priceRaw = fiatToRaw(price);
    } catch {
      setError('价格格式错误，最多支持4位小数');
      return;
    }

    // 前端提前校验价格范围，避免无效上链
    if (minPriceRaw && minPriceRaw !== '0' && BigInt(priceRaw) < BigInt(minPriceRaw)) {
      setError(`价格低于门票最低限价 ¥${minPriceDisplay}，链上会 revert`);
      return;
    }
    if (maxPriceRaw && maxPriceRaw !== '0' && BigInt(priceRaw) > BigInt(maxPriceRaw)) {
      setError(`价格高于门票最高限价 ¥${maxPriceDisplay}，链上会 revert`);
      return;
    }

    // 检查账户余额
    if (orderType === 0) {
      const totalCostRaw = BigInt(priceRaw) * BigInt(amountNum);
      if (totalCostRaw > BigInt(fiatBalanceRaw)) {
        setError(`账户法币余额不足（可用 ¥${fiatBalance}）`);
        return;
      }
      // 检查授权
      if (totalCostRaw > BigInt(fiatAllowanceRaw)) {
        setError('法币授权额度不足，请先授权');
        setNeedsApproval(true);
        return;
      }
    } else {
      if (amountNum > parseInt(ticketBalance)) {
        setError(`账户门票余额不足（可用 ${ticketBalance} 张）`);
        return;
      }
      if (amountNum > parseInt(ticketAllowance)) {
        setError('门票授权额度不足，请先授权');
        setNeedsApproval(true);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 统一走主账户代子账户下单路径（合约要求买卖双方都必须是子账户）
      const txHash = await contractService.createOrderForSubAccount(
        orderType,
        selectedSubAccount,
        ticketId,
        priceRaw,
        amount,
        currentBackendWallet.address
      );

      setSuccess(`订单创建成功！交易哈希: ${txHash.slice(0, 10)}...`);

      // 重置表单
      setPrice('');
      setAmount('');

      // 刷新余额
      await loadBalances();
      await checkAllowances();

      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err: any) {
      console.error('Failed to create order:', err);
      setError('订单创建失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!price || !amount) return '0';
    return (parseFloat(price) * parseInt(amount)).toFixed(4);
  };

  const calculateFee = () => {
    const total = parseFloat(calculateTotal());
    return (total * 0.005).toFixed(4);
  };

  const truncAddr = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : '';

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">下单</Typography>

          {/* 订单类型选择 */}
          <Tabs
            value={orderType}
            onChange={(_, value) => { setOrderType(value); setNeedsApproval(false); setError(''); }}
            variant="fullWidth"
          >
            <Tab
              label="买入"
              icon={<TrendingUp />}
              iconPosition="start"
              value={0}
              sx={{
                color: orderType === 0 ? 'success.main' : 'text.secondary',
                '&.Mui-selected': { color: 'success.main' }
              }}
            />
            <Tab
              label="卖出"
              icon={<TrendingDown />}
              iconPosition="start"
              value={1}
              sx={{
                color: orderType === 1 ? 'error.main' : 'text.secondary',
                '&.Mui-selected': { color: 'error.main' }
              }}
            />
          </Tabs>

          {/* 账户选择 */}
          <FormControl fullWidth size="small">
            <InputLabel>下单账户</InputLabel>
            <Select
              value={selectedSubAccount}
              label="下单账户"
              onChange={(e) => { setSelectedSubAccount(e.target.value); setNeedsApproval(false); setError(''); }}
            >
              {subAccounts.map((sub) => (
                <MenuItem key={sub.address} value={sub.address}>
                  {sub.label} ({truncAddr(sub.address)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 无子账户时的提示 */}
          {subAccounts.length === 0 && (
            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
              {orderType === 0
                ? '买单需要从子账户划出法币。请先在账户管理中创建子账户，并充值法币到子账户。'
                : '卖单需要从子账户划出门票。请先在账户管理中创建子账户，并将门票发行到子账户。'}
            </Alert>
          )}


          {/* 余额显示 */}
          {selectedSubAccount && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {orderType === 0 ? '法币余额' : '门票余额'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {orderType === 0 ? `¥${fiatBalance}` : `${ticketBalance} 张`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {orderType === 0 ? '法币授权' : '门票授权'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {orderType === 0 ? `¥${rawToFiat(fiatAllowanceRaw)}` : `${ticketAllowance} 张`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">签名账户</Typography>
                  <Chip
                    label="主账户签名"
                    size="small"
                    color="primary"
                    sx={{ height: 18, fontSize: '0.6rem' }}
                  />
                </Box>
              </Stack>
            </Paper>
          )}

          {/* 价格输入 */}
          <TextField
            fullWidth
            label="价格（元）"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={minPriceDisplay ?? '100.00'}
            inputProps={{ min: 0, step: 0.01 }}
            disabled={loading || !selectedSubAccount}
            helperText={minPriceDisplay && maxPriceDisplay
              ? `合法范围：¥${minPriceDisplay} ~ ¥${maxPriceDisplay}`
              : undefined}
          />

          {/* 数量输入 */}
          <TextField
            fullWidth
            label="数量（张）"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            inputProps={{ min: 1, step: 1 }}
            disabled={loading || !selectedSubAccount}
          />

          {/* 订单摘要 */}
          {price && amount && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">总价</Typography>
                  <Typography variant="body2" fontWeight="bold">¥{calculateTotal()}</Typography>
                </Box>
                {orderType === 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">手续费 
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">¥{calculateFee()}</Typography>
                  </Box>
                )}
                {orderType === 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">实际收到</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      ¥{(parseFloat(calculateTotal()) - parseFloat(calculateFee())).toFixed(4)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* 成功提示 */}
          {success && (
            <Alert severity="success" icon={<CheckCircle />} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* 授权按钮 */}
          {needsApproval && (
            <Button
              variant="outlined"
              fullWidth
              onClick={handleApprove}
              disabled={loading || !selectedSubAccount}
              startIcon={loading ? <CircularProgress size={20} /> : undefined}
            >
              {loading ? '授权中...' : `授权${orderType === 0 ? '法币' : '门票'}`}
            </Button>
          )}

          {/* 卖单余额为0时的提示 */}
          {orderType === 1 && selectedSubAccount && parseInt(ticketBalance) === 0 && (
            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
              当前子账户门票余额为 0，无法卖出。请切换到持有门票的账户，或先将门票发行到此子账户。
            </Alert>
          )}

          {/* 提交按钮 */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || !price || !amount || needsApproval || !selectedSubAccount || subAccounts.length === 0 || (orderType === 1 && parseInt(ticketBalance) === 0)}
            color={orderType === 0 ? 'success' : 'error'}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? '提交中...' : orderType === 0 ? '买入' : '卖出'}
          </Button>

          {/* 提示信息 */}
          <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
            {orderType === 0
              ? '主账户签名，从子账户划出法币买入，订单创建后自动撮合'
              : '主账户签名，从子账户划出门票卖出。门票必须在子账户中'}
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PlaceOrder;
