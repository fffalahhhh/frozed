import React from 'react';
import { Frame, TopBar, Navigation, Box } from '@shopify/polaris';
import { HomeIcon, ProductIcon, InventoryIcon } from '@shopify/polaris-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImage from '@/assets/logo.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuMarkup = (
    <TopBar.UserMenu
      actions={[]}
      name="Admin Manager"
      detail="Frozen Shake HQ"
      initials="FS"
      open={false}
      onToggle={() => {}}
    />
  );

  const topBarMarkup = <TopBar showNavigationToggle userMenu={userMenuMarkup} />;

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            icon: HomeIcon,
            selected: location.pathname === '/' || location.pathname === '/dashboard',
            onClick: () => navigate('/'),
          },
          {
            label: 'Menu Items',
            icon: ProductIcon,
            selected: location.pathname.startsWith('/menu-items'),
            onClick: () => navigate('/menu-items'),
          },
          {
            label: 'Inventory',
            icon: InventoryIcon,
            selected: location.pathname.startsWith('/inventory'),
            onClick: () => navigate('/inventory'),
          },
        ]}
      />
    </Navigation>
  );

  const logo = {
    width: 40,
    topBarSource: logoImage,
    url: '/',
    accessibilityLabel: 'Frozen Shake Admin',
  };

  return (
    <Frame logo={logo} topBar={topBarMarkup} navigation={navigationMarkup}>
      {children}
      <Box padding={'300'} />
    </Frame>
  );
};
