import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

const TICKET_META = {
  '普通门票': { icon: '🎫', color: '#2081e2', gradient: 'linear-gradient(135deg, #1a3a5c 0%, #2081e2 100%)' },
  'VIP门票': { icon: '👑', color: '#f2994a', gradient: 'linear-gradient(135deg, #5c3a1a 0%, #f2994a 100%)' },
  '年卡': { icon: '📅', color: '#9b51e0', gradient: 'linear-gradient(135deg, #3d1a5c 0%, #9b51e0 100%)' },
  '学生票': { icon: '🎓', color: '#34c77b', gradient: 'linear-gradient(135deg, #1a5c3a 0%, #34c77b 100%)' },
  '夜场票': { icon: '🌙', color: '#2d9cdb', gradient: 'linear-gradient(135deg, #1a3a5c 0%, #2d9cdb 100%)' },
};

const SCENIC_ICONS = {
  '故宫博物院': '🏯', '长城·八达岭': '🧱', '西湖风景区': '🌊',
  '张家界国家森林公园': '🏔️', '九寨沟': '💧', '黄山风景区': '⛰️',
  '丽江古城': '🏘️', '鼓浪屿': '🏝️',
};

export default function NFTCard({ ticket, onClick }) {
  const meta = TICKET_META[ticket.ticketType] || TICKET_META['普通门票'];
  const scenicIcon = SCENIC_ICONS[ticket.scenicSpot] || '🎪';

  return (
    <Card sx={{
      overflow: 'hidden',
      transition: 'all 0.25s ease',
      '&:hover': { transform: 'translateY(-6px)', borderColor: meta.color, boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${meta.color}` },
    }}>
      <CardActionArea onClick={onClick}>
        <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.gradient }}>
          <Typography sx={{ fontSize: 36, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>{meta.icon}</Typography>
        </Box>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">{scenicIcon} {ticket.scenicSpot}</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{ticket.ticketType}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">基准价</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>¥{ticket.basePrice ?? '—'}</Typography>
            </Box>
            {ticket.listedCount > 0 && <Chip size="small" label={`${ticket.listedCount} 在售`} color="success" />}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" variant="outlined" label={`NFT #${ticket.tokenId || '—'}`} sx={{ fontSize: '0.7rem' }} />
            <Chip size="small" variant="outlined" label="链上托管" color="info" sx={{ fontSize: '0.7rem' }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export { TICKET_META, SCENIC_ICONS };
