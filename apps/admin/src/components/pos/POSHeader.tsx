import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from '@/assets/logo.png';

interface POSHeaderProps {
  pendingPreOrdersCount: number;
  showPreOrdersDrawer: boolean;
  onTogglePreOrdersDrawer: () => void;
  onRefreshMenu: () => Promise<void>;
  isRefreshing: boolean;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  pendingPreOrdersCount,
  showPreOrdersDrawer,
  onTogglePreOrdersDrawer,
  onRefreshMenu,
  isRefreshing,
}) => {
  const navigate = useNavigate();

  return (
    <header className="pos-header">
      {/* Left: Brand Logo & Title */}
      <div className="pos-brand-pill">
        <img src={logoImage} alt="Frozen Shake" className="pos-brand-logo" />
        <div className="pos-brand-title">Frozen Shake</div>
      </div>

      {/* Right: Pre-orders, Refresh & Go to Admin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Pre-Orders Button */}
        <button
          onClick={onTogglePreOrdersDrawer}
          className={`pos-nav-btn ${showPreOrdersDrawer ? 'primary' : ''}`}
          style={{ position: 'relative' }}
          title="Toggle Pre-orders Drawer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Pre-Orders</span>
          {pendingPreOrdersCount > 0 && (
            <span
              style={{
                background: showPreOrdersDrawer ? '#FFFFFF' : 'var(--pos-amber)',
                color: showPreOrdersDrawer ? 'var(--pos-primary)' : '#FFFFFF',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 7px',
                marginLeft: '2px',
              }}
            >
              {pendingPreOrdersCount}
            </span>
          )}
        </button>

        {/* Refresh Menu Button */}
        <button
          onClick={onRefreshMenu}
          className="pos-nav-btn"
          disabled={isRefreshing}
          title="Sync & Refresh Menu"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isRefreshing ? 'pos-spinning' : ''}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
        </button>

        {/* Go to Admin Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="pos-nav-btn"
          style={{
            background: 'var(--pos-primary)',
            color: '#FFFFFF',
            borderColor: 'var(--pos-primary)',
          }}
          title="Return to Admin Dashboard"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Go to Admin</span>
        </button>
      </div>
    </header>
  );
};
