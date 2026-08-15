import React, { useState, useCallback } from 'react';
import { Frame, TopBar, Navigation, Box } from '@shopify/polaris';
import { HomeIcon, ProductIcon, InventoryIcon, StoreIcon } from '@shopify/polaris-icons';
import logoImage from '@/assets/logo.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePath: 'dashboard' | 'menu-items' | 'inventory';
  onNavigate: (path: 'dashboard' | 'menu-items' | 'inventory') => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activePath, onNavigate }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const toggleUserMenu = useCallback(() => setIsUserMenuOpen((open) => !open), []);

  const userMenuMarkup = (
    <TopBar.UserMenu
      actions={[
        {
          items: [{ content: 'Back to Store', icon: StoreIcon }],
        },
      ]}
      name="Admin Manager"
      detail="Frozen Shake HQ"
      initials="FS"
      open={isUserMenuOpen}
      onToggle={toggleUserMenu}
    />
  );

  const topBarMarkup = <TopBar showNavigationToggle userMenu={userMenuMarkup} />;

  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            icon: HomeIcon,
            selected: activePath === 'dashboard',
            onClick: () => onNavigate('dashboard'),
          },
          {
            label: 'Menu Items',
            icon: ProductIcon,
            selected: activePath === 'menu-items',
            onClick: () => onNavigate('menu-items'),
          },
          {
            label: 'Inventory',
            icon: InventoryIcon,
            selected: activePath === 'inventory',
            onClick: () => onNavigate('inventory'),
          },
        ]}
      />
    </Navigation>
  );

  const logo = {
    width: 40,
    topBarSource: logoImage,
    url: '#',
    accessibilityLabel: 'Frozen Shake Admin',
  };

  return (
    <Frame logo={logo} topBar={topBarMarkup} navigation={navigationMarkup}>
      {children}
      <Box padding={'300'} />
    </Frame>
  );
};
