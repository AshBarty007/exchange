import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Block as BlockIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import fiscoBcosService from '@/services/fiscoBcosService';

interface BlockInfo {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: string;
  transactionsCount: number;
  sealer: string;
  gasUsed: string;
  txsRoot: string;
}

const Blockchain: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchValue, setSearchValue] = useState<string>('');
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number>(0);

  const normalizeTimestamp = (value: any): number => {
    const raw = typeof value === 'number' ? value : parseInt(value || '0', 16);
    if (!raw || Number.isNaN(raw)) return 0;
    return raw < 1_000_000_000_000 ? raw * 1000 : raw;
  };

  const fetchBlocks = async () => {
    setLoading(true);
    setError('');
    try {
      const blockNumber = await fiscoBcosService.getBlockNumber();
      setCurrentBlockNumber(blockNumber);
      const blockList: BlockInfo[] = [];

      // 获取最近 20 个区块
      const startBlock = Math.max(0, blockNumber - 19);
      for (let i = blockNumber; i >= startBlock; i--) {
        const block = await fiscoBcosService.getBlockByNumber(i, false);
        if (block) {
          // FISCO BCOS 3.x 区块结构
          const timestamp = normalizeTimestamp(block.timestamp);

          blockList.push({
            number: i,  // 使用循环变量 i 而不是 block.number
            hash: block.hash || 'N/A',
            parentHash: block.parentInfo?.[0]?.blockHash || block.parentHash || 'N/A',
            timestamp: timestamp > 0 ? new Date(timestamp).toLocaleString('zh-CN') : 'Genesis Block',
            transactionsCount: block.transactions?.length || 0,
            sealer: typeof block.sealer === 'number' ? `节点 ${block.sealer}` : (block.sealer || 'N/A'),
            gasUsed: block.gasUsed || '0',
            txsRoot: block.txsRoot || block.transactionsRoot || 'N/A',
          });
        }
      }

      setBlocks(blockList);
    } catch (error: any) {
      console.error('Failed to fetch blocks:', error);
      setError('获取区块数据失败: ' + (error.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleBlockClick = async (blockNumber: number) => {
    try {
      const blockDetail = await fiscoBcosService.getBlockByNumber(blockNumber, true);
      setSelectedBlock(blockDetail);
      setDialogOpen(true);
    } catch (error: any) {
      console.error('Failed to fetch block detail:', error);
      setError('获取区块详情失败: ' + (error.message || '网络错误'));
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBlock(null);
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    try {
      const blockNum = parseInt(searchValue);
      if (isNaN(blockNum) || blockNum < 0) {
        setError('请输入有效的区块高度');
        return;
      }

      if (blockNum > currentBlockNumber) {
        setError(`区块高度不能超过当前最新区块 ${currentBlockNumber}`);
        return;
      }

      await handleBlockClick(blockNum);
    } catch (error: any) {
      setError('搜索失败: ' + (error.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
    // 每30秒自动刷新一次
    const interval = setInterval(() => {
      fetchBlocks();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Stack spacing={3}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              区块链浏览器
            </Typography>
            <Typography variant="body2" color="text.secondary">
              查看区块链上的区块信息 {currentBlockNumber > 0 && `(当前高度: ${currentBlockNumber})`}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchBlocks}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>

        {/* 错误提示 */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            action={
              <IconButton size="small" onClick={() => setError('')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {/* 搜索区块 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              搜索区块
            </Typography>
            <TextField
              fullWidth
              placeholder="输入区块高度进行搜索"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchValue && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchValue('')}>
                      <CloseIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleSearch} disabled={!searchValue.trim() || loading}>
                搜索
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 区块列表 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BlockIcon color="primary" />
              <Typography variant="h6">最近区块</Typography>
              <Chip label={`共 ${blocks.length} 个区块`} size="small" color="primary" variant="outlined" />
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'background.default' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>区块高度</TableCell>
                    <TableCell>区块哈希</TableCell>
                    <TableCell>时间戳</TableCell>
                    <TableCell align="center">交易数</TableCell>
                    <TableCell>出块节点</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : blocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <Typography color="text.secondary">暂无区块数据</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    blocks.map((block) => (
                      <TableRow key={block.number} hover>
                        <TableCell>
                          <Chip label={`#${block.number}`} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              color: 'primary.main',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            onClick={() => handleBlockClick(block.number)}
                          >
                            {block.hash.slice(0, 16)}...{block.hash.slice(-8)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{block.timestamp}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={block.transactionsCount}
                            size="small"
                            color={block.transactionsCount > 0 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {block.sealer}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            startIcon={<InfoIcon />}
                            onClick={() => handleBlockClick(block.number)}
                          >
                            详情
                          </Button>
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

      {/* 区块详情对话框 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BlockIcon color="primary" />
            <Typography variant="h6">区块详情</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedBlock ? (
            <Stack spacing={3}>
              {/* 基本信息 */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  基本信息
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      区块高度
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {typeof selectedBlock.number === 'number' ? selectedBlock.number : parseInt(selectedBlock.number, 16)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      时间戳
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(() => {
                        const timestamp = normalizeTimestamp(selectedBlock.timestamp);
                        return timestamp > 0 ? new Date(timestamp).toLocaleString('zh-CN') : 'Genesis Block';
                      })()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      区块哈希
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBlock.hash}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      父区块哈希
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBlock.parentInfo?.[0]?.blockHash || selectedBlock.parentHash || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      出块节点
                    </Typography>
                    <Typography variant="body2">
                      {typeof selectedBlock.sealer === 'number' ? `节点 ${selectedBlock.sealer}` : (selectedBlock.sealer || 'N/A')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      交易数量
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedBlock.transactions?.length || 0}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Gas 使用量
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedBlock.gasUsed || '0'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      版本
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedBlock.version || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      交易根哈希
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBlock.txsRoot || selectedBlock.transactionsRoot || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      状态根哈希
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBlock.stateRoot || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      回执根哈希
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBlock.receiptsRoot || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* 交易列表 */}
              {selectedBlock.transactions && selectedBlock.transactions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    交易列表
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    {selectedBlock.transactions.map((tx: any, index: number) => (
                      <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="body2" color="text.secondary">
                              交易 #{index + 1}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              交易哈希
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {typeof tx === 'string' ? tx : (tx.hash || tx.transactionHash || 'N/A')}
                            </Typography>
                          </Grid>
                          {typeof tx === 'object' && tx.from && (
                            <>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  发送方
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                  {tx.from}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  接收方
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                                  {tx.to || '合约创建'}
                                </Typography>
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 共识节点列表 */}
              {selectedBlock.sealerList && selectedBlock.sealerList.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    共识节点列表
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    {selectedBlock.sealerList.map((sealer: string, index: number) => (
                      <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          节点 #{index}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                          {sealer}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 签名列表 */}
              {selectedBlock.signatureList && selectedBlock.signatureList.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    区块签名
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    {selectedBlock.signatureList.map((sig: any, index: number) => (
                      <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="body2" color="text.secondary">
                              签名 #{index + 1} - 节点索引: {sig.sealerIndex}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                              {sig.signature}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 额外数据 */}
              {selectedBlock.extraData && selectedBlock.extraData !== '0x' && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    额外数据
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedBlock.extraData}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Blockchain;
