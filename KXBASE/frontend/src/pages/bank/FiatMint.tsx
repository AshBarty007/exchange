import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AccountBalance as MintIcon } from "@mui/icons-material";
import { useWalletStore } from "@/store/walletStore";
import contractService from "@/services/contractService";
import contractInteractionService, { ContractInteractionRecord } from "@/services/contractInteractionService";
import ContractInteractionPanel from "@/components/ContractInteractionPanel";
import { fiatToRaw } from "@/utils/fiatAmount";

const FiatMint: React.FC = () => {
  const { currentBackendWallet } = useWalletStore();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<ContractInteractionRecord | null>(null);

  const isBank = currentBackendWallet?.role === "bank";

  useEffect(() => {
    return contractInteractionService.subscribe((record) => {
      if (record.mode === "send" && record.method.toLowerCase().includes("mint")) {
        setLastInteraction(record);
      }
    });
  }, []);

  const handleMint = async () => {
    if (!isBank) {
      setError("仅银行角色可铸造法币通证");
      return;
    }
    if (!toAddress.trim()) {
      setError("请输入接收地址");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("请输入有效金额");
      return;
    }

    setSubmitting(true);
    setError("");
    setTxHash("");

    try {
      const amountRaw = fiatToRaw(amount);
      const hash = await contractService.mintFiatWithSigner(toAddress.trim(), amountRaw, currentBackendWallet!.address);
      setTxHash(hash);
      setAmount("");
    } catch (e: any) {
      setError(`铸造失败: ${e?.message || "网络错误"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        法币铸造
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        银行角色可通过后端调用 FiatToken 合约进行法币凭证铸造
      </Typography>

      {!currentBackendWallet && (
        <Alert severity="warning" sx={{ mb: 2 }}>请先在钱包管理页面选择账户。</Alert>
      )}

      {currentBackendWallet && !isBank && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          当前账户无铸造权限，需切换到银行角色钱包。
        </Alert>
      )}

      {isBank && (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前签名方式：
          <Chip label={`后端钱包签名 · ${currentBackendWallet!.name || currentBackendWallet!.address.slice(0, 10) + "..."}`} size="small" color="primary" sx={{ ml: 1 }} />
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {txHash && (
        <Alert severity="success" sx={{ mb: 2 }}>
          铸造交易已提交，TxHash: {txHash}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="接收主钱包地址"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              fullWidth
            />
            <TextField
              label="铸造金额（元）"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              inputProps={{ min: 0, step: 0.0001 }}
            />
            <Button
              variant="contained"
              startIcon={<MintIcon />}
              disabled={!isBank || submitting}
              onClick={handleMint}
            >
              {submitting ? "提交中..." : "确认铸造"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <ContractInteractionPanel title="法币铸造合约交互" record={lastInteraction} />
    </Box>
  );
};

export default FiatMint;
