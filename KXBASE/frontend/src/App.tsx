import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProviderWrapper } from './theme/ThemeProvider';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import TestEntry from './pages/TestEntry';
import PortalLayout from './components/Layout/PortalLayout';

// Bank portal pages
import { Wallets, FiatMint, Transactions } from './pages/bank';

// Venue portal pages
import { IssueTicket, VerifyTicket } from './pages/venue';

// Exchange portal pages (also used by market-maker & retail)
import { Exchange, Orders, Market, Account } from './pages/exchange';

// Admin portal pages (also used by regulator & platform)
import { Dashboard, Contracts, AccountManagement, RoleManagement, Blockchain, Settings } from './pages/admin';

// Platform portal pages
import { PlatformDashboard } from './pages/platform';

import { useWalletStore } from './store/walletStore';
import './App.css';

import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const App: React.FC = () => {
  const loadBackendWallets = useWalletStore((s) => s.loadBackendWallets);

  useEffect(() => {
    loadBackendWallets();
  }, []);

  const router = createBrowserRouter(
    [
      // Main portal homepage
      { path: '/', element: <HomePage /> },

      // About page
      { path: '/about', element: <AboutPage /> },

      // Test entry (testDoor style)
      { path: '/entry', element: <TestEntry /> },

      // Bank Portal
      {
        path: '/bank',
        element: <PortalLayout portalId="bank" />,
        children: [
          { index: true, element: <Navigate to="wallets" replace /> },
          { path: 'wallets', element: <Wallets /> },
          { path: 'fiat-mint', element: <FiatMint /> },
          { path: 'transactions', element: <Transactions /> },
        ],
      },

      // Market Maker Portal
      {
        path: '/market-maker',
        element: <PortalLayout portalId="market-maker" />,
        children: [
          { index: true, element: <Navigate to="exchange" replace /> },
          { path: 'exchange', element: <Exchange /> },
          { path: 'orders', element: <Orders /> },
          { path: 'account', element: <Account /> },
        ],
      },

      // Venue Portal
      {
        path: '/venue',
        element: <PortalLayout portalId="venue" />,
        children: [
          { index: true, element: <Navigate to="issue-ticket" replace /> },
          { path: 'issue-ticket', element: <IssueTicket /> },
          { path: 'verify-ticket', element: <VerifyTicket /> },
          { path: 'market', element: <Market /> },
        ],
      },

      // Exchange Portal
      {
        path: '/exchange',
        element: <PortalLayout portalId="exchange" />,
        children: [
          { index: true, element: <Navigate to="trading" replace /> },
          { path: 'trading', element: <Exchange /> },
          { path: 'market', element: <Market /> },
          { path: 'orders', element: <Orders /> },
          { path: 'account', element: <Account /> },
        ],
      },

      // Admin Portal
      {
        path: '/admin',
        element: <PortalLayout portalId="admin" />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'contracts', element: <Contracts /> },
          { path: 'account-management', element: <AccountManagement /> },
          { path: 'role-management', element: <RoleManagement /> },
          { path: 'wallets', element: <Wallets /> },
          { path: 'blockchain', element: <Blockchain /> },
          { path: 'settings', element: <Settings /> },
        ],
      },

      // Regulator Portal
      {
        path: '/regulator',
        element: <PortalLayout portalId="regulator" />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'blockchain', element: <Blockchain /> },
          { path: 'transactions', element: <Transactions /> },
          { path: 'account-management', element: <AccountManagement /> },
        ],
      },

      // Retail Portal
      {
        path: '/retail',
        element: <PortalLayout portalId="retail" />,
        children: [
          { index: true, element: <Navigate to="market" replace /> },
          { path: 'market', element: <Market /> },
          { path: 'orders', element: <Orders /> },
          { path: 'account', element: <Account /> },
        ],
      },

      // Platform Management Portal
      {
        path: '/platform',
        element: <PortalLayout portalId="platform" />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <PlatformDashboard /> },
          { path: 'permissions', element: <RoleManagement /> },
          { path: 'config', element: <Settings /> },
          { path: 'monitoring', element: <Dashboard /> },
          { path: 'resources', element: <Blockchain /> },
          { path: 'analytics', element: <Dashboard /> },
        ],
      },

      // Catch-all redirect to home
      { path: '*', element: <Navigate to="/" replace /> },
    ],
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      },
    }
  );

  return (
    <ThemeProviderWrapper>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProviderWrapper>
  );
};

export default App;
