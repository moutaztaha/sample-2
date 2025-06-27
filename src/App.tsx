import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Inventory from './components/Inventory/Inventory';
import Requisitions from './components/Requisitions/Requisitions';
import PurchaseOrders from './components/PurchaseOrders/PurchaseOrders';
import Production from './components/Production/Production';
import UserManagement from './components/Users/UserManagement';
import MasterDataManagement from './components/MasterData/MasterDataManagement';
import ReportDashboard from './components/Reports/ReportDashboard';
import SettingsPage from './components/Settings/SettingsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SocketProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/requisitions" element={<Requisitions />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/production" element={<Production />} />
            <Route path="/master-data" element={<MasterDataManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/reports" element={<ReportDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </Router>
    </SocketProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;