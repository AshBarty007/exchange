// src/pages/RoleManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';

interface RoleInfo {
  name: string;
  hash: string;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

interface AccountRole {
  address: string;
  roles: string[];
  isFrozen: boolean;
  freezeReason: string;
}

// Role hashes: read directly from Auth contract on-chain constants
const ROLES: RoleInfo[] = [
  {
    name: 'ADMIN_ROLE',
    hash: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
    description: '系统管理员 - 最高权限',
    color: 'error',
  },
  {
    name: 'REGULATOR_ROLE',
    hash: '0x20b5f7ac978e5d6199de06401411960dfa81d2f762655f6206bdc61d46fc19e6',
    description: '监管节点 - 监管和合规',
    color: 'secondary',
  },
  {
    name: 'BANK_ROLE',
    hash: '0x591fa5458fe051cc8c02c405479bd38e00713c98dbd3db209d982048f1e638fa',
    description: '银行节点 - 法币管理',
    color: 'primary',
  },
  {
    name: 'EXCHANGE_ADMIN_ROLE',
    hash: '0x541943c4a49765b7940b4b1392c4b1f8ede6efd4e23572572987ae02e569a786',
    description: '交易所管理员 - 交易管理',
    color: 'info',
  },
  {
    name: 'SCENIC_OPERATOR_ROLE',
    hash: '0xd381d6cec5c09ae4e4951c715a6ed8273b7b5e5201f379547dd129c126530654',
    description: '景区运营 - 门票管理',
    color: 'success',
  },
  {
    name: 'MARKET_MAKER_ROLE',
    hash: '0x75e5bf8b7de9fd9f24c97951733c6410a040b7a07b543096cb36c6dda365aa8b',
    description: '做市商 - 提供流动性',
    color: 'warning',
  },
  {
    name: 'CONSUMER_ROLE',
    hash: '0x9d56108290ea0bc9c5c59c3ad357dca9d1b29ed7f3ae1443bef2fa2159bdf5e8',
    description: '消费者 - 基本交易',
    color: 'primary',
  },
];

const RoleManagement: React.FC = () => {
  const { currentBackendWallet, backendWallets } = useWalletStore();
  const [accounts, setAccounts] = useState<AccountRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 授予角色对话框
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantAddress, setGrantAddress] = useState('');
  const [grantRole, setGrantRole] = useState('');
  const [granting, setGranting] = useState(false);

  // 撤销角色对话框
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeAddress, setRevokeAddress] = useState('');
  const [revokeRole, setRevokeRole] = useState('');
  const [revoking, setRevoking] = useState(false);

  // 冻结账户对话框
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezeAddress, setFreezeAddress] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [freezing, setFreezing] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    if (!currentBackendWallet) return;
    setLoading(true);
    setError('');

    try {
      const addresses = backendWallets.map((w) => w.address).filter(Boolean);
      if (addresses.length === 0) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const results: AccountRole[] = await Promise.all(
        addresses.map(async (addr) => {
          const roles: string[] = [];
          await Promise.all(
            ROLES.map(async (role) => {
              try {
                const res = await contractService.call('Auth', 'hasRole', [role.hash, addr], ['bool']);
                if (res[0]) roles.push(role.name);
              } catch {
                // ignore
              }
            })
          );
          let isFrozen = false;
          let freezeReason = '';
          try {
            const frozenRes = await contractService.call('Auth', 'isFrozen', [addr], ['bool']);
            isFrozen = !!frozenRes[0];
          } catch {
            // ignore
          }
          return { address: addr, roles, isFrozen, freezeReason };
        })
      );

      setAccounts(results);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
      setError('加载账户失败: ' + (err.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleGrantRole = async () => {
    if (!grantAddress || !grantRole) {
      setError('请输入地址和选择角色');
      return;
    }

    if (!currentBackendWallet) {
      setError('请先选择账户');
      return;
    }

    setGranting(true);
    setError('');

    try {
      const roleHash = ROLES.find(r => r.name === grantRole)?.hash;
      if (!roleHash) {
        throw new Error('Invalid role');
      }

      await contractService.sendWithSigner(
        'Auth',
        'grantRole',
        [roleHash, grantAddress],
        currentBackendWallet.address
      );

      setSuccess(`成功授予 ${grantRole} 给 ${grantAddress}`);
      setGrantDialogOpen(false);
      setGrantAddress('');
      setGrantRole('');
      await loadAccounts();
    } catch (err: any) {
      console.error('Failed to grant role:', err);
      setError('授予角色失败: ' + (err.message || '未知错误'));
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeRole = async () => {
    if (!revokeAddress || !revokeRole) {
      setError('请输入地址和选择角色');
      return;
    }

    if (!currentBackendWallet) {
      setError('请先选择账户');
      return;
    }

    setRevoking(true);
    setError('');

    try {
      const roleHash = ROLES.find(r => r.name === revokeRole)?.hash;
      if (!roleHash) {
        throw new Error('Invalid role');
      }

      await contractService.sendWithSigner(
        'Auth',
        'revokeRole',
        [roleHash, revokeAddress],
        currentBackendWallet.address
      );

      setSuccess(`成功撤销 ${revokeRole} 从 ${revokeAddress}`);
      setRevokeDialogOpen(false);
      setRevokeAddress('');
      setRevokeRole('');
      await loadAccounts();
    } catch (err: any) {
      console.error('Failed to revoke role:', err);
      setError('撤销角色失败: ' + (err.message || '未知错误'));
    } finally {
      setRevoking(false);
    }
  };

  const handleFreezeAccount = async () => {
    if (!freezeAddress || !freezeReason) {
      setError('请输入地址和冻结原因');
      return;
    }

    if (!currentBackendWallet) {
      setError('请先选择账户');
      return;
    }

    setFreezing(true);
    setError('');

    try {
      await contractService.sendWithSigner(
        'Auth',
        'freezeAccount',
        [freezeAddress, freezeReason],
        currentBackendWallet.address
      );

      setSuccess(`成功冻结账户 ${freezeAddress}`);
      setFreezeDialogOpen(false);
      setFreezeAddress('');
      setFreezeReason('');
      await loadAccounts();
    } catch (err: any) {
      console.error('Failed to freeze account:', err);
      setError('冻结账户失败: ' + (err.message || '未知错误'));
    } finally {
      setFreezing(false);
    }
  };

  const handleUnfreezeAccount = async (address: string) => {
    if (!currentBackendWallet) {
      setError('请先选择账户');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await contractService.sendWithSigner(
        'Auth',
        'unfreezeAccount',
        [address],
        currentBackendWallet.address
      );

      setSuccess(`成功解冻账户 ${address}`);
      await loadAccounts();
    } catch (err: any) {
      console.error('Failed to unfreeze account:', err);
      setError('解冻账户失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (roleName: string) => {
    return ROLES.find(r => r.name === roleName);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!currentBackendWallet) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">请先前往钱包管理页面选择账户</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        {/* 页面标题 */}
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            角色权限管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理系统角色和账户权限
          </Typography>
        </Box>

        {/* 警告提示 */}
        <Alert severity="warning" icon={<WarningIcon />}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            ⚠️ 测试环境警告
          </Typography>
          <Typography variant="body2">
            当前 Auth 合约为测试版本，任何人都可以授予/撤销角色。生产环境必须添加权限检查！
          </Typography>
        </Alert>

        {/* 错误和成功提示 */}
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* 角色说明卡片 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              角色说明
            </Typography>
            <Stack spacing={1}>
              {ROLES.map((role) => (
                <Box
                  key={role.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'background.default',
                  }}
                >
                  <Chip label={role.name} color={role.color} size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {role.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setGrantDialogOpen(true)}
          >
            授予角色
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => setRevokeDialogOpen(true)}
          >
            撤销角色
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<BlockIcon />}
            onClick={() => setFreezeDialogOpen(true)}
          >
            冻结账户
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAccounts}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>

        {/* 账户列表 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              账户列表
            </Typography>

            {loading && accounts.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>地址</TableCell>
                      <TableCell>角色</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                            暂无账户数据
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((account) => (
                        <TableRow key={account.address} hover>
                          <TableCell>
                            <Tooltip title={account.address}>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace' }}
                              >
                                {truncateAddress(account.address)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {account.roles.map((role) => {
                                const roleInfo = getRoleInfo(role);
                                return (
                                  <Chip
                                    key={role}
                                    label={role}
                                    color={roleInfo?.color || 'default'}
                                    size="small"
                                    sx={{ mb: 0.5 }}
                                  />
                                );
                              })}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {account.isFrozen ? (
                              <Tooltip title={account.freezeReason}>
                                <Chip
                                  label="已冻结"
                                  color="error"
                                  size="small"
                                  icon={<BlockIcon />}
                                />
                              </Tooltip>
                            ) : (
                              <Chip
                                label="正常"
                                color="success"
                                size="small"
                                icon={<CheckIcon />}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {account.isFrozen ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleUnfreezeAccount(account.address)}
                              >
                                解冻
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  setFreezeAddress(account.address);
                                  setFreezeDialogOpen(true);
                                }}
                              >
                                冻结
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* 授予角色对话框 */}
      <Dialog
        open={grantDialogOpen}
        onClose={() => !granting && setGrantDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>授予角色</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="账户地址"
              value={grantAddress}
              onChange={(e) => setGrantAddress(e.target.value)}
              placeholder="0x..."
            />
            <FormControl fullWidth>
              <InputLabel>选择角色</InputLabel>
              <Select
                value={grantRole}
                label="选择角色"
                onChange={(e) => setGrantRole(e.target.value)}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.name} value={role.name}>
                    {role.name} - {role.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDialogOpen(false)} disabled={granting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleGrantRole}
            disabled={granting || !grantAddress || !grantRole}
          >
            {granting ? '授予中...' : '确认授予'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 撤销角色对话框 */}
      <Dialog
        open={revokeDialogOpen}
        onClose={() => !revoking && setRevokeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>撤销角色</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="账户地址"
              value={revokeAddress}
              onChange={(e) => setRevokeAddress(e.target.value)}
              placeholder="0x..."
            />
            <FormControl fullWidth>
              <InputLabel>选择角色</InputLabel>
              <Select
                value={revokeRole}
                label="选择角色"
                onChange={(e) => setRevokeRole(e.target.value)}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.name} value={role.name}>
                    {role.name} - {role.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={revoking}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevokeRole}
            disabled={revoking || !revokeAddress || !revokeRole}
          >
            {revoking ? '撤销中...' : '确认撤销'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 冻结账户对话框 */}
      <Dialog
        open={freezeDialogOpen}
        onClose={() => !freezing && setFreezeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>冻结账户</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              冻结账户后，该账户将无法进行任何交易操作
            </Alert>
            <TextField
              fullWidth
              label="账户地址"
              value={freezeAddress}
              onChange={(e) => setFreezeAddress(e.target.value)}
              placeholder="0x..."
            />
            <TextField
              fullWidth
              label="冻结原因"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="请输入冻结原因"
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreezeDialogOpen(false)} disabled={freezing}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleFreezeAccount}
            disabled={freezing || !freezeAddress || !freezeReason}
          >
            {freezing ? '冻结中...' : '确认冻结'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleManagement;
