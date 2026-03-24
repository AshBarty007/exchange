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
  Paper,
  Alert,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  PlayArrow as CallIcon,
  CloudUpload as TxIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';
import contractService from '@/services/contractService';
import type { ContractInfo } from '@/types';

const Contracts: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();
  const [contractName, setContractName] = useState('');
  const [method, setMethod] = useState('');
  const [params, setParams] = useState('[]');
  const [returnTypes, setReturnTypes] = useState('');
  const [mode, setMode] = useState<'call' | 'send'>('call');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);

  const selectedContract = useMemo(
    () => contracts.find((item) => item.name === contractName),
    [contracts, contractName]
  );

  const reloadContracts = async () => {
    const loaded = await contractService.initializeContracts();
    setContracts(loaded);
    if (!contractName && loaded.length > 0) {
      setContractName(loaded[0].name);
    }
  };

  useEffect(() => {
    reloadContracts().catch((err) => {
      setError(`加载合约列表失败: ${err?.message || '未知错误'}`);
    });
  }, []);

  const parseParams = (): any[] => {
    if (!params.trim()) return [];
    const parsed = JSON.parse(params);
    if (!Array.isArray(parsed)) {
      throw new Error('参数必须是 JSON 数组');
    }
    return parsed;
  };

  const parseReturnTypes = (): string[] => {
    if (!returnTypes.trim()) return [];
    return returnTypes
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleCall = async () => {
    if (!contractName || !method.trim()) {
      setError('请选择合约并输入方法');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const parsedParams = parseParams();
      const parsedTypes = parseReturnTypes();
      const output = await contractService.call(contractName, method.trim(), parsedParams, parsedTypes);

      setResult({
        mode: 'call',
        contract: contractName,
        method: method.trim(),
        params: parsedParams,
        returnTypes: parsedTypes,
        output,
      });
    } catch (err: any) {
      setError(err?.message || '调用失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const signerAddress = currentBackendWallet?.address;
    if (!signerAddress) {
      setError('请先选择后端钱包后再发送交易');
      return;
    }
    if (!contractName || !method.trim()) {
      setError('请选择合约并输入方法');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const parsedParams = parseParams();
      const txHash = await contractService.sendWithSigner(contractName, method.trim(), parsedParams, signerAddress);

      setResult({
        mode: 'send',
        contract: contractName,
        method: method.trim(),
        params: parsedParams,
        txHash,
      });
    } catch (err: any) {
      setError(err?.message || '交易发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        合约交互
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            支持查询调用（不上链）和交易调用（上链）
          </Typography>

          <Stack spacing={3} sx={{ mt: 3 }}>
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {!contracts.length && (
              <Alert severity="warning">
                未检测到合约地址，请先前往系统设置加载 `deployed-contracts.json`
              </Alert>
            )}

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                icon={<CallIcon />}
                label="只读调用"
                color={mode === 'call' ? 'primary' : 'default'}
                onClick={() => setMode('call')}
              />
              <Chip
                icon={<TxIcon />}
                label="交易调用"
                color={mode === 'send' ? 'primary' : 'default'}
                onClick={() => setMode('send')}
              />
              <Button
                size="small"
                variant="text"
                startIcon={<RefreshIcon />}
                onClick={() => reloadContracts()}
              >
                刷新合约
              </Button>
            </Stack>

            <FormControl fullWidth>
              <InputLabel>选择合约</InputLabel>
              <Select
                value={contractName}
                label="选择合约"
                onChange={(e) => setContractName(e.target.value)}
              >
                {contracts.map((item) => (
                  <MenuItem key={item.name} value={item.name}>
                    {item.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedContract && (
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">
                  合约地址
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedContract.address}
                </Typography>
              </Paper>
            )}

            <TextField
              fullWidth
              label="方法名或完整签名"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="例如: balanceOf(address) 或 balanceOf"
            />

            <TextField
              fullWidth
              label="参数 (JSON 数组)"
              value={params}
              onChange={(e) => setParams(e.target.value)}
              multiline
              rows={4}
              placeholder='["0x1234..."]'
              sx={{ fontFamily: 'monospace' }}
            />

            {mode === 'call' && (
              <TextField
                fullWidth
                label="返回类型 (可选, 逗号分隔)"
                value={returnTypes}
                onChange={(e) => setReturnTypes(e.target.value)}
                placeholder="uint256,bool"
              />
            )}

            <Box>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={mode === 'call' ? handleCall : handleSend}
                disabled={loading || !contracts.length}
              >
                {loading ? '处理中...' : mode === 'call' ? '执行调用' : '发送交易'}
              </Button>
              <Button
                variant="outlined"
                sx={{ ml: 2 }}
                onClick={() => {
                  setMethod('');
                  setParams('[]');
                  setReturnTypes('');
                  setResult(null);
                  setError('');
                }}
              >
                重置
              </Button>
            </Box>

            {result && (
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  调用结果
                </Typography>
                <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </Paper>
            )}
          </Stack>
        </CardContent>
      </Card>

      {mode === 'send' && !currentBackendWallet && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          交易调��需要先选择后端钱包
        </Alert>
      )}
    </Box>
  );
};

export default Contracts;
