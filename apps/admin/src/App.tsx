import React, { useState } from 'react';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';

import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MenuItemsPage } from './pages/MenuItemsPage';
import { InventoryPage } from './pages/InventoryPage';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<
    'dashboard' | 'menu-items' | 'inventory'
  >('dashboard');

  return (
    <AppProvider i18n={enTranslations}>
      <AdminLayout
        activePath={currentPath}
        onNavigate={(path) => setCurrentPath(path)}
      >
        {currentPath === 'dashboard' && (
          <DashboardPage
            onNavigateToMenuItems={() => setCurrentPath('menu-items')}
          />
        )}
        {currentPath === 'menu-items' && <MenuItemsPage />}
        {currentPath === 'inventory' && <InventoryPage />}
      </AdminLayout>
    </AppProvider>
  );
};

export default App;
