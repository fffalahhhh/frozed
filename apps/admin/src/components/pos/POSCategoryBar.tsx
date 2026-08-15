import React from 'react';
import type { MenuWithCategories } from '@frozen-shake/shared';

interface POSCategoryBarProps {
  menuData: MenuWithCategories[];
  totalItemCount: number;
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const POSCategoryBar: React.FC<POSCategoryBarProps> = ({
  menuData,
  totalItemCount,
  activeCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="pos-category-bar pos-scroll">
      {/* "All" Category Pill */}
      <button
        onClick={() => onSelectCategory('ALL')}
        className={`pos-category-pill ${activeCategoryId === 'ALL' ? 'active' : ''}`}
      >
        <span>🌟 All Items</span>
        <span className="badge">{totalItemCount}</span>
      </button>

      {/* Dynamic Categories from Menu */}
      {menuData.map((group) => {
        const cat = group.category;
        const isActive = activeCategoryId === cat.id;
        const count = group.items.length;
        const needsRestock = group.needsRestock;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`pos-category-pill ${isActive ? 'active' : ''}`}
          >
            <span>
              {cat.icon || '🥤'} {cat.name}
            </span>
            <span className="badge">{count}</span>
            {needsRestock && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--pos-amber)',
                  display: 'inline-block',
                }}
                title="Contains items needing restock"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
