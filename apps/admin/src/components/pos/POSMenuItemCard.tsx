import React, { useState } from 'react';
import type { MenuItem } from '@frozen-shake/shared';
import { fmt, getItemImageUrl, DEFAULT_DRINK_IMAGES } from './posConstants';
import { triggerPOSToast } from './POSToast';

interface POSMenuItemCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAdd: (item: MenuItem) => void;
  onOpenFlavourModal: (item: MenuItem) => void;
}

export const POSMenuItemCard: React.FC<POSMenuItemCardProps> = ({
  item,
  cartQuantity,
  onAdd,
  onOpenFlavourModal,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(getItemImageUrl(item));

  const maxAvail = item.maxAvailable ?? 999;
  const remAvail = Math.max(0, maxAvail - cartQuantity);

  const isOutOfStock = !item.isAvailable || maxAvail <= 0;
  const isLimitReached = remAvail <= 0 && !isOutOfStock;

  const handleCardClick = () => {
    if (isOutOfStock) {
      triggerPOSToast(`"${item.name}" is currently out of stock`, 'error');
      return;
    }
    if (isLimitReached) {
      triggerPOSToast(
        `Stock limit reached! Only ${maxAvail} portion${maxAvail > 1 ? 's' : ''} available in inventory.`,
        'warning',
      );
      return;
    }

    if (item.flavours && item.flavours.length > 0) {
      onOpenFlavourModal(item);
    } else {
      onAdd(item);
    }
  };

  return (
    <div
      className={`pos-menu-card ${isOutOfStock ? 'out-of-stock' : ''}`}
      onClick={handleCardClick}
      title={isOutOfStock ? 'Out of stock' : `Add ${item.name} to cart`}
    >
      {/* Image Wrap */}
      <div className="pos-card-image-wrap">
        <img
          src={imgSrc}
          alt={item.name}
          className="pos-card-img"
          onError={() => setImgSrc(DEFAULT_DRINK_IMAGES.default)}
        />

        {/* Stock Status Badges */}
        {isOutOfStock ? (
          <div className="pos-card-badge out-of-stock">Out of Stock</div>
        ) : isLimitReached ? (
          <div className="pos-card-badge limit-reached">
            {cartQuantity}/{maxAvail} in Cart
          </div>
        ) : maxAvail <= 20 ? (
          <div className="pos-card-badge stock-left">{remAvail} left</div>
        ) : null}
      </div>

      {/* Item Info & Quick Add Button */}
      <div className="pos-card-info">
        <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
          <h4 className="pos-card-title">{item.name}</h4>
          <div className="pos-card-price">{fmt(item.sellingPrice)}</div>
        </div>

        <button
          className={`pos-card-add-btn ${isOutOfStock ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          disabled={isOutOfStock}
          aria-label={`Add ${item.name}`}
        >
          {isOutOfStock ? (
            <span style={{ fontSize: '12px' }}>✕</span>
          ) : isLimitReached ? (
            <span style={{ fontSize: '12px' }}>🔒</span>
          ) : (
            <span style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>+</span>
          )}
        </button>
      </div>
    </div>
  );
};
