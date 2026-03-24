import React from "react";
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { ContractInteractionRecord } from "@/services/contractInteractionService";

interface ContractInteractionPanelProps {
  title?: string;
  record: ContractInteractionRecord | null;
}

const ContractInteractionPanel: React.FC<ContractInteractionPanelProps> = ({ title = "合约交互可视化", record }) => {
  const reverted = record?.mode === "send" && record?.receipt?.status && record.receipt.status !== "0x0";
  const revertMessage = record?.interaction?.response?.message;

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        {!record ? (
          <Alert severity="info">暂无交互记录，执行一次合约操作后会在这里显示请求参数与链上反馈。</Alert>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Chip label={record.mode === "send" ? "上链交易" : "只读调用"} color="primary" size="small" />
              {record.contractName && <Chip label={record.contractName} size="small" variant="outlined" />}
              {reverted && (
                <Chip label="交易失败 (revert)" color="error" size="small" />
              )}
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {record.method}
              </Typography>
            </Box>

            {reverted && (
              <Alert severity="error">
                <Typography variant="body2" fontWeight="bold">链上交易已被回滚 (revert)</Typography>
                {revertMessage && (
                  <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5 }}>
                    {revertMessage}
                  </Typography>
                )}
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                请求数据
              </Typography>
              <pre style={{ margin: 0, fontSize: "0.8rem", overflowX: "auto" }}>
                {JSON.stringify(record.interaction?.request ?? {
                  contractAddress: record.contractAddress,
                  params: record.params,
                }, null, 2)}
              </pre>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                返回数据
              </Typography>
              <pre style={{ margin: 0, fontSize: "0.8rem", overflowX: "auto" }}>
                {JSON.stringify(record.interaction?.response ?? {
                  txHash: record.txHash,
                  output: record.output,
                  receipt: record.receipt,
                }, null, 2)}
              </pre>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractInteractionPanel;
