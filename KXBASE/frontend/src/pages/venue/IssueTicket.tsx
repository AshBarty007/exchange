import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalBase } from '@/hooks/usePortalBase';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  LocalActivity as TicketIcon,
  CalendarToday as CalendarIcon,
  AccountTree as SubAccountIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import contractInteractionService, { ContractInteractionRecord } from '@/services/contractInteractionService';
import ContractInteractionPanel from '@/components/ContractInteractionPanel';
import { fiatToRaw } from '@/utils/fiatAmount';

const toDateStartTimestamp = (dateText: string): number => {
  const [year, month, day] = dateText.split('-').map((item) => Number(item));
  return new Date(year, month - 1, day, 0, 0, 0).getTime();
};

const toDateEndTimestamp = (dateText: string): number => {
  const [year, month, day] = dateText.split('-').map((item) => Number(item));
  return new Date(year, month - 1, day, 23, 59, 59).getTime();
};

const parseIssueError = (raw: unknown): string => {
  const message = raw instanceof Error ? raw.message : String(raw || '');

  if (message.includes('Only scenic operator can issue tickets')) {
    return '链上校验失败：当前钱包未被授予景区运营角色（SCENIC_OPERATOR_ROLE）。';
  }
  if (message.includes('Sub-account must belong to scenic operator')) {
    return '链上校验失败：所选子账户不属于当前景区主账户。请到账户管理重新创建或切换子账户。';
  }
  if (message.includes('End time must be in the future')) {
    return '链上校验失败：结束时间必须晚于当前时间，请把结束日期调整到更晚日期。';
  }
  if (message.includes('Invalid validity period')) {
    return '链上校验失败：有效期不合法（结束时间必须晚于开始时间）。';
  }

  return message || '网络错误';
};

const IssueTicket: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const { currentBackendWallet } = useWalletStore();

  // 表单状态
  const [ticketName, setTicketName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('');

  // 权限与子账户状态
  const [isScenicRole, setIsScenicRole] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [subAccounts, setSubAccounts] = useState<string[]>([]);
  const [scenicSubAccount, setScenicSubAccount] = useState('');

  // 对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<ContractInteractionRecord | null>(null);

  useEffect(() => {
    checkScenicRole();
    loadScenicSubAccount();
  }, [currentBackendWallet]);

  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.mode !== 'send') return;
      if (record.method.toLowerCase().includes('issueticket')) {
        setLastInteraction(record);
      }
    });
  }, []);

  const checkScenicRole = async () => {
    if (!currentBackendWallet) {
      setIsScenicRole(false);
      setCheckingRole(false);
      return;
    }
    setCheckingRole(true);
    try {
      const roleResult = await contractService.call('Auth', 'SCENIC_OPERATOR_ROLE', [], ['bytes32']);
      const roleHash = roleResult[0]?.toString() || '';
      const hasRole = await contractService.call('Auth', 'hasRole', [roleHash, currentBackendWallet.address], ['bool']);
      setIsScenicRole(!!hasRole[0]);
    } catch {
      setIsScenicRole(currentBackendWallet.role === 'scenic');
    } finally {
      setCheckingRole(false);
    }
  };

  const loadScenicSubAccount = async () => {
    if (!currentBackendWallet) {
      setSubAccounts([]);
      setScenicSubAccount('');
      return;
    }
    try {
      const list = await contractService.getSubAccounts(currentBackendWallet.address);
      setSubAccounts(list);
      setScenicSubAccount(list[0] || '');
    } catch {
      setSubAccounts([]);
      setScenicSubAccount('');
    }
  };

  const handleSubmit = () => {
    setError('');

    if (!ticketName.trim()) {
      setError('请输入门票名称');
      return;
    }
    if (!totalSupply || parseInt(totalSupply) <= 0) {
      setError('请输入有效的发行数量');
      return;
    }
    if (!minPrice || parseFloat(minPrice) <= 0) {
      setError('请输入有效的最低价格');
      return;
    }
    if (!maxPrice || parseFloat(maxPrice) <= 0) {
      setError('请输入有效的最高价格');
      return;
    }
    if (parseFloat(minPrice) > parseFloat(maxPrice)) {
      setError('最低价格不能高于最高价格');
      return;
    }
    if (!validFrom || !validUntil) {
      setError('请选择有效期');
      return;
    }
    const validFromTimestamp = toDateStartTimestamp(validFrom);
    const validUntilTimestamp = toDateEndTimestamp(validUntil);
    if (validFromTimestamp >= validUntilTimestamp) {
      setError('结束日期必须晚于开始日期');
      return;
    }
    if (validUntilTimestamp <= Date.now()) {
      setError('结束日期必须晚于当前时间');
      return;
    }
    if (!scenicSubAccount) {
      setError('景区主账户尚未创建子账户，请先在账户管理中为该账户创建子账户');
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
      const validFromTimestamp = toDateStartTimestamp(validFrom);
      const validUntilTimestamp = toDateEndTimestamp(validUntil);

      // 精度4位：1元 = 10000单位（最小单位0.0001元）
      const minPriceWei = fiatToRaw(minPrice);
      const maxPriceWei = fiatToRaw(maxPrice);

      // 描述信息直接作为字符串存储（合约字段类型为string）
      const infoHash = description;
      const supply = parseInt(totalSupply);

      let hash = '';
      try {
        hash = await contractService.issueTicketWithSigner(
          scenicSubAccount,
          ticketName,
          supply,
          minPriceWei,
          maxPriceWei,
          validFromTimestamp,
          validUntilTimestamp,
          infoHash,
          currentBackendWallet.address
        );
      } catch (primaryErr) {
        try {
          // 兼容旧版 Ticket 合约（6参数 issueTicket），避免前后端升级不同步导致的回滚。
          hash = await contractService.sendWithSigner(
            'Ticket',
            'issueTicket(string,uint256,uint256,uint256,uint256,string)',
            [ticketName, supply, minPriceWei, validFromTimestamp, validUntilTimestamp, infoHash],
            currentBackendWallet.address
          );
        } catch (legacyErr: any) {
          const primaryMsg = parseIssueError(primaryErr);
          const legacyMsg = parseIssueError(legacyErr);
          throw new Error(`${primaryMsg}（兼容旧版重试也失败：${legacyMsg}）`);
        }
      }

      setTxHash(hash);
      setSuccess(true);
      setConfirmDialogOpen(false);

      // 刷新子账户（发行后余额归集到子账户）
      setTimeout(() => loadScenicSubAccount(), 2000);

      setTimeout(() => {
        setTicketName('');
        setTotalSupply('');
        setMinPrice('');
        setMaxPrice('');
        setValidFrom('');
        setValidUntil('');
        setDescription('');
        setSuccess(false);
        setTxHash('');
      }, 8000);
    } catch (err: any) {
      setError('发行门票失败: ' + parseIssueError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTicketName('');
    setTotalSupply('');
    setMinPrice('');
    setMaxPrice('');
    setValidFrom('');
    setValidUntil('');
    setDescription('');
    setError('');
    setTxHash('');
    setSuccess(false);
  };

  const totalValue = totalSupply && maxPrice
    ? (parseInt(totalSupply) * parseFloat(maxPrice)).toFixed(4)
    : '0';

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

  if (!isScenicRole) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Card sx={{ border: 2, borderColor: 'error.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 3 }}>
              <TicketIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom fontWeight="bold" color="error">
                权限不足
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                当前账户不是景区运营方角色，无权限发行门票
              </Typography>

              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                只有景区运营方账户才能发行门票。请在钱包管理页面切换到景区身份账户后再访问此页面。
              </Alert>

              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', width: '100%' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  当前账户信息
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>账户名称:</strong> {currentBackendWallet.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    <strong>地址:</strong> {currentBackendWallet.address}
                  </Typography>
                  <Typography variant="body2">
                    <strong>角色:</strong> <Chip label={currentBackendWallet.role} size="small" color="default" />
                  </Typography>
                </Box>
              </Paper>

              <Button
                variant="contained"
                sx={{ mt: 3 }}
                onClick={() => navigate(`${portalBase}/wallets`)}
              >
                前往钱包管理
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        门票发行
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        景区运营方可在此发行新的门票，发行后门票将自动归集到景区专属托管子账户
      </Typography>

      {success && txHash && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          <Typography variant="body2" gutterBottom fontWeight="bold">
            门票发行成功！已归集到景区子账户
          </Typography>
          {scenicSubAccount && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mb: 0.5 }}>
              子账户地址: {scenicSubAccount}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
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
        {/* 左侧：表单 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                门票信息
              </Typography>

              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="门票名称"
                  value={ticketName}
                  onChange={(e) => setTicketName(e.target.value)}
                  placeholder="例如：黄山风景区一日游"
                  required
                />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="发行数量"
                      value={totalSupply}
                      onChange={(e) => setTotalSupply(e.target.value)}
                      placeholder="10000"
                      inputProps={{ min: 1 }}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="最低价格（元）"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="150"
                      inputProps={{ min: 0, step: 0.0001 }}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="最高价格（元）"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="190"
                      inputProps={{ min: 0, step: 0.0001 }}
                      required
                    />
                  </Grid>
                </Grid>
                <Divider />

                <Typography variant="subtitle2" color="text.secondary">
                  有效期设置
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="开始日期"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="结束日期"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary">
                  时间戳按毫秒提交，结束日期按当天 23:59:59 计算。
                </Typography>

                <Divider />

                <Typography variant="subtitle2" color="text.secondary">
                  归集子账户
                </Typography>

                {subAccounts.length > 0 ? (
                  <FormControl fullWidth required>
                    <InputLabel>选择子账户</InputLabel>
                    <Select
                      value={scenicSubAccount}
                      label="选择子账户"
                      onChange={(e) => setScenicSubAccount(e.target.value)}
                    >
                      {subAccounts.map((addr) => (
                        <MenuItem key={addr} value={addr}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {addr}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Alert severity="warning">
                    未找到子账户，请先在账户管理中为该账户创建子账户
                  </Alert>
                )}

                <Divider />

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="门票描述"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入门票的详细描述、使用规则等信息..."
                  helperText="描述信息将以哈希形式存储在链上"
                />

                <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    发行门票
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleReset}
                    disabled={submitting}
                  >
                    重置
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：预览 + 账户信息 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TicketIcon color="primary" />
                <Typography variant="h6">发行预览</Typography>
              </Box>

              <Stack spacing={2}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    门票名称
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {ticketName || '-'}
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    发行数量
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {totalSupply || '0'} 张
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    价格区间
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    ¥{minPrice || '0'} ~ ¥{maxPrice || '0'}
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    总价值（按最高价）
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ¥{totalValue}
                  </Typography>
                </Paper>

                <Divider />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      有效期
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {validFrom ? new Date(validFrom).toLocaleDateString('zh-CN') : '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
                    至
                  </Typography>
                  <Typography variant="body2">
                    {validUntil ? new Date(validUntil).toLocaleDateString('zh-CN') : '-'}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    发行账户（景区）
                  </Typography>
                  <Chip label={currentBackendWallet.name} size="small" color="primary" />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {currentBackendWallet.address}
                  </Typography>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SubAccountIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      门票归集子账户
                    </Typography>
                  </Box>
                  {scenicSubAccount ? (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'success.main' }}>
                      {scenicSubAccount}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="error">
                      未找到子账户，请先在账户管理中创建子账户
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 确认对话框 */}
      <Dialog open={confirmDialogOpen} onClose={() => !submitting && setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认发行门票</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              门票发行后将自动归集到景区托管子账户，请确认以下信息无误
            </Alert>

            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={1}>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">门票名称</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight="medium">{ticketName}</Typography>
                </Grid>

                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">发行数量</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight="medium">{totalSupply} 张</Typography>
                </Grid>

                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">价格区间</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight="medium">¥{minPrice} ~ ¥{maxPrice}</Typography>
                </Grid>

                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">总价值（按最高价）</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight="bold" color="primary">¥{totalValue}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">签名账户</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {currentBackendWallet.name}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">归集子账户</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                    {scenicSubAccount || '(未找到)'}
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
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={submitting}
            startIcon={<SendIcon />}
          >
            {submitting ? '发行中...' : '确认发行'}
          </Button>
        </DialogActions>
      </Dialog>

      <ContractInteractionPanel title="门票发行合约交互" record={lastInteraction} />
    </Box>
  );
};

export default IssueTicket;
