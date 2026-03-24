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
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import contractInteractionService, { ContractInteractionRecord } from '@/services/contractInteractionService';
import ContractInteractionPanel from '@/components/ContractInteractionPanel';
import { fiatToRaw, rawToFiat } from '@/utils/fiatAmount';

interface MainAccount {
  address: string;
  name: string;
  role: string;
}

const FiatMintPage: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();
  const [amount, setAmount] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [mainAccounts, setMainAccounts] = useState<MainAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [totalSupply, setTotalSupply] = useState('0');
  const [burnAccountAddress, setBurnAccountAddress] = useState('');
  const [lastInteraction, setLastInteraction] = useState<ContractInteractionRecord | null>(null);
  const [isBankRole, setIsBankRole] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    checkBankRole();
    fetchTotalSupply();
    fetchBurnAccount();
    loadMainAccounts();
  }, [currentBackendWallet]);

  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.mode !== 'send') return;
      const method = record.method.toLowerCase();
      if (method.includes('mint') || method.includes('burn')) {
        setLastInteraction(record);
      }
    });
  }, []);

  const checkBankRole = async () => {
    if (!currentBackendWallet) {
      setIsBankRole(false);
      setCheckingRole(false);
      return;
    }
    setCheckingRole(true);
    try {
      const bankRoleResult = await contractService.call('Auth', 'BANK_ROLE', [], ['bytes32']);
      const bankRoleHash = bankRoleResult[0]?.toString() || '';
      const hasRole = await contractService.call('Auth', 'hasRole', [bankRoleHash, currentBackendWallet.address], ['bool']);
      setIsBankRole(!!hasRole[0]);
    } catch {
      // If contract check fails, trust the role metadata
      setIsBankRole(currentBackendWallet.role === 'bank');
    } finally {
      setCheckingRole(false);
    }
  };

  const fetchTotalSupply = async () => {
    try {
      const supply = await contractService.call('FiatToken', 'totalSupply', [], ['uint256']);
      const raw = supply[0]?.toString() || '0';
      setTotalSupply(rawToFiat(raw));
    } catch {
      // ignore
    }
  };

  const fetchBurnAccount = async () => {
    try {
      const burnAddr = await contractService.call('FiatToken', 'burnAccount', [], ['address']);
      setBurnAccountAddress(burnAddr[0]?.toString() || '');
    } catch {
      // ignore
    }
  };

  const loadMainAccounts = async () => {
    try {
      const res = await fetch('/api/v1/wallets/list');
      if (res.ok) {
        const wallets = await res.json();
        setMainAccounts(wallets.map((w: any) => ({
          address: w.address,
          name: w.name || w.address,
          role: w.role,
        })));
      }
    } catch {
      setMainAccounts([]);
    }
  };

  const handleMint = () => {
    setError('');
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的铸造金额');
      return;
    }
    const target = selectedAccount || targetAddress;
    if (!target.trim()) {
      setError('请选择或输入目标主账户地址');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!currentBackendWallet) return;

    setSubmitting(true);
    setError('');
    setTxHash('');
    setSuccess(false);

    try {
      const target = selectedAccount || targetAddress;
      const amountRaw = fiatToRaw(amount);

      const hash = await contractService.mintFiatWithSigner(target, amountRaw, currentBackendWallet.address);

      setTxHash(hash);
      setSuccess(true);
      setConfirmDialogOpen(false);
      setAmount('');
      setTargetAddress('');
      setSelectedAccount('');

      setTimeout(() => fetchTotalSupply(), 2000);
    } catch (err: any) {
      setError('铸造失败: ' + (err.message || '网络错误'));
    } finally {
      setSubmitting(false);
    }
  };

  const [burnSuccess, setBurnSuccess] = useState('');

  const handleSetBurnAccount = async () => {
    if (!currentBackendWallet || !burnAccountAddress) return;

    try {
      await contractService.setBurnAccountWithSigner(burnAccountAddress, currentBackendWallet.address);
      setBurnSuccess('销毁账户设置成功');
      setTimeout(() => setBurnSuccess(''), 3000);
    } catch (err: any) {
      setError('设置失败: ' + (err.message || '网络错误'));
    }
  };

  if (!currentBackendWallet) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">请先前往钱包管理页面选择账户身份</Alert>
      </Box>
    );
  }

  if (checkingRole) {
    return (
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">正在验证权限...</Typography>
      </Box>
    );
  }

  if (!isBankRole) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          当前账户不是银行角色，无权限铸造法币通证。请在钱包管理页面切换到银行身份账户。
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            当前账户: {currentBackendWallet.name} ({currentBackendWallet.address})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            角色: {currentBackendWallet.role}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        法币通证铸造
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        银行角色专用功能：铸造法币通证到做市商或景区的主钱包地址
      </Typography>

      {success && txHash && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          <Typography variant="body2" gutterBottom>
            铸造成功！
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}
          >
            交易哈希: {txHash}
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                法币通证统计
              </Typography>

              <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', textAlign: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  总发行量
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="primary" sx={{ my: 2 }}>
                  {totalSupply}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  元
                </Typography>
              </Paper>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchTotalSupply}
                size="small"
              >
                刷新数据
              </Button>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  当前银行账户
                </Typography>
                <Chip label={currentBackendWallet.name} size="small" color="primary" sx={{ mb: 1 }} />
                <Typography
                  variant="caption"
                  sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {currentBackendWallet.address}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                销毁账户设置
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                设置银行专用销毁账户地址，用于接收法币兑换转账
              </Typography>

              <TextField
                fullWidth
                label="销毁账户地址"
                value={burnAccountAddress}
                onChange={(e) => setBurnAccountAddress(e.target.value)}
                placeholder="0x..."
                size="small"
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant="outlined"
                onClick={handleSetBurnAccount}
                disabled={!burnAccountAddress}
                size="small"
              >
                设置销毁账户
              </Button>
              {burnSuccess && (
                <Alert severity="success" sx={{ mt: 1 }} onClose={() => setBurnSuccess('')}>
                  {burnSuccess}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BankIcon color="primary" fontSize="large" />
                <Typography variant="h6">铸造法币通证</Typography>
              </Box>

              <Stack spacing={3}>
                <Alert severity="info">
                  铸造的法币通证将直接发送到做市商或景区的主钱包地址。
                </Alert>

                <FormControl fullWidth>
                  <InputLabel>选择已注册主账户</InputLabel>
                  <Select
                    value={selectedAccount}
                    onChange={(e) => {
                      setSelectedAccount(e.target.value);
                      setTargetAddress('');
                    }}
                    label="选择已注册主账户"
                  >
                    <MenuItem value="">
                      <em>手动输入地址</em>
                    </MenuItem>
                    {mainAccounts.map((account) => (
                      <MenuItem key={account.address} value={account.address}>
                        {account.name} ({account.role}) - {account.address}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {!selectedAccount && (
                  <TextField
                    fullWidth
                    label="或手动输入主账户地址"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="0x..."
                    helperText="输入做市商或景区的主钱包地址"
                  />
                )}

                <TextField
                  fullWidth
                  type="number"
                  label="铸造金额（元）"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  inputProps={{ min: 0, step: 0.0001 }}
                  helperText="输入要铸造的法币通证数量（最多4位小数）"
                />

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SendIcon />}
                  onClick={handleMint}
                  disabled={submitting}
                >
                  确认铸造
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => !submitting && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>确认铸造法币通证</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              请确认以下信息无误，铸造操作将立即执行且不可撤销
            </Alert>

            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="text.secondary">铸造金额</Typography>
                </Grid>
                <Grid size={{ xs: 8 }}>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {amount} 元
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}><Divider /></Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="text.secondary">签名账户</Typography>
                </Grid>
                <Grid size={{ xs: 8 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {currentBackendWallet.name}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}><Divider /></Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    目标主账户地址
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedAccount || targetAddress}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={submitting}>
            {submitting ? '铸造中...' : '确认铸造'}
          </Button>
        </DialogActions>
      </Dialog>

      <ContractInteractionPanel title="法币铸造合约交互" record={lastInteraction} />
    </Box>
  );
};

export default FiatMintPage;
