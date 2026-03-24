import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import fiscoBcosService from '@/services/fiscoBcosService';
import contractService from '@/services/contractService';
import type { ContractAddressMap } from '@/types';

const Settings: React.FC = () => {
  const [networkName, setNetworkName] = useState(fiscoBcosService.getConfig().name);
  const [rpcUrl, setRpcUrl] = useState(fiscoBcosService.getConfig().rpcUrl);
  const [chainId, setChainId] = useState(fiscoBcosService.getConfig().chainId);
  const [groupId, setGroupId] = useState(fiscoBcosService.getConfig().groupId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractAddressMap>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(false);

  useEffect(() => {
    contractService.initializeContracts().then(() => {
      setContracts(contractService.getContractAddressMap());
    }).catch((error) => {
      console.warn('Failed to initialize contracts:', error);
    });
  }, []);

  const handleSaveNetwork = () => {
    fiscoBcosService.updateConfig({
      name: networkName,
      rpcUrl,
      chainId,
      groupId,
    });
    setMessage({ type: 'success', text: '网络配置已保存' });
  };

  const handleReloadContracts = async () => {
    setLoadingContracts(true);
    setMessage(null);
    try {
      await contractService.reloadFromServer();
      setContracts(contractService.getContractAddressMap());
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `加载失败: ${error?.message || '请检查后端服务是否运行'}`,
      });
    } finally {
      setLoadingContracts(false);
    }
  };

  const contractEntries = Object.entries(contracts);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        系统设置
      </Typography>

      <Stack spacing={3} sx={{ mt: 3 }}>
        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              网络设置
            </Typography>

            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="网络名称"
                value={networkName}
                onChange={(e) => setNetworkName(e.target.value)}
              />

              <TextField
                fullWidth
                label="后端 API 地址"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                helperText="默认使用 /api 代理到 Java 后端"
                placeholder="/api 或 http://127.0.0.1:8080"
              />

              <TextField
                fullWidth
                label="链 ID"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
              />

              <TextField
                fullWidth
                label="群组 ID"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />

              <Box>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveNetwork}
                >
                  保存网络配置
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                合约地址配置
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReloadContracts}
                disabled={loadingContracts}
              >
                {loadingContracts ? '加载中...' : '从服务器重新加载'}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              合约地址由后端 deployed-contracts.json 统一管理，点击"从服务器重新加载"同步最新配置。
            </Typography>

            {contractEntries.length === 0 ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                未加载到合约地址，请确认后端 deployed-contracts.json 已正确配置。
              </Alert>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {contractEntries.map(([name, address]) => (
                  <Grid key={name} size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={name}
                      value={address}
                      slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.85rem' } } }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              关于
            </Typography>

            <Stack spacing={1}>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  KXDEX Wallet DApp
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  版本: 1.0.0
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary">
                基于 FISCO BCOS 3.11 的联盟链钱包管理平台
              </Typography>

              <Typography variant="body2" color="text.secondary">
                技术栈: React + TypeScript + Material UI + Zustand
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      
    </Box>
  );
};

export default Settings;
