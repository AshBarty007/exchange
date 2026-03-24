import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { nodeService } from '../../services/nodeService';
import NodeStatusPanel from './NodeStatusPanel';

const RegulatorDashboard = () => {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [logFilter, setLogFilter] = useState('全部');

  useEffect(() => {
    const load = async () => {
      const [d, tx] = await Promise.all([nodeService.getRegulatorData(), nodeService.getRecentTransactions('regulator')]);
      setData(d); setTransactions(tx);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  const filteredLogs = logFilter === '全部' ? data.auditLog : data.auditLog.filter((log) => log.action === logFilter);

  return (
    <Box>
      <NodeStatusPanel nodeType="regulator" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          ['总节点数', data.totalNodes],
          ['总交易数', data.totalTransactions?.toLocaleString()],
          ['告警数', data.alertCount, data.alertCount > 0 ? 'error.main' : undefined],
          ['合规评分', `${data.complianceScore}%`],
        ].map(([label, value, color]) => (
          <Grid size={{ xs: 6, sm: 3 }} key={label}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
              <Typography variant="h5" sx={{ mt: 0.5, color: color || 'text.primary' }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>全网节点概览</Typography>
        <Grid container spacing={2}>
          {data.nodeOverview.map((node, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{node.name}</Typography>
                  <Chip size="small" label={node.online ? '在线' : '离线'} color={node.online ? 'success' : 'error'} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  区块高度: {node.blockHeight?.toLocaleString()} | 交易数: {node.txCount?.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>全网 TPS 趋势</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.networkTps}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={false} name="全网TPS" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>各类型交易量分布</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.txByType}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="count" fill="#764ba2" name="交易数" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {data.alerts?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>告警信息</Typography>
          {data.alerts.map((alert) => (
            <Alert key={alert.id} severity={alert.level === '严重' ? 'error' : alert.level === '警告' ? 'warning' : 'info'} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span><Chip size="small" label={alert.level} sx={{ mr: 1 }} /> {alert.message}</span>
                <Typography variant="caption" color="text.secondary">{alert.time}</Typography>
              </Box>
            </Alert>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary">审计日志</Typography>
          <TextField select size="small" value={logFilter} onChange={(e) => setLogFilter(e.target.value)} sx={{ minWidth: 140 }}>
            {['全部', '交易审计', '节点检查', '合规验证', '告警处理', '权限变更'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </TextField>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>审计ID</TableCell><TableCell>操作</TableCell><TableCell>操作员</TableCell><TableCell>目标</TableCell><TableCell>结果</TableCell><TableCell>时间</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {filteredLogs.map((log, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{log.id}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.operator}</TableCell>
                  <TableCell>{log.target}</TableCell>
                  <TableCell><Chip size="small" label={log.result} color={log.result === '通过' ? 'success' : 'warning'} /></TableCell>
                  <TableCell>{log.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default RegulatorDashboard;
