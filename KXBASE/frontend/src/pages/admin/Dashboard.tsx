import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  AccountBalanceWallet as WalletIcon,
  Block as BlockIcon,
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import { usePortalBase } from '@/hooks/usePortalBase';
import fiscoBcosService from '@/services/fiscoBcosService';
import contractService from '@/services/contractService';

interface NetworkStats {
  blockNumber: number;
  clientVersion: string;
  isConnected: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { backendWallets, currentBackendWallet } = useWalletStore();
  const portalBase = usePortalBase();
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    blockNumber: 0,
    clientVersion: 'Unknown',
    isConnected: false,
  });
  const [loading, setLoading] = useState(false);
  const [contractCount, setContractCount] = useState(0);

  const refreshLocalStats = () => {
    setContractCount(contractService.getAllContracts().length);
  };

  const fetchNetworkInfo = async () => {
    setLoading(true);
    try {
      const [blockNumber, clientVersion] = await Promise.all([
        fiscoBcosService.getBlockNumber(),
        fiscoBcosService.getClientVersion(),
      ]);

      setNetworkStats({
        blockNumber,
        clientVersion,
        isConnected: true,
      });
    } catch (error) {
      console.error('Failed to fetch network info:', error);
      setNetworkStats(prev => ({ ...prev, isConnected: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await contractService.initializeContracts();
        refreshLocalStats();
      } catch (err) {
        console.error('Dashboard: Failed to initialize contracts:', err);
        refreshLocalStats();
      }
      fetchNetworkInfo();
    };

    init();

    const interval = setInterval(() => {
      fetchNetworkInfo();
      refreshLocalStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [currentBackendWallet]);

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            仪表盘
          </Typography>
          <Typography variant="body2" color="text.secondary">
            KXDEX 联盟链钱包管理平台 - 基于 FISCO BCOS 3.6
          </Typography>
        </Box>

        {/* 网络状态 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">网络状态</Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={loading ? <CircularProgress size={16} /> : <SyncIcon />}
                onClick={fetchNetworkInfo}
                disabled={loading}
              >
                刷新
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    连接状态
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                      label={networkStats.isConnected ? 'ONLINE' : 'OFFLINE'}
                      color={networkStats.isConnected ? 'success' : 'error'}
                      size="small"
                      icon={networkStats.isConnected ? <CheckIcon /> : <ErrorIcon />}
                    />
                    <Typography variant="h6" fontWeight="bold">
                      {networkStats.isConnected ? '已连接' : '未连接'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    当前区块高度
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <BlockIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {networkStats.blockNumber}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    客户端版本
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" sx={{ mt: 1 }}>
                    {networkStats.clientVersion}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 钱包统计 */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WalletIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    后端钱包
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {backendWallets.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  当前账户
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={currentBackendWallet ? 'success.main' : 'error.main'}>
                  {currentBackendWallet ? '1' : '0'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  合约数量
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {contractCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 当前账户信息 */}
        {currentBackendWallet && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  当前账户信息 <Chip label="后端钱包" color="secondary" size="small" sx={{ ml: 1 }} />
                </Typography>
              </Box>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    账户名称
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {currentBackendWallet.name}
                  </Typography>
                </Box>
                {currentBackendWallet.role && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      角色
                    </Typography>
                    <Chip label={currentBackendWallet.role} color="primary" size="small" sx={{ mt: 0.5 }} />
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    账户地址
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {currentBackendWallet.address}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {!currentBackendWallet && (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <WalletIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  未选择账户，请前往钱包管理页面选择或创建钱包
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`${portalBase}/wallets`)}
                >
                  前往钱包管理
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 系统信息 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              系统信息
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  区块链网络
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {fiscoBcosService.getConfig().name}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  RPC 地址
                </Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                  {fiscoBcosService.getConfig().rpcUrl}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  群组 ID
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {fiscoBcosService.getConfig().groupId}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default Dashboard;
