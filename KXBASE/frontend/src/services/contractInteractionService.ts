export interface ContractInteractionRecord {
  mode: "call" | "send";
  contractName?: string;
  contractAddress?: string;
  method: string;
  params: any[];
  output?: any[];
  txHash?: string;
  receipt?: any;
  interaction?: any;
  timestamp: number;
}

type Listener = (record: ContractInteractionRecord) => void;

class ContractInteractionService {
  private listeners: Set<Listener> = new Set();
  private lastRecord: ContractInteractionRecord | null = null;

  publish(record: Omit<ContractInteractionRecord, "timestamp">): void {
    this.lastRecord = {
      ...record,
      timestamp: Date.now(),
    };

    this.listeners.forEach((listener) => {
      listener(this.lastRecord!);
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.lastRecord) {
      listener(this.lastRecord);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getLastRecord(): ContractInteractionRecord | null {
    return this.lastRecord;
  }
}

export const contractInteractionService = new ContractInteractionService();
export default contractInteractionService;
