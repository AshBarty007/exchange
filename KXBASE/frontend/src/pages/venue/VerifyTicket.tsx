import React, { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  CheckCircle as VerifyIcon,
  History as HistoryIcon,
  LocalActivity as TicketIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';

interface VerificationRecord {
  ticketId: number;
  holder: string;
  amount: number;
  timestamp: number;
  txHash: string;
}

const VerifyTicket: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();

  // 核销表单
  const [ticketId, setTicketId] = useState('');
  const [holderAddress, setHolderAddress] = useState('');
  const [verifyAmount, setVerifyAmount] = useState('1');

  // 对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [success, setSuccess] = useState(false);

  // 核销记录
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);

  const handleVerify = () => {
    setError('');

    if (!ticketId || parseInt(ticketId) <= 0) {
      setError('请输入有效的门票ID');
      return;
    }
    if (!holderAddress.trim()) {
      setError('请输入持票人地址');
      return;
    }
    if (!verifyAmount || parseInt(verifyAmount) <= 0) {
      setError('请输入有效的核销数量');
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
      // 调用合约核销门票（后端钱包签名）
      const hash = await contractService.sendWithSigner(
        'Ticket',
        'verifyTicket',
        [holderAddress, parseInt(ticketId), parseInt(verifyAmount)],
        currentBackendWallet.address
      );

      setTxHash(hash);
      setSuccess(true);
      setConfirmDialogOpen(false);

      // 添加到核销记录
      const newRecord: VerificationRecord = {
        ticketId: parseInt(ticketId),
        holder: holderAddress,
        amount: parseInt(verifyAmount),
        timestamp: Date.now(),
        txHash: hash,
      };
      setVerificationHistory([newRecord, ...verificationHistory]);

      // 重置表单
      setTimeout(() => {
        setTicketId('');
        setHolderAddress('');
        setVerifyAmount('1');
        setSuccess(false);
        setTxHash('');
      }, 3000);
    } catch (err: any) {
      setError('核销失败: ' + (err.message || '网络错误'));
    } finally {
      setSubmitting(false);
    }
  };

  const [scanInfo, setScanInfo] = useState('');

  const handleScanQR = () => {
    // 扫码功能需要集成摄像头API，此处填入演示数据
    setScanInfo('扫码功能需要集成摄像头API，已填入演示数据');
    setTicketId('1');
    setHolderAddress('0x1234567890123456789012345678901234567890');
    setTimeout(() => setScanInfo(''), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        门票核销
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        景区工作人员可在此核销游客的门票，支持扫码或手动输入
      </Typography>

      {!currentBackendWallet && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          请先前往钱包管理页面选择账户
        </Alert>
      )}

      {scanInfo && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setScanInfo('')}>
          {scanInfo}
        </Alert>
      )}

      {success && txHash && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          <Typography variant="body2" gutterBottom>
            门票核销成功！
          </Typography>
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
        {/* 左侧：核销表单 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                核销信息
              </Typography>

              <Stack spacing={3} sx={{ mt: 2 }}>
                {/* 扫码按钮 */}
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ScanIcon />}
                  onClick={handleScanQR}
                  fullWidth
                >
                  扫描门票二维码
                </Button>

                <Divider>
                  <Chip label="或手动输入" size="small" />
                </Divider>

                <TextField
                  fullWidth
                  type="number"
                  label="门票 ID"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="1"
                  inputProps={{ min: 1 }}
                  required
                />

                <TextField
                  fullWidth
                  label="持票人地址"
                  value={holderAddress}
                  onChange={(e) => setHolderAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  helperText="持有该门票的用户钱包地址"
                />

                <TextField
                  fullWidth
                  type="number"
                  label="核销数量"
                  value={verifyAmount}
                  onChange={(e) => setVerifyAmount(e.target.value)}
                  placeholder="1"
                  inputProps={{ min: 1 }}
                  required
                  helperText="一次可核销多张门票"
                />

                <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<VerifyIcon />}
                    onClick={handleVerify}
                    disabled={!currentBackendWallet || submitting}
                    fullWidth
                  >
                    确认核销
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      setTicketId('');
                      setHolderAddress('');
                      setVerifyAmount('1');
                      setError('');
                    }}
                    disabled={submitting}
                  >
                    重置
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：核销预览 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TicketIcon color="primary" />
                <Typography variant="h6">
                  核销预览
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    门票 ID
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {ticketId || '-'}
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    核销数量
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {verifyAmount || '0'} 张
                  </Typography>
                </Paper>

                <Divider />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      持票人地址
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    {holderAddress || '-'}
                  </Typography>
                </Box>

                {currentBackendWallet && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        核销账户
                      </Typography>
                      <Chip label={currentBackendWallet.name} size="small" color="primary" />
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                        {currentBackendWallet.address.slice(0, 10)}...{currentBackendWallet.address.slice(-8)}
                      </Typography>
                    </Box>
                  </>
                )}

                <Alert severity="info" icon={<VerifyIcon />}>
                  核销后门票将被标记为已使用，无法再次核销
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 核销记录 */}
      {verificationHistory.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6">
                本次核销记录 ({verificationHistory.length})
              </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>门票ID</TableCell>
                    <TableCell>持票人</TableCell>
                    <TableCell>数量</TableCell>
                    <TableCell>核销时间</TableCell>
                    <TableCell>交易哈希</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {verificationHistory.map((record, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Chip label={`#${record.ticketId}`} size="small" color="primary" />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {record.holder.slice(0, 10)}...{record.holder.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {record.amount} 张
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {record.txHash.slice(0, 12)}...{record.txHash.slice(-8)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 确认对话框 */}
      <Dialog open={confirmDialogOpen} onClose={() => !submitting && setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认核销门票</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              核销后门票将被标记为已使用，此操作不可撤销，请确认信息无误
            </Alert>

            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    门票 ID
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" fontWeight="medium">
                    #{ticketId}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    核销数量
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {verifyAmount} 张
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    持票人地址
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    {holderAddress}
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
            startIcon={<VerifyIcon />}
            color="success"
          >
            {submitting ? '核销中...' : '确认核销'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerifyTicket;
