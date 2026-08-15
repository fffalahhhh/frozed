import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import type { MenuWithCategories, MenuItem, MenuItemFlavour } from '@frozen-shake/shared';
import { GET_MENU, GET_PRE_ORDERS, DELETE_PRE_ORDER } from '../graphql/queries';
import { POSToastProvider, usePOSToast } from '../components/pos/POSToast';
import { POSCartProvider, usePOSCart } from '../components/pos/POSCartContext';
import { POSHeader } from '../components/pos/POSHeader';
import { POSCategoryBar } from '../components/pos/POSCategoryBar';
import { POSMenuItemCard } from '../components/pos/POSMenuItemCard';
import { POSCartPanel } from '../components/pos/POSCartPanel';
import { POSPreOrdersDrawer } from '../components/pos/POSPreOrdersDrawer';
import { FlavourSelectModal } from '../components/pos/FlavourSelectModal';
import '../styles/pos.css';

const POSContent: React.FC = () => {
  const { showToast } = usePOSToast();
  const {
    items: cartItems,
    addItem,
    clearCart,
    setCustomerName,
    setCustomerPhone,
    setPaymentMethod,
  } = usePOSCart();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [showPreOrdersDrawer, setShowPreOrdersDrawer] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [flavourModalItem, setFlavourModalItem] = useState<MenuItem | null>(null);

  // 1. Query Menu Data
  const {
    data: menuQueryResult,
    loading: isLoadingMenu,
    refetch: refetchMenu,
  } = useQuery(GET_MENU, {
    fetchPolicy: 'cache-and-network',
  });

  const menuData: MenuWithCategories[] = menuQueryResult?.menu || [];

  // 2. Query Pending Pre-Orders (Polled)
  const { data: preOrdersQueryResult, refetch: refetchPreOrders } = useQuery(GET_PRE_ORDERS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 6000,
  });

  const preOrdersData = preOrdersQueryResult?.preOrders || [];
  const pendingPreOrdersCount = Array.isArray(preOrdersData) ? preOrdersData.length : 0;

  // 3. Delete Pre-Order Mutation
  const [deletePreOrderMutation] = useMutation(DELETE_PRE_ORDER, {
    refetchQueries: [{ query: GET_PRE_ORDERS }],
  });

  // Calculate All Items & Filtered Items
  const allItems: MenuItem[] = useMemo(() => {
    if (!menuData) return [];
    return menuData.flatMap((section) => section.items);
  }, [menuData]);

  const filteredItems: MenuItem[] = useMemo(() => {
    if (activeCategoryId !== 'ALL') {
      const activeSection = menuData.find((s) => s.category.id === activeCategoryId);
      return activeSection?.items ?? [];
    }
    return allItems;
  }, [menuData, activeCategoryId, allItems]);

  // Handle Add Item to Cart
  const handleAddItem = (item: MenuItem, flavour?: MenuItemFlavour | null) => {
    const maxAvailable = item.maxAvailable ?? 999;
    const currentQtyInCart = cartItems
      .filter((ci) => ci.menuItemId === item.id)
      .reduce((s, ci) => s + ci.quantity, 0);

    if (currentQtyInCart >= maxAvailable) {
      showToast(`Max stock portion limit reached for "${item.name}"`, 'error');
      return;
    }

    const extraCost = flavour ? parseFloat(flavour.extraCost || '0') : 0;
    const unitPrice = parseFloat(item.sellingPrice) + extraCost;

    addItem(
      {
        menuItemId: item.id,
        menuItemName: item.name,
        imageUrl: item.imageUrl,
        flavourId: flavour ? flavour.flavourId : null,
        flavourName: flavour ? flavour.flavourName : null,
        quantity: 1,
        unitPrice,
        notes: null,
      },
      maxAvailable,
    );
  };

  // Handle Manual Menu Refresh
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([refetchMenu(), refetchPreOrders()]);
      showToast('Menu & orders updated!', 'success');
    } catch (err: any) {
      showToast('Failed to refresh menu', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Process Pre-Order: Loads pre-order into cart & deletes pending pre-order
  const handleProcessPreOrder = async (preOrder: any) => {
    if (!preOrder) return;
    clearCart();
    setCustomerName(preOrder.customerName || '');
    setCustomerPhone(preOrder.customerPhone || '');
    setPaymentMethod((preOrder.paymentMethod as any) || 'cash');

    let itemsList: any[] = [];
    if (Array.isArray(preOrder.items)) {
      itemsList = preOrder.items;
    } else if (typeof preOrder.items === 'string') {
      try {
        itemsList = JSON.parse(preOrder.items);
      } catch {
        itemsList = [];
      }
    }

    for (const item of itemsList) {
      addItem({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        imageUrl: item.imageUrl || null,
        flavourId: item.flavourId || null,
        flavourName: item.flavourName || null,
        quantity: item.quantity || 1,
        unitPrice: parseFloat(String(item.unitPrice || 0)),
        notes: item.notes || null,
      });
    }

    showToast('Pre-order loaded into Cart!', 'success');

    try {
      if (preOrder.id && !String(preOrder.id).startsWith('temp-')) {
        await deletePreOrderMutation({
          variables: { id: preOrder.id },
          update(cache) {
            cache.evict({ id: cache.identify({ id: preOrder.id, __typename: 'PreOrder' }) });
            cache.gc();
          },
        });
      }
    } catch (err: any) {
      console.warn('[POS] Process PreOrder delete error:', err?.message);
    }
  };

  return (
    <div className="pos-app-root">
      {/* 1. Top Header */}
      <POSHeader
        pendingPreOrdersCount={pendingPreOrdersCount}
        showPreOrdersDrawer={showPreOrdersDrawer}
        onTogglePreOrdersDrawer={() => setShowPreOrdersDrawer((v) => !v)}
        onRefreshMenu={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Main Fullscreen Split View */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column: Category Bar + Menu Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <POSCategoryBar
            menuData={menuData}
            totalItemCount={allItems.length}
            activeCategoryId={activeCategoryId}
            onSelectCategory={setActiveCategoryId}
          />

          {/* Menu Grid Container */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingMenu && allItems.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  color: 'var(--pos-text-muted)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--pos-surface-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: '12px',
                  }}
                  className="pos-spinning"
                >
                  🥤
                </div>
                <p style={{ fontWeight: 600, fontSize: '15px' }}>Loading Menu...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  color: 'var(--pos-text-muted)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--pos-surface-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    marginBottom: '12px',
                  }}
                >
                  🔍
                </div>
                <h3
                  style={{ margin: '0 0 4px', color: 'var(--pos-text-primary)', fontSize: '16px' }}
                >
                  No items found
                </h3>
                <p style={{ margin: 0, fontSize: '13px' }}>No items in this category</p>
              </div>
            ) : (
              <div className="pos-menu-grid">
                {filteredItems.map((item) => {
                  const currentQtyInCart = cartItems
                    .filter((ci) => ci.menuItemId === item.id)
                    .reduce((s, ci) => s + ci.quantity, 0);

                  return (
                    <POSMenuItemCard
                      key={item.id}
                      item={item}
                      cartQuantity={currentQtyInCart}
                      onAdd={(it) => handleAddItem(it)}
                      onOpenFlavourModal={(it) => setFlavourModalItem(it)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Collapsible Pre-Orders Drawer */}
        {showPreOrdersDrawer && pendingPreOrdersCount > 0 && (
          <POSPreOrdersDrawer
            preOrders={preOrdersData}
            onProcessPreOrder={handleProcessPreOrder}
            onClose={() => setShowPreOrdersDrawer(false)}
          />
        )}

        {/* Right Column: Persistent Cart Panel */}
        <POSCartPanel menuData={menuData} />
      </div>

      {/* Flavour Selector Modal */}
      {flavourModalItem && (
        <FlavourSelectModal
          item={flavourModalItem}
          onClose={() => setFlavourModalItem(null)}
          onSelectFlavour={(item, flavour) => {
            handleAddItem(item, flavour);
            setFlavourModalItem(null);
          }}
        />
      )}
    </div>
  );
};

export const POSPage: React.FC = () => {
  return (
    <POSToastProvider>
      <POSCartProvider>
        <POSContent />
      </POSCartProvider>
    </POSToastProvider>
  );
};

export default POSPage;
