import React from 'react';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MenuItemsPage } from './pages/MenuItemsPage';
import { InventoryPage } from './pages/InventoryPage';
import { POSPage } from './pages/POSPage';

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <DashboardPage onNavigateToMenuItems={() => navigate('/menu-items')} />;
};

export const App: React.FC = () => {
  return (
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <Routes>
          {/* Dedicated Fullscreen POS Terminal View */}
          <Route path="/pos" element={<POSPage />} />

          {/* Standard Admin Management Pages */}
          <Route
            path="/*"
            element={
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<DashboardWrapper />} />
                  <Route path="/dashboard" element={<DashboardWrapper />} />
                  <Route path="/menu-items" element={<MenuItemsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="*" element={<DashboardWrapper />} />
                </Routes>
              </AdminLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
