import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ActiveIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import type { BackendWallet } from '@/store/walletStore';

// ── 兼容 HTTP 非安全上下文的剪贴板复制 ──────────────────────────────────
function copyToClipboard(text: string): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.top = '-9999px';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

// ── 后端钱包角色配置 ──────────────────────────────────────────────────────
const backendRoles = [
  { value: 'bank', label: '银行' },
  { value: 'regulator', label: '监管机构' },
  { value: 'exchange', label: '交易所' },
  { value: 'scenic', label: '景区' },
  { value: 'market_maker', label: '做市商' },
  { value: 'consumer', label: '消费者' },
  { value: 'admin', label: '管理员' },
];

const roleColor = (role: string): any =>
  ({ admin: 'error', bank: 'primary', regulator: 'secondary', exchange: 'info', scenic: 'success', market_maker: 'warning', consumer: 'default' }[role] ?? 'default');

const roleLabel = (role: string) => backendRoles.find((r) => r.value === role)?.label ?? role;

const truncAddr = (addr: string) =>
  addr ? `${addr.slice(0, 10)}...${addr.slice(-8)}` : '';

// ═══════════════════════════════════════════════════════════════════════════
const Wallets: React.FC = () => {
  const {
    backendWallets, currentBackendWallet, loadBackendWallets, setCurrentBackendWallet,
  } = useWalletStore();

  const [snackbar, setSnackbar] = useState('');

  // ── 后端钱包状态 ────────────────────────────────────────────────────────
  const [backendLoading, setBackendLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: '', role: 'consumer' });
  const [creating, setCreating] = useState(false);
  const [deletingBackend, setDeletingBackend] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backendWalletToDelete, setBackendWalletToDelete] = useState<BackendWallet | null>(null);
  const [backendAlert, setBackendAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    handleRefreshBackend();
  }, []);

  const handleRefreshBackend = async () => {
    setBackendLoading(true);
    await loadBackendWallets();
    setBackendLoading(false);
  };

  const handleCreateBackend = async () => {
    if (!newWallet.name.trim()) return;
    setCreating(true);
    setBackendAlert(null);
    try {
      const res = await fetch('/api/v1/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWallet.name, role: newWallet.role }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const created: BackendWallet = await res.json();
      setBackendAlert({ type: 'success', msg: `创建成功：${created.address}` });
      setCreateDialogOpen(false);
      setNewWallet({ name: '', role: 'consumer' });
      await loadBackendWallets();
    } catch (err: any) {
      setBackendAlert({ type: 'error', msg: '创建失败：' + err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackendClick = (wallet: BackendWallet) => {
    setBackendWalletToDelete(wallet);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBackend = async () => {
    if (!backendWalletToDelete) return;
    setDeletingBackend(true);
    setBackendAlert(null);
    try {
      const res = await fetch(`/api/v1/wallets/delete/${backendWalletToDelete.address}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      if (currentBackendWallet?.address === backendWalletToDelete.address) {
        setCurrentBackendWallet(null);
      }
      setBackendAlert({ type: 'success', msg: `删除成功：${backendWalletToDelete.name || truncAddr(backendWalletToDelete.address)}` });
      setDeleteDialogOpen(false);
      setBackendWalletToDelete(null);
      await loadBackendWallets();
    } catch (err: any) {
      setBackendAlert({ type: 'error', msg: '删除失败：' + err.message });
    } finally {
      setDeletingBackend(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>钱包管理</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        管理后端 PEM 钱包，私钥保存在服务器 PEM 文件，用于所有合约签名操作。
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={backendLoading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={handleRefreshBackend} disabled={backendLoading}>刷新</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>创建钱包</Button>
        </Stack>
      </Box>

      {backendAlert && (
        <Alert severity={backendAlert.type} onClose={() => setBackendAlert(null)} sx={{ mb: 2 }}>
          {backendAlert.msg}
        </Alert>
      )}

      {currentBackendWallet && (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前使用：<strong>{currentBackendWallet.name || truncAddr(currentBackendWallet.address)}</strong>
          <Chip label={roleLabel(currentBackendWallet.role)} color={roleColor(currentBackendWallet.role)} size="small" sx={{ ml: 1 }} />
          <Typography variant="caption" sx={{ ml: 1, fontFamily: 'monospace' }}>{truncAddr(currentBackendWallet.address)}</Typography>
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {backendLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>名称</TableCell>
                    <TableCell>角色</TableCell>
                    <TableCell>地址</TableCell>
                    <TableCell align="center">当前</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backendWallets.map((w) => (
                    <TableRow
                      key={w.address}
                      selected={currentBackendWallet?.address === w.address}
                      hover
                      onClick={() => setCurrentBackendWallet(w)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell><Typography fontWeight={currentBackendWallet?.address === w.address ? 'bold' : 'normal'}>{w.name || '—'}</Typography></TableCell>
                      <TableCell><Chip label={roleLabel(w.role)} color={roleColor(w.role)} size="small" /></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                          {truncAddr(w.address)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {currentBackendWallet?.address === w.address && <ActiveIcon fontSize="small" color="success" />}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton size="small" title="复制地址" onClick={() => { copyToClipboard(w.address); setSnackbar('地址已复制'); }}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title="删除钱包"
                          onClick={() => handleDeleteBackendClick(w)}
                          disabled={deletingBackend}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {backendWallets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>暂无后端钱包，点击"创建钱包"生成</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 创建后端钱包 Dialog */}
      <Dialog open={createDialogOpen} onClose={() => !creating && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建后端钱包</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="钱包名称" value={newWallet.name} onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })} placeholder="例如：银行A" />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select value={newWallet.role} onChange={(e) => setNewWallet({ ...newWallet, role: e.target.value })} label="角色">
                {backendRoles.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">后端将生成密钥对并自动授予角色权限</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>取消</Button>
          <Button onClick={handleCreateBackend} variant="contained" disabled={!newWallet.name.trim() || creating} startIcon={creating ? <CircularProgress size={16} /> : undefined}>
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => !deletingBackend && setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认删除后端钱包</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
            此操作会删除后端 PEM 文件与钱包元数据，删除后不可恢复。
          </Alert>
          {backendWalletToDelete && (
            <Stack spacing={1}>
              <Typography variant="body2"><strong>名称：</strong>{backendWalletToDelete.name || '未命名'}</Typography>
              <Typography variant="body2"><strong>角色：</strong>{roleLabel(backendWalletToDelete.role)}</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                <strong>地址：</strong>{backendWalletToDelete.address}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deletingBackend}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteBackend}
            disabled={deletingBackend}
            startIcon={deletingBackend ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deletingBackend ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar('')} message={snackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default Wallets;
