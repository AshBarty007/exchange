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
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Park as VenueIcon,
  ShowChart as MarketMakerIcon,
  AccountBalance as BankIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  VerifiedUser as CertIcon,
  SwapHoriz as SwapIcon,
  Visibility as EyeIcon,
  Bolt as BoltIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon,
  Science as ScienceIcon,
  Memory as MemoryIcon,
  Schedule as ScheduleIcon,
  Hub as HubIcon,
  Lock as LockIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
import { useThemeMode } from '@/theme/ThemeProvider';

/* ── Brand accent colors (mode-independent) ────────────────── */
const Brand = {
  blue: '#2563EB',
  teal: '#0D9488',
  red: '#DC2626',
  purple: '#7C3AED',
  amber: '#F59E0B',
  emerald: '#10B981',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
};

const navLinks = [
  { label: '首页', href: '#hero' },
  { label: '平台背景', href: '#background' },
  { label: '业务目标', href: '#goals' },
  { label: '角色服务', href: '#roles' },
  { label: '智能节点', href: '#smart-node' },
  { label: '应用价值', href: '#value' },
  { label: '联系我们', href: '#footer' },
];

const techItems = [
  { icon: <LinkIcon />, label: '联盟链多方共治' },
  { icon: <CodeIcon />, label: '智能合约自动执行' },
  { icon: <CertIcon />, label: '数字门票唯一确权' },
  { icon: <SwapIcon />, label: '去中心化交易撮合' },
  { icon: <EyeIcon />, label: '监管节点直连穿透' },
  { icon: <BoltIcon />, label: '高并发低延迟支撑' },
];

const advantages = [
  {
    num: '01',
    title: '合规先行',
    desc: '联盟链许可制准入，节点身份可控，天然符合文旅部、央行等监管要求，业务开展无合规隐患'
  },
  {
    num: '02',
    title: '多方可信',
    desc: '打破数据孤岛，景区、做市商、监管机构共享同一不可篡改账本，协作无需互信背书'
  },
  {
    num: '03',
    title: 'DEX 核心体验',
    desc: '保留去中心化交易的透明、防操纵、链上可验证优势，同时规避公链的性能与合规风险'
  },
  {
    num: '04',
    title: '全链路数字化',
    desc: '从门票发行、交易、结算到核销、监管，形成端到端闭环数字生态，彻底告别纸质流程与人工对账'
  },
];

const roleCards = [
  {
    color: Brand.blue,
    icon: <VenueIcon sx={{ fontSize: 28 }} />,
    title: '景区 · 数字门票资产化运营中台',
    features: [
      '一键完成门票链上标准化发行与唯一确权，从源头杜绝假票',
      '实时库存管控与智能核销，超售、伪造、篡改风险降为零',
      '链上智能合约自动分账与结算，T+0 到账，财务成本降低 80%',
      '多渠道分销统一管理，OTA、旅行社、自有渠道数据全景可视',
    ],
    slogan: '让景区门票从"商品"升级为"链上数字资产"',
  },
  {
    color: Brand.teal,
    icon: <MarketMakerIcon sx={{ fontSize: 28 }} />,
    title: '做市商 · 合规门票交易与风险管理工作台',
    features: [
      '直连联盟链可信票源，每一张票都可追溯发行源头，假票零接入',
      '链上订单撮合与智能合约清算，资金周转效率提升 300%',
      '透明化交易台账与链上存证，内部风控与外部审计一键完成',
      '支持批量报价、动态仓位监控、智能风险对冲，做市更轻松',
    ],
    slogan: '安全合规的门票流通通道，让每一笔交易都高效可控',
  },
  {
    color: Brand.red,
    icon: <BankIcon sx={{ fontSize: 28 }} />,
    title: '监管端 · 穿透式资金与交易合规监管平台',
    features: [
      '联盟链节点级监管权限，发行、交易、结算、核销全流程可追溯',
      '资金流向实时可视，异常交易、可疑主体智能预警，监管前置',
      '链上数据不可篡改、不可删除，完全满足审计存证与司法要求',
      '监管报表自动生成与一键导出，无需人工整理，监管效率大幅提升',
    ],
    slogan: '科技赋能监管，让文旅票务市场更合规、更透明、更有序',
  },
];

const smartNodeRoles = [
  {
    color: Brand.blue,
    icon: <VenueIcon />,
    title: '景区 · 数字票务运营官',
    features: [
      '智能发行与链上确权',
      '动态定价与风险管控',
      '自动分账与实时结算',
      '多渠道智能分发上架',
    ],
  },
  {
    color: Brand.teal,
    icon: <MarketMakerIcon />,
    title: '做市商 · 数字交易操盘手',
    features: [
      '可信票源智能核验接入',
      '智能报价与交易撮合',
      '交易台账与审计报告',
      '跨系统数据自动同步',
    ],
  },
  {
    color: Brand.red,
    icon: <BankIcon />,
    title: '监管 · 数字监管督察员',
    features: [
      '全链路交易实时监控',
      '资金流向穿透式追踪',
      '合规报告自动生成',
      '跨机构监管数据协同',
    ],
  },
];

const smartNodeTech = [
  {
    icon: <MemoryIcon />,
    label: '自研智能体引擎',
    desc: '具备自主决策、任务拆解、多轮执行与上下文记忆能力，像真人员工一样思考协作'
  },
  {
    icon: <ScheduleIcon />,
    label: '7×24 小时不间断值守',
    desc: '无人干预自动执行业务，大幅降低运营人力成本，峰值时段依然稳定高效'
  },
  {
    icon: <HubIcon />,
    label: '跨系统无缝协同',
    desc: '对接景区 ERP、做市商交易系统、监管平台、银行支付系统，数据自动同步校验'
  },
  {
    icon: <LockIcon />,
    label: '企业级隐私与安全',
    desc: '数据脱敏、节点权限隔离、操作全链路留痕、不可篡改，满足政企级安全要求'
  },
  {
    icon: <TuneIcon />,
    label: '高度可定制化',
    desc: '按角色需求灵活配置数字员工技能，支持业务流程自定义，快速适配场景变化'
  },
];

const businessGoals = [
  { num: '01', title: '实现可信交易', desc: '利用区块链不可篡改、可溯源特性，确保门票等数字资产从发行、分销、交易到核销的全生命周期数据真实可信', color: Brand.blue },
  { num: '02', title: '高效智能服务', desc: '通过智能节点与数字员工服务，实现7×24小时自动化运营，大幅提升业务处理效率，降低各参与方的运营与对账成本', color: Brand.teal },
  { num: '03', title: '促进普惠金融', desc: '允许做市商凭借合规资产抵押从银行获取融资服务，解决中小文旅服务商融资难、融资贵的行业痛点', color: Brand.purple },
  { num: '04', title: '满足监管合规', desc: '为监管机构提供透明、实时的全量数据接入通道，满足金融业务反洗钱(AML)、数据隐私、交易审计等监管要求', color: Brand.red },
];

const applicationValues = [
  { title: '对景区', desc: '降本增效，数字化转型，实现门票资产化运营，智能节点驱动自动化发行、核销与分账结算', color: Brand.blue },
  { title: '对做市商', desc: '合规流通，风险可控，提升交易与结算效率，数字员工实现7×24小时智能做市与台账管理', color: Brand.teal },
  { title: '对银行机构', desc: '合规拓展客群，保障资金安全，实现链上交易全流程可溯，助力普惠金融业务落地', color: Brand.purple },
  { title: '对监管机构', desc: '穿透式监管，科技赋能，保障市场合规有序，智能督察实时预警异常交易与资金风险', color: Brand.red },
  { title: '对消费者', desc: '杜绝假票黄牛，保障购票权益，门票全生命周期链上可溯，购买、转让、核销全流程便捷透明', color: Brand.amber },
  { title: '对全行业', desc: '推动文旅票务走向数字资产化、标准化、可信化，可扩展至演艺、体育等多类权益资产场景', color: Brand.emerald },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  const scrollTo = (href: string) => {
    if (href.startsWith('/')) { navigate(href); return; }
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  /* Theme-derived section bg */
  const sectionAltBg = isDark
    ? alpha(theme.palette.common.white, 0.03)
    : alpha(theme.palette.common.black, 0.02);

  const footerBg = isDark ? '#020617' : '#111827';

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ── Navbar ──────────────────────────────────────────────── */}
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
                mr: 1, flexShrink: 0,
              }}
            >
              <Typography fontWeight="bold" color="#fff">科信</Typography>
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: Brand.blue, mr: 4 }}>
              KXDEX
            </Typography>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, flexGrow: 1 }}>
              {navLinks.map((l) => (
                <Typography
                  key={l.label}
                  variant="body2"
                  fontWeight={500}
                  sx={{
                    cursor: 'pointer', color: 'text.secondary',
                    '&:hover': { color: Brand.blue },
                    transition: 'color .2s',
                  }}
                  onClick={() => scrollTo(l.href)}
                >
                  {l.label}
                </Typography>
              ))}
            </Box>
            <Button
              size="medium"
              variant="outlined"
              startIcon={<ScienceIcon />}
              onClick={() => navigate('/entry')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              测试门户入口
            </Button>
            <IconButton onClick={toggleTheme} sx={{ mr: 1, color: 'text.secondary' }}>
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <Box
        id="hero"
        sx={{
          background: Brand.gradient,
          py: { xs: 8, md: 12 },
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3" fontWeight="bold"
            sx={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', mb: 2,
              textShadow: '0 2px 16px rgba(0,0,0,0.15)',
            }}
          >
            科信DEX · 重构景区门票数字资产交易新生态
          </Typography>
          <Typography
            variant="h6"
            sx={{ opacity: 0.92, mb: 4, fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 400 }}
          >
            基于联盟链的多方可信平台，实现「可信发行—高效交易—实时结算—穿透监管」全链路闭环
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained" size="large"
              onClick={() => navigate('/entry')}
              sx={{
                bgcolor: '#fff', color: Brand.blue, fontWeight: 600,
                px: 4, borderRadius: 1,
                '&:hover': { bgcolor: alpha('#fff', 0.9) },
              }}
            >
              立即体验测试门户
            </Button>
            <Button
              variant="outlined" size="large"
              onClick={() => navigate('/about')}
              sx={{
                color: '#fff', borderColor: alpha('#fff', 0.6), fontWeight: 600,
                px: 4, borderRadius: 1,
                '&:hover': { bgcolor: alpha('#fff', 0.1), borderColor: '#fff' },
              }}
            >
              了解技术架构
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── Background & Positioning ─────────────────────────────── */}
      <Box id="background" sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  平台背景
                </Typography>
              </Box>
              <Card sx={{ borderRadius: 1, p: { xs: 3, md: 4 }, height: 'calc(100% - 64px)' }}>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9, mb: 2 }}>
                  传统景区门票存在流通效率低、假票风险高、对账成本大、监管难度大等痛点。随着数字经济与区块链技术普及，文旅票务亟需从中心化模式走向多方可信共治模式。
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                  科信DEX应运而生，旨在通过联盟链技术解决文旅票务行业的核心痛点，打造安全、透明、高效的数字门票交易生态。
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  平台定位
                </Typography>
              </Box>
              <Card sx={{ borderRadius: 1, p: { xs: 3, md: 4 }, height: 'calc(100% - 64px)' }}>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9, mb: 2 }}>
                  科信DEX是
                  <Box component="strong" sx={{ color: Brand.blue }}>基于联盟链的许可制去中心化交易平台（DEX）</Box>
                  ，聚焦景区门票数字化发行与合规流通，构建"景区 — 做市商 — 银行监管"三位一体生态体系，实现：
                </Typography>
                <Grid container spacing={1}>
                  {['交易可信', '数据可溯', '资金可控', '监管可查'].map((t) => (
                    <Grid size={{ xs: 6 }} key={t}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ fontSize: 18, color: Brand.teal }} />
                        <Typography variant="body1" color="text.secondary">{t}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Core Business Goals ───────────────────────────────────── */}
      <Box id="goals" sx={{ py: { xs: 8, md: 10 }, bgcolor: sectionAltBg }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 2, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            核心业务目标
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
            围绕可信交易、高效服务、普惠金融、合规监管四大核心目标构建平台能力
          </Typography>
          <Grid container spacing={3}>
            {businessGoals.map((item) => (
              <Grid size={{ xs: 12, sm: 6 }} key={item.num}>
                <Card sx={{ borderRadius: 1, p: { xs: 3, md: 4 }, height: '100%', borderTop: `3px solid ${item.color}` }}>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: alpha(item.color, 0.15), mb: 1 }}>
                    {item.num}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {item.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Three Role Services ────────────────────────────────── */}
      <Box id="roles" sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 6, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            三大角色专属服务体系
          </Typography>
          <Grid container spacing={4}>
            {roleCards.map((role) => (
              <Grid size={{ xs: 12, md: 4 }} key={role.title}>
                <Card
                  sx={{
                    borderRadius: 1, p: 4, height: '100%',
                    transition: 'all .3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: `0 16px 32px ${alpha(role.color, 0.15)}`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 56, height: 56, borderRadius: '50%',
                      bgcolor: alpha(role.color, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mb: 3, color: role.color,
                    }}
                  >
                    {role.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 2 }}>
                    {role.title}
                  </Typography>
                  <Stack spacing={1.5} sx={{ mb: 3 }}>
                    {role.features.map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <CheckIcon sx={{ fontSize: 18, color: role.color, mt: 0.3, flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary">{f}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Typography variant="body2" fontWeight={500} sx={{ color: role.color }}>
                    {role.slogan}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Smart Node · Digital Employee ─────────────────────── */}
      <Box id="smart-node" sx={{ py: { xs: 8, md: 12 }, bgcolor: sectionAltBg }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h4" fontWeight="bold" color="text.primary"
              sx={{ mb: 2, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
            >
              智能节点 · OpenClaw 级数字员工服务
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto', lineHeight: 1.8 }}>
              科信DEX为联盟链各参与节点内置自研智能体引擎，将传统「记账节点」全面升级为
              <Box component="strong" sx={{ color: Brand.purple }}>「业务执行节点」</Box>
              ，为每一类角色配备专属数字员工，实现链上业务全流程自动化、智能化运营，让每一个节点都成为 7×24 小时高效运转的智能业务单元。
            </Typography>
          </Box>

          {/* 3 digital employee role cards */}
          <Grid container spacing={4} sx={{ mb: 8 }}>
            {smartNodeRoles.map((role) => (
              <Grid size={{ xs: 12, md: 4 }} key={role.title}>
                <Card
                  sx={{
                    borderRadius: 1, p: 0, height: '100%', overflow: 'hidden',
                    transition: 'all .3s',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: `0 16px 32px ${alpha(role.color, 0.15)}`,
                    },
                  }}
                >
                  <Box sx={{ bgcolor: alpha(role.color, 0.08), p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: '50%',
                      bgcolor: alpha(role.color, 0.15), display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: role.color,
                    }}>
                      {React.cloneElement(role.icon, { sx: { fontSize: 24 } })}
                    </Box>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ fontSize: '1rem' }}>
                      {role.title}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={1.5}>
                      {role.features.map((f, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <CheckIcon sx={{ fontSize: 16, color: role.color, flexShrink: 0 }} />
                          <Typography variant="body2" color="text.secondary">{f}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Smart node tech capabilities */}
          <Grid container spacing={2} justifyContent="center">
            {smartNodeTech.map((item, i) => (
              <Grid size={{ xs: 6, sm: 4, lg: 'grow' }} key={i}>
                <Card sx={{
                  borderRadius: 1, p: 2.5, textAlign: 'center', height: '100%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <Box sx={{ color: Brand.purple, mb: 1.5, '& svg': { fontSize: 28 } }}>
                    {item.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {item.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Core Tech Capabilities ─────────────────────────────── */}
      <Box id="tech" sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 6, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            链上核心技术能力
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {techItems.map((item) => (
              <Grid size={{ xs: 6, sm: 4, lg: 2 }} key={item.label}>
                <Card
                  sx={{
                    borderRadius: 1, p: 3, textAlign: 'center', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Box sx={{ color: Brand.blue, mb: 2, '& svg': { fontSize: 36 } }}>
                    {item.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {item.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Advantages ─────────────────────────────────────────── */}
      <Box id="advantages" sx={{ py: { xs: 8, md: 10 }, bgcolor: sectionAltBg }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 6, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            为什么选择科信DEX
          </Typography>
          <Grid container spacing={4}>
            {advantages.map((a) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={a.num}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80, height: 80, borderRadius: '50%',
                      bgcolor: alpha(Brand.blue, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mx: 'auto', mb: 3,
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold" sx={{ color: Brand.blue }}>
                      {a.num}
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 1.5 }}>
                    {a.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Application Value ─────────────────────────────────── */}
      <Box id="value" sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 6, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            应用价值
          </Typography>
          <Grid container spacing={4}>
            {applicationValues.map((v) => (
              <Grid size={{ xs: 12, md: 4 }} key={v.title}>
                <Card sx={{
                  borderRadius: 1, p: 4, height: '100%',
                  borderLeft: `4px solid ${v.color}`,
                  transition: 'all .3s',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 1.5 }}>
                    {v.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {v.desc}
                  </Typography>
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
              px: 5, py: 1.5, borderRadius: 1,
              '&:hover': { bgcolor: alpha('#fff', 0.9) },
            }}
          >
            进入测试门户统一入口
          </Button>
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Box id="footer" sx={{ bgcolor: footerBg, color: '#9CA3AF', py: 6 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex', flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between', alignItems: 'center',
              mb: 4, gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

export default HomePage;
