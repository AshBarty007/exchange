import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  Stack,
  Chip,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckIcon,
  Storage as StorageIcon,
  AccountTree as SitemapIcon,
  Code as CodeIcon,
  Layers as LayersIcon,
  Key as KeyIcon,
  Security as ShieldIcon,
  Dns as DatabaseIcon,
  AdminPanelSettings as UserSecretIcon,
  Chat as ChatIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { portals } from '@/config/portalConfig';
import { useThemeMode } from '@/theme/ThemeProvider';

const Brand = {
  blue: '#2563EB',    // 联盟链底层-科技蓝
  emerald: '#10B981', // 合约服务层-生态绿
  teal: '#0D9488',    // 多角色业务层-文旅青
  purple: '#7C3AED',  // 交易所撮合层-金融紫
  red: '#DC2626',     // 密钥安全层-权威红
  amber: '#F59E0B',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
};

const techHighlights = [
  { icon: <StorageIcon />, text: '底层采用FISCO BCOS联盟链分布式账本，保障交易不可篡改与多方确认' },
  { icon: <SitemapIcon />, text: '多群组数据隔离架构，景区/银行/监管逻辑隔离，兼顾数据共享与隐私保护' },
  { icon: <CodeIcon />, text: '模块化智能合约架构，事件驱动设计，支持业务逻辑灵活扩展' },
  { icon: <UserSecretIcon />, text: '集成密钥托管服务，HSM硬件加密，支持国密SM2/SM3/SM4算法' },
  { icon: <ShieldIcon />, text: '穿透式监管接口，全链路审计日志，满足金融级合规与反洗钱要求' },
];

const architectureLayers = [
  {
    layer: '联盟链底层',
    icon: <DatabaseIcon />,
    color: Brand.blue,
    desc: '基于FISCO BCOS 3.6构建联盟链网络，部署10+共识节点（银行2个、平台3个、大型景区2个、做市商2个、监管2个），区块间隔0.5s，Gas费用0。支持多群组隔离、国密TLS通信、区块数据实时同步与备份，为上层提供稳定可信的分布式账本基础。',
    features: ['FISCO BCOS 3.6', 'PBFT共识', '多群组隔离', '国密通信']
  },
  {
    layer: '密钥安全层',
    icon: <KeyIcon />,
    color: Brand.red,
    desc: '支持HSM硬件安全模块保护节点私钥，用户私钥提供平台托管/自管双模式，子账户私钥由主账户签名授权生成，运营方无控制权，杜绝私钥泄露风险。',
    features: ['HSM硬件加密', '国密算法', '私钥隔离']
  },
  {
    layer: '合约服务层',
    icon: <CodeIcon />,
    color: Brand.emerald,
    desc: '采用链上数据与业务逻辑分离架构，核心数据合约固化存储（不可升级），业务逻辑合约通过代理模式动态升级，实现业务规则热更新而链上数据不变，保障系统稳定迭代与数据安全。',
    features: ['代理合约模式', '数据逻辑分离', '热更新能力', '版本可控']
  },
  {
    layer: '多角色业务层',
    icon: <LayersIcon />,
    color: Brand.teal,
    desc: '基于Spring Boot构建多角色权限体系，前端采用Vite React + Material UI，为景区/做市商/银行/监管提供专属操作界面，所有操作最终落地为链上合约调用，数据按角色权限过滤展示。',
    features: ['Spring Boot 2.7', 'React 18', 'Material UI', 'RBAC权限']
  },
  {
    layer: '交易所撮合层',
    icon: <TrendingUpIcon />,
    color: Brand.purple,
    desc: 'Java + Kafka + Disruptor构建高性能撮合引擎，Redis Cluster缓存订单簿状态，链下撮合+链上存证模式，支持批量清算、原子性资产互换，保障交易处理效率与数据一致性。',
    features: ['Kafka消息队列', 'Redis Cluster', '链下撮合', '批量清算']
  },
  {
    layer: '智能体服务层',
    icon: <AutoAwesomeIcon />,
    color: Brand.amber,
    desc: '自研智能体集成分析、汇报、预警、操作、总结全能力，7×24小时自主运行；核心操作指令与执行结果上链存证，实现全链路监督，在保障安全合规的前提下提升运营自动化水平。',
    features: ['全流程自动化', '核心操作上链', '7×24自主运行', '全链路监督']
  }
];

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  const sectionAltBg = isDark
    ? alpha(theme.palette.common.white, 0.03)
    : alpha(theme.palette.common.black, 0.02);

  const footerBg = isDark ? '#020617' : '#111827';

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ── Glass Navbar ──────────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.85),
          color: 'text.primary',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                background: Brand.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mr: 1, flexShrink: 0, cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              <Typography fontWeight="bold" color="#fff" fontSize={16}>科信</Typography>
            </Box>
            <Typography
              variant="h6" fontWeight="bold"
              sx={{ color: Brand.blue, flexGrow: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              KXDEX
            </Typography>

            <Button
              size="small"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ mr: 1, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
            >
              返回首页
            </Button>
            <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ── Hero Title Banner ─────────────────────────────────── */}
      <Box
        sx={{
          background: Brand.gradient,
          py: { xs: 6, md: 8 },
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3" fontWeight="bold"
            sx={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', mb: 2 }}
          >
            技术架构与系统设计
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
            六层分层架构，联盟链底层保障安全与可信，智能合约驱动业务自动化
          </Typography>
        </Container>
      </Box>

      {/* ── Section 1: Tech Architecture Highlights ──────────── */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 2, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            技术架构亮点
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6, maxWidth: 500, mx: 'auto' }}>
            基于 FISCO BCOS 3.6 联盟链，国密算法全面覆盖，金融级安全保障
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {techHighlights.map((item, i) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                <Card sx={{ borderRadius: 3, p: 3, height: '100%', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: '50%',
                      bgcolor: alpha(Brand.blue, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      color: Brand.blue, '& svg': { fontSize: 22 },
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, pt: 0.8 }}>
                    {item.text}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Section 2: 4-Layer Architecture ──────────────────── */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: sectionAltBg }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 2, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            六层分层架构
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
            从联盟链底层到智能化服务，完整呈现系统从底层链到应用层的全栈设计
          </Typography>
          <Grid container spacing={4}>
            {architectureLayers.map((layer, i) => (
              <Grid size={{ xs: 12, md: 6 }} key={i}>
                <Card
                  sx={{
                    borderRadius: 3, p: 0, height: '100%', overflow: 'hidden',
                    transition: 'all .3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 24px ${alpha(layer.color, 0.12)}`,
                    },
                  }}
                >
                  {/* Colored header */}
                  <Box sx={{
                    bgcolor: alpha(layer.color, 0.08), p: 2.5,
                    display: 'flex', alignItems: 'center', gap: 2,
                    borderBottom: `2px solid ${alpha(layer.color, 0.2)}`,
                  }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '50%',
                      bgcolor: alpha(layer.color, 0.15), display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: layer.color,
                      '& svg': { fontSize: 22 },
                    }}>
                      {layer.icon}
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: layer.color, fontWeight: 700, letterSpacing: 1 }}>
                        LAYER {String(i + 1).padStart(2, '0')}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ lineHeight: 1.2 }}>
                        {layer.layer}
                      </Typography>
                    </Box>
                  </Box>
                  {/* Body */}
                  <Box sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
                      {layer.desc}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {layer.features.map((f) => (
                        <Chip
                          key={f}
                          label={f}
                          size="small"
                          sx={{
                            bgcolor: alpha(layer.color, 0.08),
                            color: layer.color,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      {/* ── CTA Section ────────────────────────────────────────── */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          background: Brand.gradient,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h4" fontWeight="bold"
            sx={{ mb: 3, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            立即体验科信DEX测试门户
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.92, mb: 4, maxWidth: 600, mx: 'auto' }}>
            抢先体验联盟链+智能节点带来的行业变革，感受可信、高效、合规的数字门票交易新体验
          </Typography>
          <Button
            variant="contained" size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/entry')}
            sx={{
              bgcolor: '#fff', color: Brand.blue, fontWeight: 600,
              px: 5, py: 1.5, borderRadius: 2,
              '&:hover': { bgcolor: alpha('#fff', 0.9) },
            }}
          >
            进入测试门户统一入口
          </Button>
        </Container>
      </Box>
      {/* ── Footer ─────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: footerBg, color: '#9CA3AF', py: 6 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex', flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between', alignItems: 'center',
              mb: 4, gap: 3,
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: 2,
                  background: Brand.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Typography fontWeight="bold" color="#fff" fontSize={16}>科信</Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold" color="#fff">科信DEX</Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <IconButton sx={{ color: '#9CA3AF', '&:hover': { color: '#fff' } }}><ChatIcon /></IconButton>
              <IconButton sx={{ color: '#9CA3AF', '&:hover': { color: '#fff' } }}><EmailIcon /></IconButton>
              <IconButton sx={{ color: '#9CA3AF', '&:hover': { color: '#fff' } }}><PhoneIcon /></IconButton>
            </Stack>
          </Box>
          <Divider sx={{ borderColor: alpha('#fff', 0.1), mb: 4 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">&copy; 2026 科信DEX | 基于联盟链的景区门票数字资产交易平台</Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
              本平台为测试环境，所有数据仅用于功能验证，请勿用于正式生产
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutPage;
