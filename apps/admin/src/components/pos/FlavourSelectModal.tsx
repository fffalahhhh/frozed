import React from 'react';
import type { MenuItem, MenuItemFlavour } from '@frozen-shake/shared';
import { fmt, getItemImageUrl } from './posConstants';

interface FlavourSelectModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onSelectFlavour: (item: MenuItem, flavour: MenuItemFlavour | null) => void;
}

export const FlavourSelectModal: React.FC<FlavourSelectModalProps> = ({
  item,
  onClose,
  onSelectFlavour,
}) => {
  if (!item) return null;

  const flavours = item.flavours || [];

  return (
    <div className="pos-modal-backdrop" onClick={onClose}>
      <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--pos-border-subtle)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={getItemImageUrl(item)}
              alt={item.name}
              style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{item.name}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--pos-text-muted)' }}>
                Base Price: {fmt(item.sellingPrice)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--pos-text-muted)',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--pos-text-secondary)',
            marginBottom: '12px',
          }}
        >
          Select Flavour / Customization:
        </p>

        {/* Flavour Options */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {/* Default Option (No extra flavour) */}
          <button
            onClick={() => onSelectFlavour(item, null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '14px',
              border: '1px solid var(--pos-border)',
              background: 'var(--pos-surface-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--pos-text-primary)',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--pos-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--pos-border)')}
          >
            <span>Original / Standard</span>
            <span style={{ color: 'var(--pos-primary)', fontWeight: 700 }}>
              {fmt(item.sellingPrice)}
            </span>
          </button>

          {/* Flavours list */}
          {flavours.map((flavour) => {
            const extraCost = parseFloat(flavour.extraCost || '0');
            const totalItemPrice = parseFloat(item.sellingPrice) + extraCost;

            return (
              <button
                key={flavour.flavourId}
                onClick={() => onSelectFlavour(item, flavour)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--pos-border)',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--pos-text-primary)',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--pos-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--pos-border)')}
              >
                <div>
                  <div>{flavour.flavourName}</div>
                  {extraCost > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--pos-amber)' }}>
                      +{fmt(extraCost)} extra
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--pos-primary)', fontWeight: 700 }}>
                  {fmt(totalItemPrice)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
