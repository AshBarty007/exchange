import React, { useState, useEffect, useRef } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';
import { blockchainService } from '../services/blockchainService';

const BlockchainStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [contractInfo, setContractInfo] = useState(null);
  const [blocks, setBlocks] = useState({ current: null, previous: null });
  const [blockUpdated, setBlockUpdated] = useState(false);
  const [expandedTx, setExpandedTx] = useState({});
  const [copyTooltip, setCopyTooltip] = useState({});
  const [contractAddresses, setContractAddresses] = useState({});
  const prevBlockNum = useRef(null);

  useEffect(() => {
    loadAll();
    blockchainService.getContractAddresses().then(setContractAddresses);
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statusData, blocksData] = await Promise.all([
        blockchainService.getBlockchainStatus(),
        blockchainService.getRecentBlocks()
      ]);
      console.log(statusData)
      setStatus(statusData);
      if (blocksData.connected) {
        if (prevBlockNum.current !== null && blocksData.currentNumber !== prevBlockNum.current) {
          setBlockUpdated(true);
          setTimeout(() => setBlockUpdated(false), 1500);
        }
        prevBlockNum.current = blocksData.currentNumber;
        setBlocks({ current: blocksData.current, previous: blocksData.previous });
      }
    } catch {}
    setLoading(false);
  };

  const handleQueryContract = async (e) => {
    e.preventDefault();
    try { setContractInfo(await blockchainService.getContractInfo(contractAddress)); } catch {}
  };

  const formatHash = (hash) => hash ? hash.substring(0, 10) + '...' + hash.substring(hash.length - 8) : '-';
  const formatTimestamp = (ts) => ts ? new Date(ts).toLocaleString('zh-CN') : '-';

  const toggleTx = (blockNum, txIdx) => {
    const key = `${blockNum}-${txIdx}`;
    setExpandedTx(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyTooltip(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopyTooltip(prev => ({ ...prev, [key]: false })), 1500);
    });
  };

  const CopyableField = ({ label, value, mono }) => {
    const key = `${label}-${value}`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, flexShrink: 0 }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Typography variant="caption" sx={{
            fontFamily: mono ? 'monospace' : 'inherit', fontSize: '0.7rem',
            wordBreak: 'break-all', textAlign: 'right',
          }}>{value || '-'}</Typography>
          {value && value.length > 10 && (
            <Tooltip title={copyTooltip[key] ? '已复制' : '复制'} arrow>
              <IconButton size="small" onClick={() => copyToClipboard(value, key)} sx={{ p: 0.2 }}>
                <ContentCopyIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    );
  };

  const BlockCard = ({ block, label, highlight }) => {
    if (!block) return null;
    return (
      <Paper sx={{
        flex: 1, minWidth: 320, p: 2.5,
        border: highlight ? '2px solid' : '1px solid',
        borderColor: highlight ? 'primary.main' : 'divider',
        bgcolor: highlight ? 'rgba(32,129,226,0.04)' : 'background.paper',
        transition: 'all 0.5s ease',
        boxShadow: highlight ? '0 0 12px rgba(32,129,226,0.15)' : 'none',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip size="small" label={label} color={highlight ? 'primary' : 'default'} />
          <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>#{block.number}</Typography>
          {highlight && blockUpdated && <Chip size="small" label="NEW" color="info" variant="outlined" />}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {[
            ['区块哈希', formatHash(block.hash), true],
            ['父区块哈希', formatHash(block.parentHash), true],
            ['时间戳', formatTimestamp(block.timestamp)],
            ['交易数量', block.txCount],
            ['Sealer', block.sealer],
            ['签名数', block.signatureCount],
            ['State Root', formatHash(block.stateRoot), true],
            ['Tx Root', formatHash(block.transactionsRoot), true],
            ['Receipts Root', formatHash(block.receiptsRoot), true],
          ].map(([lbl, val, mono]) => (
            <Box key={lbl} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">{lbl}</Typography>
              <Typography variant="body2" sx={{ fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? '0.75rem' : '0.82rem', fontWeight: 500, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{val ?? '-'}</Typography>
            </Box>
          ))}
        </Box>
        {block.transactions?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              交易列表 ({block.transactions.length})
            </Typography>
            {block.transactions.map((tx, i) => {
              const txKey = `${block.number}-${i}`;
              const isExpanded = !!expandedTx[txKey];
              return (
                <Paper key={i} sx={{
                  mb: 1, bgcolor: 'background.default', overflow: 'hidden',
                  border: isExpanded ? '1px solid' : '1px solid transparent',
                  borderColor: isExpanded ? 'primary.light' : 'transparent',
                  transition: 'border-color 0.2s',
                }}>
                  <Box
                    onClick={() => toggleTx(block.number, i)}
                    sx={{
                      p: 1.2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <IconButton size="small" sx={{
                      p: 0.3, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}>
                      <ExpandMoreIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {formatHash(tx.hash)}
                        </Typography>
                        {tx.contractName && (
                          <Chip size="small" label={tx.contractName} color="info" variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatHash(tx.from)} → {formatHash(tx.to)}
                      </Typography>
                    </Box>
                  </Box>
                  <Collapse in={isExpanded}>
                    <Box sx={{ px: 2, pb: 1.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <CopyableField label="交易哈希" value={tx.hash} mono />
                      <CopyableField label="发送方" value={tx.from} mono />
                      <CopyableField label="接收方" value={tx.to} mono />
                      {tx.contractName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>合约名称</Typography>
                          <Chip size="small" label={tx.contractName} color="info" sx={{ height: 20, fontSize: '0.7rem' }} />
                        </Box>
                      )}
                      {tx.chainId && <CopyableField label="Chain ID" value={String(tx.chainId)} />}
                      {tx.groupId && <CopyableField label="Group ID" value={String(tx.groupId)} />}
                      {tx.nonce && <CopyableField label="Nonce" value={String(tx.nonce)} />}
                      {tx.importTime && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>导入时间</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {formatTimestamp(tx.importTime)}
                          </Typography>
                        </Box>
                      )}
                      {tx.input && (
                        <Box sx={{ mt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Input Data</Typography>
                            <Tooltip title={copyTooltip[`input-${txKey}`] ? '已复制' : '复制'} arrow>
                              <IconButton size="small" onClick={() => copyToClipboard(tx.input, `input-${txKey}`)} sx={{ p: 0.2 }}>
                                <ContentCopyIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Box sx={{
                            mt: 0.5, p: 1, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 1,
                            fontFamily: 'monospace', fontSize: '0.65rem', lineHeight: 1.5,
                            wordBreak: 'break-all', maxHeight: 120, overflow: 'auto',
                            color: 'text.secondary',
                          }}>
                            {tx.input}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Card><CardContent sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>区块链状态</Typography>

      {loading && !status ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : status ? (
        <>
          <Alert severity={status.connected ? 'success' : 'error'} sx={{ mb: 3 }}>
            {status.connected
              ? <>已连接到 FISCO BCOS 网络 {status.chainVersion && <Typography component="span" variant="caption" sx={{ ml: 2 }}>{status.chainVersion}</Typography>}</>
              : <>未连接到区块链网络 — 请确保 FISCO BCOS 节点已启动</>
            }
          </Alert>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              ['当前区块高度', status.blockNumber?.toLocaleString() || '0'],
              ['节点总数 / 在线', `${status.nodeCount || 0} / ${status.onlineCount || 0}`],
              ['共识算法', status.consensusStatus || 'N/A'],
              ['交易总数', status.txCount?.toLocaleString() || '0'],
              ['Group ID', status.groupId || 1],
              ['连接状态', status.connected ? '已连接' : '未连接'],
            ].map(([label, value]) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={label}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5 }}>{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {(blocks.current || blocks.previous) && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                区块详情 <Typography component="span" variant="caption" color="text.secondary">每5秒自动检测新区块</Typography>
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <BlockCard block={blocks.current} label="当前区块" highlight />
                <BlockCard block={blocks.previous} label="前一区块" highlight={false} />
              </Box>
            </Box>
          )}

          {status.nodes?.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>节点状态 ({status.onlineCount}/{status.nodeCount} 在线)</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>节点</TableCell><TableCell>状态</TableCell><TableCell>区块高度</TableCell>
                    <TableCell>P2P 地址</TableCell><TableCell>RPC 地址</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {status.nodes.map((node, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{node.name}</TableCell>
                        <TableCell><Chip size="small" label={node.online ? '在线' : '离线'} color={node.online ? 'success' : 'error'} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{node.online ? node.blockHeight?.toLocaleString() : '-'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{node.rpc != '' ? node.p2p : node.p2p.substring(0, 20)}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{node.rpc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {Object.keys(contractAddresses).length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>系统合约地址配置</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>合约名称</TableCell>
                      <TableCell>合约地址</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(contractAddresses).map(([name, addr]) => (
                      <TableRow key={name}>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{name}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                              {addr}
                            </Typography>
                            <Tooltip title={copyTooltip[`contract-${name}`] ? '已复制' : '复制'} arrow>
                              <IconButton size="small" onClick={() => copyToClipboard(addr, `contract-${name}`)} sx={{ p: 0.3, flexShrink: 0 }}>
                                <ContentCopyIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>查询合约信息</Typography>
            <Box component="form" onSubmit={handleQueryContract} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', maxWidth: 600 }}>
              <TextField label="合约地址" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="0x..." required sx={{ flex: 1 }} />
              <Button type="submit" variant="contained" sx={{ mt: 0.5 }}>查询</Button>
            </Box>
            {contractInfo && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {[
                  ['合约地址', contractInfo.address],
                  ['合约名称', contractInfo.name || 'Unknown'],
                  ['连接状态', contractInfo.connected ? '已连接' : '未连接'],
                ].map(([label, value]) => (
                  <Grid size={{ xs: 12, sm: 4 }} key={label}>
                    <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5, fontFamily: label === '合约地址' ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>数据每5秒自动刷新</Typography>
        </>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>无法获取区块链状态</Typography>
      )}
    </CardContent></Card>
  );
};

export default BlockchainStatus;
