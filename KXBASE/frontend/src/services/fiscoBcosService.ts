import backendClient from "./backendClient";
import type { NetworkConfig, TransactionReceipt } from "@/types";

/**
 * FISCO 区块链访问服务（通过 Java 后端）
 */
class FiscoBcosService {
  private config: NetworkConfig;

  constructor(config: NetworkConfig) {
    this.config = config;
  }

  async getClientVersion(): Promise<string> {
    try {
      const response = await backendClient.getClient().get("/api/v1/system/version");
      const version = response.data?.sdk || "FISCO BCOS Java Backend";
      return String(version);
    } catch (error) {
      console.warn("Failed to get client version:", error);
      return "Unknown";
    }
  }

  async getBlockNumber(): Promise<number> {
    const response = await backendClient.getClient().get("/api/v1/blockchain/block-number");
    return Number(response.data?.blockNumber ?? 0);
  }

  async getBlockByNumber(blockNumber: number, includeTransactions: boolean = false): Promise<any> {
    const response = await backendClient.getClient().get(
      `/api/v1/blockchain/blocks/${blockNumber}`,
      {
        params: {
          fullTransactions: includeTransactions,
        },
      }
    );
    return response.data;
  }

  async getRecentBlocks(limit: number = 10, includeTransactions: boolean = false): Promise<any[]> {
    const response = await backendClient.getClient().get("/api/v1/blockchain/blocks", {
      params: {
        limit,
        fullTransactions: includeTransactions,
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    const response = await backendClient
      .getClient()
      .get(`/api/v1/blockchain/transactions/${txHash}/receipt`);

    const receipt = response.data;
    if (!receipt || Object.keys(receipt).length === 0) {
      return null;
    }

    return {
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber ?? 0),
      from: receipt.from,
      to: receipt.to,
      status: receipt.status,
      gasUsed: receipt.gasUsed,
      logs: receipt.logEntries ?? receipt.logs,
    };
  }

  getConfig(): NetworkConfig {
    return this.config;
  }

  updateConfig(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

const defaultConfig: NetworkConfig = {
  name: "FISCO Backend",
  rpcUrl: "",
  chainId: "1",
  groupId: "group0",
};

export const fiscoBcosService = new FiscoBcosService(defaultConfig);
export default fiscoBcosService;
