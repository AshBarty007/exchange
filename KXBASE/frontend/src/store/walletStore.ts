import { create } from 'zustand';

export interface BackendWallet {
  address: string;
  name: string;
  role: string;
  publicKey?: string;
}

interface WalletState {
  backendWallets: BackendWallet[];
  currentBackendWallet: BackendWallet | null;

  loadBackendWallets: () => Promise<void>;
  setCurrentBackendWallet: (wallet: BackendWallet | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  backendWallets: [],
  currentBackendWallet: null,

  loadBackendWallets: async () => {
    try {
      const res = await fetch('/api/v1/wallets/list');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const wallets: BackendWallet[] = await res.json();
      set({ backendWallets: wallets });

      const savedAddress = localStorage.getItem('currentBackendWalletAddress');
      let restored = false;

      if (savedAddress) {
        const savedWallet = wallets.find(w => w.address === savedAddress);
        if (savedWallet) {
          set({ currentBackendWallet: savedWallet });
          restored = true;
        }
      }

      if (!restored && wallets.length > 0) {
        set({ currentBackendWallet: wallets[0] });
        localStorage.setItem('currentBackendWalletAddress', wallets[0].address);
      }
    } catch (err) {
      console.error('Failed to load backend wallets:', err);
    }
  },

  setCurrentBackendWallet: (wallet) => {
    set({ currentBackendWallet: wallet });
    if (wallet) {
      localStorage.setItem('currentBackendWalletAddress', wallet.address);
    } else {
      localStorage.removeItem('currentBackendWalletAddress');
    }
  },
}));
