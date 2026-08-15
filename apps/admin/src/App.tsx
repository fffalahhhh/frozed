import React from 'react';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MenuItemsPage } from './pages/MenuItemsPage';
import { InventoryPage } from './pages/InventoryPage';

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <DashboardPage onNavigateToMenuItems={() => navigate('/menu-items')} />;
};

export const App: React.FC = () => {
  return (
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <AdminLayout>
          <Routes>
            <Route path="/" element={<DashboardWrapper />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/menu-items" element={<MenuItemsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="*" element={<DashboardWrapper />} />
          </Routes>
        </AdminLayout>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
