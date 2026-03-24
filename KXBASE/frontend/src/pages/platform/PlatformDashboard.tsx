import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Container,
  Grid,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Dns as DnsIcon,
  Description as ContractIcon,
  SwapHoriz as TransactionIcon,
  MonitorHeart as MonitorIcon,
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  ManageAccounts as AccountIcon,
  SupervisorAccount as RoleIcon,
  VpnKey as PermissionIcon,
  Login as LoginIcon,
  Settings as ConfigIcon,
  Hub as NodeIcon,
  Inventory as DictIcon,
  ToggleOn as EnvIcon,
  NotificationsActive as AlertIcon,
  Assessment as LogIcon,
  HealthAndSafety as HealthIcon,
  BarChart as ChartIcon,
  Groups as GroupIcon,
  DataObject as DataIcon,
  TableChart as ReportIcon,
  PersonSearch as BehaviorIcon,
  Timer as PerfIcon,
  Notifications as NotifyIcon,
  CloudUpload as CloudIcon,
  MenuBook as DocIcon,
  Language as I18nIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useWalletStore } from '@/store/walletStore';

const Brand = {
  blue: '#2563EB',
  teal: '#0D9488',
  red: '#DC2626',
  purple: '#7C3AED',
  amber: '#F59E0B',
  indigo: '#283593',
  gradient: 'linear-gradient(135deg, #283593 0%, #5c6bc0 100%)',
};

/* ── Overview stats (mock) ── */
const overviewStats = [
  { label: '注册账户', value: '28', icon: <PeopleIcon />, color: Brand.blue, trend: '+3 本周' },
  { label: '活跃角色', value: '7', icon: <SecurityIcon />, color: Brand.teal, trend: '全部在线' },
  { label: '共识节点', value: '10', icon: <StorageIcon />, color: Brand.purple, trend: '100% 可用' },
  { label: '区块高度', value: '1,247', icon: <SpeedIcon />, color: Brand.amber, trend: '0.5s/块' },
];

/* ── 6 Core Modules — each links to a platform route backed by admin pages ── */
const coreModules = [
  {
    title: '基础权限管理',
    subtitle: '安全基石 · 解决"谁能操作、能操作什么"',
    color: Brand.blue,
    icon: <ShieldIcon />,
    priority: '核心必备',
    path: '/platform/permissions',       // → RoleManagement
    features: [
      { icon: <AccountIcon />, name: '账号管理', desc: '超级管理员/普通管理员/运营人员等角色账号增删改查，状态管控' },
      { icon: <RoleIcon />, name: '角色管理', desc: '基于RBAC模型，预设系统角色+自定义角色，支持角色继承' },
      { icon: <PermissionIcon />, name: '权限配置', desc: '菜单权限、操作权限、数据权限、接口权限四维度细粒度管控' },
      { icon: <LoginIcon />, name: '登录安全', desc: '登录日志追踪、连续失败锁定、会话超时、操作水印、强制下线' },
    ],
  },
  {
    title: '系统配置管理',
    subtitle: '运维必备 · 解决"系统参数如何配置、规则如何定义"',
    color: Brand.teal,
    icon: <ConfigIcon />,
    priority: '运维必备',
    path: '/platform/config',            // → Settings
    features: [
      { icon: <ConfigIcon />, name: '基础参数', desc: '全局参数与业务参数配置，区块链节点超时、Gas阈值等' },
      { icon: <NodeIcon />, name: '节点管理', desc: '节点列表/状态监控/操作/证书管理，适配FISCO BCOS场景' },
      { icon: <EnvIcon />, name: '环境配置', desc: '测试/生产环境一键切换，配置版本回滚，避免误改' },
      { icon: <DictIcon />, name: '字典管理', desc: '通用枚举值配置，前端直接调用，无需硬编码' },
    ],
  },
  {
    title: '监控告警',
    subtitle: '稳定性保障 · 解决"系统出问题时如何及时发现、定位"',
    color: Brand.red,
    icon: <MonitorIcon />,
    priority: '稳定性保障',
    path: '/platform/monitoring',        // → Dashboard
    features: [
      { icon: <ChartIcon />, name: '实时监控', desc: 'CPU/内存/磁盘/网络、节点在线率、交易TPS、区块高度可视化' },
      { icon: <LogIcon />, name: '日志管理', desc: '操作日志/系统日志/业务日志分类检索，错误日志高亮+堆栈展示' },
      { icon: <AlertIcon />, name: '告警配置', desc: '自定义告警规则/阈值，邮件/短信/钉钉多渠道通知' },
      { icon: <HealthIcon />, name: '健康检查', desc: '节点连通性、SSL证书有效期、数据库连接自动巡检' },
    ],
  },
  {
    title: '业务资源管理',
    subtitle: '适配区块链场景 · 解决"核心业务对象的生命周期管理"',
    color: Brand.purple,
    icon: <StorageIcon />,
    priority: '业务核心',
    path: '/platform/resources',         // → Blockchain
    features: [
      { icon: <GroupIcon />, name: '群组管理', desc: '群组增删改查、状态监控、配置管理、节点扩容缩容' },
      { icon: <ContractIcon />, name: '合约管理', desc: '合约部署/升级/停用、ABI管理、方法调用测试、版本记录' },
      { icon: <TransactionIcon />, name: '交易管理', desc: '交易列表/详情/失败重试/批量导出，按哈希/区块高度/状态筛选' },
      { icon: <DataIcon />, name: '数据资产', desc: '链上数据查询导出、权限管控、敏感数据脱敏、备份恢复' },
    ],
  },
  {
    title: '运营分析',
    subtitle: '决策支撑 · 解决"系统运行效果如何、用户行为如何"',
    color: Brand.amber,
    icon: <TrendingUpIcon />,
    priority: '决策支撑',
    path: '/platform/analytics',         // → Dashboard
    features: [
      { icon: <ReportIcon />, name: '指标报表', desc: '日/周/月交易总量、活跃节点数、合约调用次数、图表+导出' },
      { icon: <BehaviorIcon />, name: '行为分析', desc: '管理员操作频次、高频模块、异常操作、登录地域分布' },
      { icon: <PerfIcon />, name: '性能分析', desc: '接口响应时长、节点交易耗时、慢接口/慢查询识别' },
      { icon: <ChartIcon />, name: '自定义报表', desc: '按维度自定义筛选，保存报表模板，定时推送' },
    ],
  },
  {
    title: '辅助功能',
    subtitle: '提升易用性 · 解决"使用体验与运维效率"',
    color: '#546e7a',
    icon: <DnsIcon />,
    priority: '体验增强',
    path: '/platform/config',            // → Settings (closest match)
    features: [
      { icon: <NotifyIcon />, name: '消息通知', desc: '系统公告、操作反馈、待办提醒，站内信+弹窗' },
      { icon: <CloudIcon />, name: '备份恢复', desc: '配置/数据/日志备份，手动+定时，一键恢复' },
      { icon: <DocIcon />, name: '操作手册', desc: '内嵌帮助文档、FAQ、在线反馈入口' },
      { icon: <I18nIcon />, name: '国际化/主题', desc: '多语言切换、深色/浅色主题、自定义布局' },
    ],
  },
];

/* ── Mock system health ── */
const systemHealth = [
  { name: '共识节点', status: 'healthy', uptime: '99.97%', detail: '10/10 在线' },
  { name: 'WeBASE 服务', status: 'healthy', uptime: '99.5%', detail: '正常运行' },
  { name: 'SSL 证书', status: 'warning', uptime: '—', detail: '30天后到期' },
  { name: '数据库连接池', status: 'healthy', uptime: '100%', detail: '活跃 12/50' },
];

const PlatformDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';
  const { currentBackendWallet } = useWalletStore();

  const sectionAltBg = isDark
    ? alpha(theme.palette.common.white, 0.03)
    : alpha(theme.palette.common.black, 0.02);

  return (
    <Box sx={{ mx: -3, mt: -3 }}>
      {/* ── Hero Banner ── */}
      <Box
        sx={{
          background: Brand.gradient,
          py: { xs: 4, md: 6 },
          px: 3,
          color: '#fff',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="h4" fontWeight="bold"
                sx={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', mb: 1 }}
              >
                平台管理系统
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                权限管控 · 资源管理 · 运营监控 · 配置管理 — 联盟链全栈管控中心
              </Typography>
              {currentBackendWallet && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    label={`管理员: ${currentBackendWallet.name || 'ADMIN'}`}
                    size="small"
                    sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', fontWeight: 600 }}
                  />
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.8 }}>
                    {currentBackendWallet.address}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Grid container spacing={2}>
                {overviewStats.map((stat) => (
                  <Grid size={{ xs: 6 }} key={stat.label}>
                    <Box sx={{
                      bgcolor: alpha('#fff', 0.12), borderRadius: 1, p: 2,
                      backdropFilter: 'blur(8px)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, '& svg': { fontSize: 18 } }}>
                        {stat.icon}
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>{stat.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>{stat.trend}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── System Health Strip ── */}
      <Box sx={{ bgcolor: sectionAltBg, py: 3, px: 3 }}>
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            {systemHealth.map((item) => (
              <Grid size={{ xs: 6, md: 3 }} key={item.name}>
                <Card sx={{ borderRadius: 1, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: item.status === 'healthy' ? '#10B981' : '#F59E0B',
                    flexShrink: 0,
                  }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Core Modules ── */}
      <Box sx={{ py: { xs: 4, md: 6 }, px: 3 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 1, fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            六大核心功能模块
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 5, maxWidth: 600, mx: 'auto' }}>
            基础权限 &gt; 系统配置 &gt; 监控告警 &gt; 业务资源 &gt; 运营分析 &gt; 辅助功能
          </Typography>

          <Stack spacing={5}>
            {coreModules.map((mod, idx) => (
              <Card
                key={mod.title}
                onClick={() => navigate(mod.path)}
                sx={{
                  borderRadius: 1, overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all .3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 16px 32px ${alpha(mod.color, 0.15)}`,
                  },
                  '&:hover .module-enter': {
                    opacity: 1,
                    transform: 'translateX(0)',
                  },
                }}
              >
                {/* Module header */}
                <Box sx={{
                  bgcolor: alpha(mod.color, 0.08), p: { xs: 2.5, md: 3 },
                  display: 'flex', alignItems: 'center', gap: 2,
                  borderBottom: `2px solid ${alpha(mod.color, 0.15)}`,
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '50%',
                    bgcolor: alpha(mod.color, 0.15), display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: mod.color,
                    '& svg': { fontSize: 24 },
                  }}>
                    {mod.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="overline" sx={{ color: mod.color, fontWeight: 700, letterSpacing: 1 }}>
                        MODULE {String(idx + 1).padStart(2, '0')}
                      </Typography>
                      <Chip
                        label={mod.priority}
                        size="small"
                        sx={{ bgcolor: alpha(mod.color, 0.1), color: mod.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                      />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ lineHeight: 1.2 }}>
                      {mod.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, maxWidth: 240 }}>
                    {mod.subtitle}
                  </Typography>
                  <Box
                    className="module-enter"
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      color: mod.color, fontWeight: 600, fontSize: '0.85rem',
                      opacity: 0, transform: 'translateX(-8px)',
                      transition: 'all .3s', flexShrink: 0,
                    }}
                  >
                    进入
                    <ArrowForwardIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Box>

                {/* Features grid */}
                <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Grid container spacing={2}>
                    {mod.features.map((feat) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={feat.name}>
                        <Box
                          sx={{
                            p: 2, borderRadius: 1,
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            transition: 'all .2s',
                            '&:hover': {
                              borderColor: alpha(mod.color, 0.3),
                              bgcolor: alpha(mod.color, 0.03),
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Box sx={{ color: mod.color, '& svg': { fontSize: 20 } }}>
                              {feat.icon}
                            </Box>
                            <Typography variant="body2" fontWeight={700} color="text.primary">
                              {feat.name}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {feat.desc}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── Design Principles ── */}
      <Box sx={{ bgcolor: sectionAltBg, py: { xs: 4, md: 6 }, px: 3 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 5, fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            交互设计原则
          </Typography>
          <Grid container spacing={3}>
            {[
              { num: '01', title: '极简操作', desc: '核心操作 ≤ 3步，常用功能放在侧边栏快捷入口', color: Brand.blue },
              { num: '02', title: '可视化反馈', desc: '操作后即时提示，异常红色标注，正常绿色标识', color: Brand.teal },
              { num: '03', title: '批量处理', desc: '账号/节点/交易批量操作，如批量禁用、批量导出', color: Brand.purple },
              { num: '04', title: '容错设计', desc: '关键操作二次确认，误操作支持撤销/回滚', color: Brand.red },
              { num: '05', title: '响应式布局', desc: '适配PC/平板，核心监控面板移动端可查看', color: Brand.amber },
            ].map((p) => (
              <Grid size={{ xs: 12, sm: 6, md: 'grow' }} key={p.num}>
                <Card sx={{ borderRadius: 1, p: 3, textAlign: 'center', height: '100%', borderTop: `3px solid ${p.color}` }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: alpha(p.color, 0.2), mb: 1 }}>
                    {p.num}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
                    {p.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {p.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Priority Roadmap ── */}
      <Box sx={{ py: { xs: 4, md: 6 }, px: 3 }}>
        <Container maxWidth="md">
          <Typography
            variant="h4" fontWeight="bold" textAlign="center" color="text.primary"
            sx={{ mb: 5, fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            落地优先级路线
          </Typography>
          <Stack spacing={2}>
            {[
              { phase: 'P0 · 最小可用版本', items: '基础权限管理 + 节点管理 + 实时监控', progress: 80, color: Brand.blue },
              { phase: 'P1 · 核心业务扩展', items: '合约管理 + 交易管理 + 告警配置', progress: 40, color: Brand.teal },
              { phase: 'P2 · 运营分析增强', items: '指标报表 + 行为分析 + 自定义报表', progress: 10, color: Brand.purple },
              { phase: 'P3 · 体验优化', items: '消息通知 + 备份恢复 + 国际化', progress: 0, color: Brand.amber },
            ].map((item) => (
              <Card key={item.phase} sx={{ borderRadius: 1, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" fontWeight={700} color="text.primary">
                    {item.phase}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: item.color }}>
                    {item.progress}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                  {item.items}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={item.progress}
                  sx={{
                    height: 6, borderRadius: 3,
                    bgcolor: alpha(item.color, 0.1),
                    '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 3 },
                  }}
                />
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default PlatformDashboard;
