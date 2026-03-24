import backendClient from "./backendClient";
import contractInteractionService from "./contractInteractionService";
import type {
  ContractAddressMap,
  ContractInfo,
  OrderParams,
  SignedOrder,
} from "@/types";

/**
 * 智能合约服务（通过 Java 后端）
 * 合约地址统一从后端 deployed-contracts.json 加载，前端不做本地缓存。
 */
class ContractService {
  private contracts: Map<string, ContractInfo> = new Map();
  private initialized = false;

  /**
   * 初始化：从后端 API 加载合约地址。
   */
  async initializeContracts(forceReload: boolean = false): Promise<ContractInfo[]> {
    if (this.initialized && !forceReload) {
      return this.getAllContracts();
    }

    if (forceReload) {
      this.contracts.clear();
    }

    try {
      await this.loadContractsFromBackend();
    } catch (error) {
      console.warn("Failed to load contracts from backend:", error);
    }

    this.initialized = true;
    return this.getAllContracts();
  }

  /**
   * 从后端 API 加载合约地址 (GET /api/v1/contracts/addresses)
   */
  async loadContractsFromBackend(): Promise<ContractInfo[]> {
    const response = await backendClient.getClient().get("/api/v1/contracts/addresses");
    const addresses: ContractAddressMap = response.data || {};

    this.contracts.clear();
    Object.entries(addresses).forEach(([name, address]) => {
      if (name && address) {
        this.contracts.set(name, { name, address, abi: [] });
      }
    });

    return this.getAllContracts();
  }

  /**
   * 通知后端重新加载 deployed-contracts.json，然后刷新前端缓存。
   * 如果后端 reload 失败，仍尝试加载当前已有的地址。
   */
  async reloadFromServer(): Promise<ContractInfo[]> {
    try {
      await backendClient.getClient().post("/api/v1/contracts/addresses/reload");
    } catch (e) {
      console.warn("Backend reload request failed (non-fatal):", e);
    }
    return this.loadContractsFromBackend();
  }

  getContractAddressMap(): ContractAddressMap {
    const map: ContractAddressMap = {};
    this.contracts.forEach((contract, name) => {
      map[name] = contract.address;
    });
    return map;
  }

  getContract(name: string): ContractInfo | undefined {
    return this.contracts.get(name);
  }

  getAllContracts(): ContractInfo[] {
    return Array.from(this.contracts.values());
  }

  async call(
    contractName: string,
    method: string,
    params: any[] = [],
    returnTypes: string[] = [],
    from?: string
  ): Promise<any[]> {
    const contract = this.getContract(contractName);
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const functionSignature = this.buildFunctionSignature(method, params);

    const response = await backendClient.getClient().post("/api/v1/contracts/call", {
      contractName,
      contractAddress: contract.address,
      method: functionSignature,
      params,
      returnTypes,
      from,
    });

    const data = response.data || {};
    contractInteractionService.publish({
      mode: "call",
      contractName,
      contractAddress: contract.address,
      method: functionSignature,
      params,
      output: data.output || [],
      interaction: data.interaction,
    });

    return data.output || [];
  }

  /** Send a transaction signed by the backend using the PEM file for signerAddress. */
  async sendWithSigner(
    contractName: string,
    method: string,
    params: any[],
    signerAddress: string,
    returnTypes: string[] = []
  ): Promise<string> {
    const contract = this.getContract(contractName);
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const functionSignature = this.buildFunctionSignature(method, params);

    const response = await backendClient.getClient().post("/api/v1/contracts/send", {
      contractName,
      contractAddress: contract.address,
      method: functionSignature,
      params,
      returnTypes,
      signerAddress,
    });

    const data = response.data || {};
    const txHash = data.txHash || "";

    contractInteractionService.publish({
      mode: "send",
      contractName,
      contractAddress: contract.address,
      method: functionSignature,
      params,
      txHash,
      output: data.output || [],
      receipt: data.receipt,
      interaction: data.interaction,
    });

    if (data.reverted) {
      throw new Error("交易被合约回滚: " + (data.revertMessage || "revert"));
    }

    return txHash;
  }

  async send(
    contractName: string,
    method: string,
    params: any[],
    privateKey: string,
    from: string,
    returnTypes: string[] = []
  ): Promise<string> {
    const contract = this.getContract(contractName);
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const functionSignature = this.buildFunctionSignature(method, params);

    const response = await backendClient.getClient().post("/api/v1/contracts/send", {
      contractName,
      contractAddress: contract.address,
      method: functionSignature,
      params,
      returnTypes,
      privateKey,
      from,
    });

    const data = response.data || {};
    const txHash = data.txHash || "";

    contractInteractionService.publish({
      mode: "send",
      contractName,
      contractAddress: contract.address,
      method: functionSignature,
      params,
      txHash,
      output: data.output || [],
      receipt: data.receipt,
      interaction: data.interaction,
    });

    if (data.reverted) {
      throw new Error("交易被合约回滚: " + (data.revertMessage || "revert"));
    }

    return txHash;
  }

  private buildFunctionSignature(method: string, params: any[]): string {
    if (method.includes("(")) {
      return method;
    }

    const types = params.map((p) => this.inferType(p));
    return `${method}(${types.join(",")})`;
  }

  private extractMethodName(method: string): string {
    const index = method.indexOf("(");
    return index > 0 ? method.slice(0, index) : method;
  }

  private inferType(param: any): string {
    if (typeof param === "string") {
      if (param.startsWith("0x") && param.length === 42) {
        return "address";
      }
      if (param.startsWith("0x")) {
        return "bytes32";
      }
      if (/^\d+$/.test(param)) {
        return "uint256";
      }
      return "string";
    }
    if (typeof param === "number") {
      return "uint256";
    }
    if (typeof param === "bigint") {
      return "uint256";
    }
    if (typeof param === "boolean") {
      return "bool";
    }
    if (Array.isArray(param)) {
      return this.inferType(param[0]) + "[]";
    }

    return "bytes";
  }

  // ==================== Auth 合约方法 ====================
  // ==================== FiatToken 合约方法 ====================
  async getFiatBalance(account: string): Promise<string> {
    const result = await this.call("FiatToken", "balanceOf", [account], ["uint256"]);
    return result[0]?.toString() || "0";
  }

  async mintFiat(to: string, amount: string, privateKey: string, from: string): Promise<string> {
    return await this.send("FiatToken", "mint", [to, amount], privateKey, from);
  }

  /** Mint fiat token signed by the backend PEM for signerAddress (no private key on frontend). */
  async mintFiatWithSigner(to: string, amount: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("FiatToken", "mint", [to, amount], signerAddress);
  }

  /** Set burn account signed by the backend PEM for signerAddress. */
  async setBurnAccountWithSigner(burnAccount: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("FiatToken", "setBurnAccount", [burnAccount], signerAddress);
  }

  // ==================== Ticket 合约方法 ====================
  async getTicketBalance(account: string, ticketId: number): Promise<string> {
    const result = await this.call("Ticket", "balanceOf", [account, ticketId], ["uint256"]);
    return result[0]?.toString() || "0";
  }

  async getAccountTicketIds(account: string): Promise<number[]> {
    const result = await this.call("Ticket", "getAccountTickets", [account], ["uint256[]"]);
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0].map((item: any) => Number(item));
    }
    return [];
  }

  async getTicketInfo(ticketId: number): Promise<any[]> {
    const result = await this.call("Ticket", "getTicketInfo", [ticketId], [
      "tuple(uint256,address,string,uint256,uint256,uint256,uint256,uint256,string,bool,uint256)",
    ]);
    // 对于 tuple 返回值，后端返回的是包含所有字段的数组
    if (Array.isArray(result)) {
      return result[0];
    }
    return [];
  }

  /** Issue ticket signed by the backend PEM for signerAddress (no private key on frontend). */
  async issueTicketWithSigner(
    subAccount: string,
    name: string,
    totalSupply: number,
    minPriceWei: string,
    maxPriceWei: string,
    validFrom: number,
    validUntil: number,
    infoHash: string,
    signerAddress: string
  ): Promise<string> {
    return await this.sendWithSigner(
      "Ticket",
      "issueTicket(address,string,uint256,uint256,uint256,uint256,uint256,string)",
      [subAccount, name, totalSupply, minPriceWei, maxPriceWei, validFrom, validUntil, infoHash],
      signerAddress
    );
  }

  // ==================== Account 合约方法 ====================
  async createSubAccountWithSigner(mainAccount: string, metadata: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("Account", "createSubAccount", [mainAccount, metadata], signerAddress);
  }

  async getSubAccounts(mainAccount: string): Promise<string[]> {
    console.log('getSubAccounts called for:', mainAccount);
    const result = await this.call("Account", "getSubAccounts", [mainAccount], ["address[]"]);
    console.log('getSubAccounts result:', result);
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0] as string[];
    }
    return [];
  }

  // ==================== Exchange 合约方法 ====================
  async getOrderNonce(account: string): Promise<number> {
    const result = await this.call("Exchange", "getNonce", [account], ["uint256"]);
    return Number(result[0] ?? 0);
  }

  async signOrderWithBackend(
    params: OrderParams,
    signerAddress: string
  ): Promise<SignedOrder> {
    const response = await backendClient.getClient().post("/api/v1/contracts/sign-order", {
      orderType: params.orderType,
      ticketId: params.ticketId,
      price: params.price,
      amount: params.amount,
      nonce: params.nonce,
      signerAddress,
    });

    const data = response.data || {};
    const normalizedOrderHash = String(data.orderHash || "");
    const normalizedSignature = String(data.signature || "");
    const normalizedSigner = String(data.signer || signerAddress);
    return {
      orderType: Number(data.orderType ?? params.orderType),
      ticketId: Number(data.ticketId ?? params.ticketId),
      price: Number(data.price ?? params.price),
      amount: Number(data.amount ?? params.amount),
      nonce: Number(data.nonce ?? params.nonce),
      orderHash: normalizedOrderHash.startsWith("0x") ? normalizedOrderHash : `0x${normalizedOrderHash}`,
      signature: normalizedSignature.startsWith("0x") ? normalizedSignature : `0x${normalizedSignature}`,
      signer: normalizedSigner.startsWith("0x") ? normalizedSigner : `0x${normalizedSigner}`,
    };
  }

  async submitOrder(
    signedOrder: SignedOrder,
    privateKey: string
  ): Promise<string> {
    return await this.send(
      "Exchange",
      "createOrder(uint8,uint256,uint256,uint256,bytes)",
      [
        signedOrder.orderType,
        signedOrder.ticketId,
        signedOrder.price,
        signedOrder.amount,
        signedOrder.signature,
      ],
      privateKey,
      signedOrder.signer
    );
  }

  async submitOrderWithSigner(
    signedOrder: SignedOrder,
    signerAddress: string
  ): Promise<string> {
    return await this.sendWithSigner(
      "Exchange",
      "createOrder(uint8,uint256,uint256,uint256,bytes)",
      [
        signedOrder.orderType,
        signedOrder.ticketId,
        signedOrder.price,
        signedOrder.amount,
        signedOrder.signature,
      ],
      signerAddress
    );
  }

  /**
   * 主账户代子账户下单（买单/卖单均支持）
   * signerAddress = 主账户（msg.sender），subAccount = 子账户（订单归属）
   */
  async createOrderForSubAccount(
    orderType: number,
    subAccount: string,
    ticketId: number,
    priceRaw: string,
    amount: string,
    signerAddress: string
  ): Promise<string> {
    return await this.sendWithSigner(
      "Exchange",
      "createOrderFor(address,uint8,uint256,uint256,uint256,bytes)",
      [subAccount, orderType, ticketId, priceRaw, amount, "0x"],
      signerAddress
    );
  }

  /**
   * 获取法币授权额度（raw 值）
   */
  async getFiatAllowance(owner: string, spender: string): Promise<string> {
    const result = await this.call("FiatToken", "allowance", [owner, spender], ["uint256"]);
    return result[0]?.toString() || "0";
  }

  /**
   * 授权法币（由 signerAddress 签名）
   */
  async approveFiatWithSigner(spender: string, amount: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("FiatToken", "approve", [spender, amount], signerAddress);
  }

  /**
   * 主账户代子账户授权法币
   */
  async approveFiatForSubAccount(subAccount: string, spender: string, amount: string, mainAccount: string): Promise<string> {
    return await this.sendWithSigner("FiatToken", "approveFor", [subAccount, spender, amount], mainAccount);
  }

  /**
   * 主账户代子账户授权门票
   */
  async approveTicketForSubAccount(subAccount: string, spender: string, ticketId: number, amount: string, mainAccount: string): Promise<string> {
    console.log('approveTicketForSubAccount called with:', {
      subAccount,
      spender,
      ticketId,
      amount,
      mainAccount
    });

    // 诊断：检查子账户状态
    try {
      const accountInfo = await this.call("Account", "getAccountInfo", [subAccount], [
        "tuple(uint8,address,address[],bytes32,uint256,bool,string)"
      ]);
      const info = Array.isArray(accountInfo[0]) ? accountInfo[0] : accountInfo;
      console.log('Sub-account info:', {
        accountType: info[0], // 0=NONE, 1=MAIN, 2=SUB
        mainAccount: info[1],
        subAccounts: info[2],
        role: info[3],
        createdAt: info[4],
        active: info[5],
        metadata: info[6]
      });

      const ownership = await this.call("Account", "verifySubAccountOwnership", [subAccount, mainAccount], ["bool"]);
      console.log('verifySubAccountOwnership result:', ownership[0]);

      if (!ownership[0]) {
        throw new Error(`子账户验证失败：${subAccount} 不属于主账户 ${mainAccount}。请检查子账户是否正确创建。`);
      }
    } catch (diagErr: any) {
      console.error('Diagnostic check failed:', diagErr);
      throw new Error('子账户验证失败: ' + (diagErr.message || '未知错误'));
    }

    return await this.sendWithSigner("Ticket", "approveFor", [subAccount, spender, ticketId, amount], mainAccount);
  }

  async cancelOrder(orderId: number, privateKey: string, from: string): Promise<string> {
    return await this.send("Exchange", "cancelOrder", [orderId], privateKey, from);
  }

  async getOrder(orderId: number): Promise<any[]> {
    // getOrder 返回 Order memory（结构体），必须用 tuple 类型描述
    // 字段顺序: orderId, account, orderType(uint8), ticketId, price,
    //           amount, filledAmount, status(uint8), createdAt, expiry, orderHash, signature
    const result = await this.call("Exchange", "getOrder", [orderId], [
      "tuple(uint256,address,uint8,uint256,uint256,uint256,uint256,uint8,uint256,uint256,bytes32,bytes)",
    ]);
    // 后端返回 [[field0, field1, ...]]，取第一个元素（tuple 展开为数组）
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0];
    }
    return Array.isArray(result) ? result : [];
  }

  async getAccountOrders(account: string): Promise<number[]> {
    const result = await this.call("Exchange", "getAccountOrders", [account], ["uint256[]"]);
    // 后端返回的 output 对于数组类型是 [["1", "2", "3"]]，需要取 [0]
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0].map((id: any) => Number(id));
    }
    return [];
  }

  // ==================== Exchange 新增方法 ====================

  /**
   * 获取活跃订单
   */
  async getActiveOrders(ticketId: number, orderType: number, limit: number): Promise<any[]> {
    const result = await this.call("Exchange", "getActiveOrders", [ticketId, orderType, limit], [
      "tuple(uint256,address,uint8,uint256,uint256,uint256,uint256,uint8,uint256,uint256,bytes32,bytes)[]"
    ]);
    // 返回结构体数组，后端返回 [[struct1, struct2, ...]]
    return (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : [];
  }

  /**
   * 获取最佳买卖价
   */
  async getBestPrices(ticketId: number): Promise<{
    bestBuyPrice: string;
    bestSellPrice: string;
    hasBuy: boolean;
    hasSell: boolean;
  }> {
    const result = await this.call("Exchange", "getBestPrices", [ticketId], [
      "uint256", "uint256", "bool", "bool"
    ]);
    return {
      bestBuyPrice: result[0]?.toString() || "0",
      bestSellPrice: result[1]?.toString() || "0",
      hasBuy: !!result[2],
      hasSell: !!result[3]
    };
  }

  /**
   * 获取市场深度
   */
  async getMarketDepth(ticketId: number, levels: number): Promise<{
    buyPrices: string[];
    buyAmounts: string[];
    sellPrices: string[];
    sellAmounts: string[];
  }> {
    const result = await this.call("Exchange", "getMarketDepth", [ticketId, levels], [
      "uint256[]", "uint256[]", "uint256[]", "uint256[]"
    ]);
    // 返回 4 个数组，后端返回 [[arr1], [arr2], [arr3], [arr4]]
    return {
      buyPrices: (Array.isArray(result[0]) ? result[0] : []).map((p: any) => p.toString()),
      buyAmounts: (Array.isArray(result[1]) ? result[1] : []).map((a: any) => a.toString()),
      sellPrices: (Array.isArray(result[2]) ? result[2] : []).map((p: any) => p.toString()),
      sellAmounts: (Array.isArray(result[3]) ? result[3] : []).map((a: any) => a.toString())
    };
  }

  /**
   * 获取账户活跃订单
   */
  async getAccountActiveOrders(account: string): Promise<any[]> {
    const result = await this.call("Exchange", "getAccountActiveOrders", [account], [
      "tuple(uint256,address,uint8,uint256,uint256,uint256,uint256,uint8,uint256,uint256,bytes32,bytes)[]"
    ]);
    // 返回结构体数组，后端返回 [[struct1, struct2, ...]]
    return (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : [];
  }

  /**
   * 获取账户成交历史
   */
  async getAccountTrades(account: string, limit: number): Promise<any[]> {
    const result = await this.call("Exchange", "getAccountTrades", [account, limit], [
      "tuple(uint256,uint256,uint256,address,address,uint256,uint256,uint256,uint256,uint256,bytes32)[]"
    ]);
    // 返回结构体数组，后端返回 [[struct1, struct2, ...]]
    return (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : [];
  }

  /**
   * 获取订单统计
   */
  async getOrderStats(ticketId: number): Promise<{
    totalOrders: number;
    activeOrders: number;
    totalTrades: number;
    totalVolume: string;
  }> {
    const result = await this.call("Exchange", "getOrderStats", [ticketId], [
      "uint256", "uint256", "uint256", "uint256"
    ]);
    return {
      totalOrders: Number(result[0] || 0),
      activeOrders: Number(result[1] || 0),
      totalTrades: Number(result[2] || 0),
      totalVolume: result[3]?.toString() || "0"
    };
  }

  /**
   * 获取可撮合的订单对
   */
  async getMatchableOrders(ticketId: number, maxPairs: number): Promise<{
    buyOrderIds: string[];
    sellOrderIds: string[];
    amounts: string[];
  }> {
    const result = await this.call("Exchange", "getMatchableOrders", [ticketId, maxPairs], [
      "uint256[]", "uint256[]", "uint256[]"
    ]);
    // 返回 3 个数组，后端返回 [[arr1], [arr2], [arr3]]
    return {
      buyOrderIds: (Array.isArray(result[0]) ? result[0] : []).map((id: any) => id.toString()),
      sellOrderIds: (Array.isArray(result[1]) ? result[1] : []).map((id: any) => id.toString()),
      amounts: (Array.isArray(result[2]) ? result[2] : []).map((a: any) => a.toString())
    };
  }

  /**
   * 批量自动撮合
   */
  async batchAutoMatch(ticketId: number, maxMatches: number, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("Exchange", "batchAutoMatch", [ticketId, maxMatches], signerAddress);
  }

  /**
   * 取消订单（使用 signerAddress）
   */
  async cancelOrderWithSigner(orderId: number, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("Exchange", "cancelOrder", [orderId], signerAddress);
  }

  // ==================== Ticket 新增授权方法 ====================

  /**
   * 授权门票转移
   */
  async approveTicket(spender: string, ticketId: number, amount: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("Ticket", "approve", [spender, ticketId, amount], signerAddress);
  }

  /**
   * 获取门票授权额度
   */
  async getTicketAllowance(owner: string, spender: string, ticketId: number): Promise<string> {
    const result = await this.call("Ticket", "allowance", [owner, spender, ticketId], ["uint256"]);
    return result[0]?.toString() || "0";
  }

  /**
   * 增加门票授权额度
   */
  async increaseTicketAllowance(spender: string, ticketId: number, addedValue: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("Ticket", "increaseAllowance", [spender, ticketId, addedValue], signerAddress);
  }

  /**
   * 减少门票授权额度
   */
  async decreaseTicketAllowance(spender: string, ticketId: number, subtractedValue: string, signerAddress: string): Promise<string> {
    return await this.sendWithSigner("Ticket", "decreaseAllowance", [spender, ticketId, subtractedValue], signerAddress);
  }
}

export const contractService = new ContractService();
export default contractService;
