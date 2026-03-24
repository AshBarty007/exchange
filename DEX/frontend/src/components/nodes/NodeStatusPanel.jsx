import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { nodeService } from '../../services/nodeService';

const NodeStatusPanel = ({ nodeType }) => {
  const [status, setStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [s, m] = await Promise.all([nodeService.getNodeStatus(nodeType), nodeService.getNodeMetrics(nodeType)]);
      setStatus(s); setMetrics(m);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [nodeType]);

  if (!status) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Paper sx={{ p: 2.5, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>节点运行状态</Typography>
      <Grid container spacing={2}>
        {[
          ['节点状态', status.online ? '在线' : '离线', status.online ? 'success' : 'error'],
          ['区块高度', status.blockHeight?.toLocaleString()],
          ['连接节点数', status.peers],
          ['共识状态', status.consensusStatus],
          ['待处理交易', status.pendingTx],
          ['运行时间', status.uptime],
        ].map(([label, value, chipColor]) => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={label}>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
              {chipColor ? <Chip size="small" label={value} color={chipColor} sx={{ mt: 0.5 }} /> :
                <Typography variant="h6" sx={{ mt: 0.5, fontSize: '1.1rem' }}>{value}</Typography>}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {metrics && (
        <Grid container spacing={2.5} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>TPS 趋势</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.tps}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={false} name="TPS" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>出块时间 (秒)</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.blockTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#52c41a" strokeWidth={2} dot={false} name="出块时间" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default NodeStatusPanel;
