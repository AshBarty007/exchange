import axios, { AxiosInstance } from "axios";

/**
 * 后端 HTTP 客户端。
 * 所有 API 请求使用绝对路径（如 /api/v1/wallets/list），
 * 由 Vite proxy (dev) 或 Nginx (production) 原样转发到后端。
 */
class BackendClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

export const backendClient = new BackendClient();
export default backendClient;
