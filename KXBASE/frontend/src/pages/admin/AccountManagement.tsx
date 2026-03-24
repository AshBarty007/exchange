import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Paper,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  AccountTree as SubAccountIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useWalletStore } from "@/store/walletStore";
import contractService from "@/services/contractService";
import contractInteractionService, { ContractInteractionRecord } from "@/services/contractInteractionService";
import ContractInteractionPanel from "@/components/ContractInteractionPanel";

// ── TabPanel ──────────────────────────────────────────────────────────────
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

// ── Main component ────────────────────────────────────────────────────────
const AccountManagement: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();
  const [tab, setTab] = useState(0);
  const [lastInteraction, setLastInteraction] = useState<ContractInteractionRecord | null>(null);

  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.mode === "send") setLastInteraction(record);
    });
  }, []);

  const walletAddress = currentBackendWallet?.address ?? "";
  const walletRole = currentBackendWallet?.role ?? "";

  // ── Tab1: 注册子账户 ────────────────────────────────────────────────────
  const [subMain, setSubMain] = useState("");
  const [subMeta, setSubMeta] = useState("");
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subResult, setSubResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (currentBackendWallet && (walletRole === "scenic" || walletRole === "market_maker")) {
      setSubMain(currentBackendWallet.address);
    }
  }, [currentBackendWallet]);

  const handleRegisterSub = async () => {
    if (!currentBackendWallet) { setSubResult({ type: "error", msg: "请先在钱包管理选择后端钱包" }); return; }
    if (walletRole !== "scenic" && walletRole !== "market_maker") {
      setSubResult({ type: "error", msg: "注册子账户需要景区或做市商角色钱包" }); return;
    }
    if (!subMain.trim()) { setSubResult({ type: "error", msg: "请输入主账户地址" }); return; }

    setSubSubmitting(true);
    setSubResult(null);
    try {
      const hash = await contractService.createSubAccountWithSigner(
        subMain.trim(),
        subMeta || `${currentBackendWallet.name || walletAddress.slice(0, 8)}-sub`,
        walletAddress
      );
      setSubResult({ type: "success", msg: `子账户注册成功，TxHash: ${hash}` });
      setSubMeta("");
    } catch (e: any) {
      setSubResult({ type: "error", msg: `注册失败: ${e?.message || "网络错误"}` });
    } finally {
      setSubSubmitting(false);
    }
  };

  // ── Tab2: 查看子账户 ────────────────────────────────────────────────────
  const [queryAddr, setQueryAddr] = useState("");
  const [subAccounts, setSubAccounts] = useState<string[]>([]);
  const [querying, setQuerying] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (currentBackendWallet) setQueryAddr(currentBackendWallet.address);
  }, [currentBackendWallet]);

  const handleQuery = async () => {
    if (!queryAddr.trim()) { setQueryError("请输入主账户地址"); return; }
    setQuerying(true);
    setQueryError("");
    setSubAccounts([]);
    try {
      const list = await contractService.getSubAccounts(queryAddr.trim());
      setSubAccounts(list);
      if (list.length === 0) setQueryError("该地址暂无已注册的子账户");
    } catch (e: any) {
      setQueryError(`查询失败: ${e?.message || "网络错误"}`);
    } finally {
      setQuerying(false);
    }
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        账户管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        管理链上主账户与子账户注册
      </Typography>

      {currentBackendWallet ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前后端钱包：<strong>{currentBackendWallet.name || walletAddress.slice(0, 10) + "..."}</strong>
          <Chip label={walletRole} size="small" sx={{ ml: 1 }} />
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          请先在「钱包管理」页选择后端钱包
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab icon={<SubAccountIcon />} iconPosition="start" label="注册子账户" />
            <Tab icon={<SearchIcon />} iconPosition="start" label="查看子账户" />
          </Tabs>

          {/* ── Tab1: 注册子账户 ── */}
          <TabPanel value={tab} index={0}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <Chip label="景区" size="small" color="success" />
              <Chip label="做市商" size="small" color="warning" sx={{ ml: 0.5 }} />
              {" "}角色钱包可为自己的主账户注册子账户
            </Typography>
            <Stack spacing={2} maxWidth={500}>
              <TextField
                label="主账户地址"
                value={subMain}
                onChange={(e) => setSubMain(e.target.value)}
                placeholder="0x..."
                fullWidth
              />
              <TextField
                label="子账户备注（metadata，可选）"
                value={subMeta}
                onChange={(e) => setSubMeta(e.target.value)}
                placeholder="例如：子账户1"
                fullWidth
              />
              {subResult && (
                <Alert severity={subResult.type} onClose={() => setSubResult(null)}>
                  {subResult.msg}
                </Alert>
              )}
              <Button
                variant="contained"
                color="success"
                startIcon={subSubmitting ? <CircularProgress size={16} /> : <SubAccountIcon />}
                disabled={
                  !currentBackendWallet ||
                  (walletRole !== "scenic" && walletRole !== "market_maker") ||
                  subSubmitting
                }
                onClick={handleRegisterSub}
              >
                {subSubmitting ? "提交中..." : "注册子账户"}
              </Button>
            </Stack>
          </TabPanel>

          {/* ── Tab2: 查看子账户 ── */}
          <TabPanel value={tab} index={1}>
            <Stack spacing={2} maxWidth={600}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="主账户地址"
                  value={queryAddr}
                  onChange={(e) => setQueryAddr(e.target.value)}
                  placeholder="0x..."
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={querying ? <CircularProgress size={16} /> : <SearchIcon />}
                  disabled={querying}
                  onClick={handleQuery}
                  sx={{ minWidth: 100 }}
                >
                  查询
                </Button>
              </Box>

              {queryError && <Alert severity={subAccounts.length === 0 ? "info" : "error"}>{queryError}</Alert>}

              {subAccounts.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>子账户地址</TableCell>
                        <TableCell align="center">复制</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subAccounts.map((addr, idx) => (
                        <TableRow key={addr} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                              {addr}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={copied === addr ? "已复制" : "复制地址"}>
                              <IconButton size="small" onClick={() => copyAddr(addr)}>
                                <CopyIcon fontSize="small" color={copied === addr ? "success" : "inherit"} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {subAccounts.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  共 {subAccounts.length} 个子账户
                </Typography>
              )}
            </Stack>
          </TabPanel>
        </CardContent>
      </Card>

      <Box sx={{ mt: 2 }}>
        <ContractInteractionPanel title="账户合约交互" record={lastInteraction} />
      </Box>
    </Box>
  );
};

export default AccountManagement;
