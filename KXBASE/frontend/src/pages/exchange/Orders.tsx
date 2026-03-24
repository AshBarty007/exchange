import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  ShoppingCart as BuyIcon,
  Sell as SellIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import { OrderType } from '@/types';
import { rawToFiat } from '@/utils/fiatAmount';

interface Order {
  orderId: number;
  maker: string;
  orderType: number;
  ticketId: number;
  price: string;
  amount: number;
  filled: number;
  expiry: number;
  status: number;
  createdAt: number;
}

const statusLabel: Record<number, string> = {
  0: '待成交',
  1: '部分成交',
  2: '已完成',
  3: '已取消',
};

const statusColor: Record<number, 'default' | 'warning' | 'success' | 'error'> = {
  0: 'warning',
  1: 'default',
  2: 'success',
  3: 'error',
};

function truncAddr(addr: string) {
  return addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : '';
}

const Orders: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [subAccounts, setSubAccounts] = useState<string[]>([]);
  const [subAccountsLoaded, setSubAccountsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const mainAddress = currentBackendWallet?.address || '';

  // 获取子账户列表
  useEffect(() => {
    if (!mainAddress) { setSubAccounts([]); setSubAccountsLoaded(false); return; }
    setSubAccountsLoaded(false);
    contractService.getSubAccounts(mainAddress)
      .then((addrs) => { setSubAccounts(addrs); setSubAccountsLoaded(true); })
      .catch(() => { setSubAccounts([]); setSubAccountsLoaded(true); });
  }, [mainAddress]);

  const fetchOrders = useCallback(async () => {
    if (!mainAddress || !subAccountsLoaded) return;

    setLoading(true);
    setError('');
    try {
      // 只查子账户的订单（只有子账户能下单）
      if (subAccounts.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const allOrderIds = new Set<number>();

      await Promise.all(
        subAccounts.map(async (addr) => {
          try {
            const ids = await contractService.getAccountOrders(addr);
            ids.forEach((id) => allOrderIds.add(id));
          } catch {
            // skip failed address
          }
        })
      );

      if (allOrderIds.size === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // 获取每个订单的详细信息
      const orderList: Order[] = [];
      await Promise.all(
        Array.from(allOrderIds).map(async (orderId) => {
          try {
            const orderData = await contractService.getOrder(orderId);
            // [0] orderId, [1] account, [2] orderType, [3] ticketId, [4] price,
            // [5] amount, [6] filledAmount, [7] status, [8] createdAt, [9] expiry
            orderList.push({
              orderId: Number(orderData[0] || orderId),
              maker: orderData[1] || '',
              orderType: Number(orderData[2] || 0),
              ticketId: Number(orderData[3] || 0),
              price: orderData[4]?.toString() || '0',
              amount: Number(orderData[5] || 0),
              filled: Number(orderData[6] || 0),
              status: Number(orderData[7] || 0),
              createdAt: Number(orderData[8] || 0),
              expiry: Number(orderData[9] || 0),
            });
          } catch (err) {
            console.error(`Failed to fetch order ${orderId}:`, err);
          }
        })
      );

      // 按创建时间倒序
      orderList.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(orderList);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError('获取订单列表失败: ' + (err.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  }, [mainAddress, subAccounts, subAccountsLoaded]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleCancelClick = (order: Order) => {
    if (order.status !== 0 && order.status !== 1) {
      setError('只能取消待成交或部分成交的订单');
      return;
    }
    setSelectedOrder(order);
    setCancelDialogOpen(true);
    setError('');
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !mainAddress) return;

    setCancelling(true);
    setError('');

    try {
      // 主账户签名取消订单（合约已支持主账户取消子账户订单）
      await contractService.cancelOrderWithSigner(selectedOrder.orderId, mainAddress);
      setCancelDialogOpen(false);
      fetchOrders();
    } catch (err: any) {
      setError('取消订单失败: ' + (err.message || '网络错误'));
    } finally {
      setCancelling(false);
    }
  };

  // 判断 maker 地址属于哪个账户
  const makerLabel = (maker: string) => {
    if (!maker) return '';
    if (maker.toLowerCase() === mainAddress.toLowerCase()) return '主账户';
    const idx = subAccounts.findIndex((a) => a.toLowerCase() === maker.toLowerCase());
    if (idx >= 0) return `子账户 #${idx + 1}`;
    return truncAddr(maker);
  };

  return (
    <Box>
      <Stack spacing={3}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              我的订单
            </Typography>
            <Typography variant="body2" color="text.secondary">
              查看和管理主账户及所有子账户的买卖订单
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchOrders}
            disabled={loading || !mainAddress}
          >
            刷新
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!currentBackendWallet && (
          <Alert severity="warning">
            请先前往钱包管理页面选择账户
          </Alert>
        )}

        {/* 订单统计 */}
        {currentBackendWallet && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    总订单数
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {orders.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    待成交
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {orders.filter(o => o.status === 0).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    已完成
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {orders.filter(o => o.status === 2).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    已取消
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {orders.filter(o => o.status === 3).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* 订单列表 */}
        <Card>
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>订单ID</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>账户</TableCell>
                    <TableCell>门票ID</TableCell>
                    <TableCell>价格</TableCell>
                    <TableCell>数量</TableCell>
                    <TableCell>已成交</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                        <Typography color="text.secondary">
                          {subAccounts.length === 0 ? '当前账户没有子账户，请先创建子账户后下单' : '暂无订单记录'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.orderId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            #{order.orderId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={order.orderType === OrderType.BUY ? <BuyIcon /> : <SellIcon />}
                            label={order.orderType === OrderType.BUY ? '买单' : '卖单'}
                            size="small"
                            color={order.orderType === OrderType.BUY ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={makerLabel(order.maker)}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            #{order.ticketId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            ¥{rawToFiat(order.price)}
                          </Typography>
                        </TableCell>
                        <TableCell>{order.amount}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color={order.filled > 0 ? 'success.main' : 'text.secondary'}>
                            {order.filled}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabel[order.status]}
                            size="small"
                            color={statusColor[order.status]}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.createdAt > 0 ? new Date(order.createdAt).toLocaleString('zh-CN') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              size="small"
                              startIcon={<InfoIcon />}
                              onClick={() => handleViewDetail(order)}
                            >
                              详情
                            </Button>
                            {(order.status === 0 || order.status === 1) && (
                              <Button
                                size="small"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => handleCancelClick(order)}
                                disabled={!mainAddress}
                              >
                                取消
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>

      {/* 订单详情对话框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>订单详情</DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      订单ID
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      #{selectedOrder.orderId}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      订单类型
                    </Typography>
                    <Chip
                      label={selectedOrder.orderType === OrderType.BUY ? '买单' : '卖单'}
                      size="small"
                      color={selectedOrder.orderType === OrderType.BUY ? 'success' : 'error'}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  交易信息
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      门票ID
                    </Typography>
                    <Typography variant="body1">
                      #{selectedOrder.ticketId}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      价格
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      ¥{rawToFiat(selectedOrder.price)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      总数量
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.amount}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      已成交
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      {selectedOrder.filled}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      剩余数量
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.amount - selectedOrder.filled}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      订单状态
                    </Typography>
                    <Chip
                      label={statusLabel[selectedOrder.status]}
                      size="small"
                      color={statusColor[selectedOrder.status]}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  时间信息
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      创建时间
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.createdAt > 0 ? new Date(selectedOrder.createdAt).toLocaleString('zh-CN') : '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      过期时间
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.expiry > 0 ? new Date(selectedOrder.expiry).toLocaleString('zh-CN') : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  挂单账户
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={makerLabel(selectedOrder.maker)} size="small" variant="outlined" />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedOrder.maker}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 取消订单对话框 */}
      <Dialog open={cancelDialogOpen} onClose={() => !cancelling && setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>取消订单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              确定要取消此订单吗？取消后无法恢复
            </Alert>

            {selectedOrder && (
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  订单 #{selectedOrder.orderId}
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.orderType === OrderType.BUY ? '买单' : '卖单'} - 门票#{selectedOrder.ticketId}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  挂单账户: {makerLabel(selectedOrder.maker)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  剩余数量: {selectedOrder.amount - selectedOrder.filled}
                </Typography>
              </Paper>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
            返回
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelOrder}
            disabled={cancelling}
            startIcon={<CancelIcon />}
          >
            {cancelling ? '取消中...' : '确认取消订单'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Orders;
