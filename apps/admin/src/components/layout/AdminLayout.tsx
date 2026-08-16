import React from 'react';
import { Frame, TopBar, Navigation, Box } from '@shopify/polaris';
import { HomeIcon, ProductIcon, InventoryIcon, CashDollarIcon, DatabaseIcon } from '@shopify/polaris-icons';
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

  const secondaryMenuMarkup = (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingRight: '8px' }}>
      <button
        onClick={() => navigate('/pos')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: '#4A2810',
          color: '#FFFFFF',
          border: 'none',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(74, 40, 16, 0.25)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#361908')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#4A2810')}
      >
        <span>⚡</span>
        <span>Open POS</span>
      </button>
    </div>
  );

  const topBarMarkup = (
    <TopBar showNavigationToggle userMenu={userMenuMarkup} secondaryMenu={secondaryMenuMarkup} />
  );

  const searchParams = new URLSearchParams(location.search);
  const passParam = searchParams.get('pass');
  const hasResetAccess = passParam === 'Frozed2026';

  const navItems = [
    {
      label: 'Dashboard',
      icon: HomeIcon,
      selected: location.pathname === '/' || location.pathname === '/dashboard',
      onClick: () => navigate(hasResetAccess ? `/?pass=${passParam}` : '/'),
    },
    {
      label: 'Menu Items',
      icon: ProductIcon,
      selected: location.pathname.startsWith('/menu-items'),
      onClick: () => navigate(hasResetAccess ? `/menu-items?pass=${passParam}` : '/menu-items'),
    },
    {
      label: 'Inventory',
      icon: InventoryIcon,
      selected: location.pathname.startsWith('/inventory'),
      onClick: () => navigate(hasResetAccess ? `/inventory?pass=${passParam}` : '/inventory'),
    },
    ...(hasResetAccess
      ? [
          {
            label: 'Database Reset',
            icon: DatabaseIcon,
            selected: location.pathname === '/database-reset',
            onClick: () => navigate(`/database-reset?pass=${passParam}`),
          },
        ]
      : []),
    {
      label: 'POS Terminal',
      icon: CashDollarIcon,
      selected: location.pathname === '/pos',
      onClick: () => navigate('/pos'),
    },
  ];

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section items={navItems} />
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
