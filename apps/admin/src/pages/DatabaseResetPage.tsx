import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Badge,
  Banner,
  Modal,
  Divider,
  Toast,
  ProgressBar,
  InlineGrid,
} from '@shopify/polaris';
import {
  RefreshIcon,
  DeleteIcon,
  DatabaseIcon,
  AlertCircleIcon,
  ArchiveIcon,
  ReceiptIcon,
  ProductIcon,
  CashDollarIcon,
  CartIcon,
  LockIcon,
} from '@shopify/polaris-icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_DATABASE_STATS,
  GET_ANALYTICS_SECURITY,
  RESET_ORDERS,
  RESET_EXPENSES,
  RESET_PRE_ORDERS,
  RESET_INVENTORY_ADJUSTMENTS,
  RESET_INVENTORY_STOCK_TO_DEFAULT,
  RESYNC_DATABASE_FROM_REMOTE,
  WIPE_ALL_TRANSACTIONAL_DATA,
} from '../graphql/queries';

interface ResetTarget {
  id: string;
  title: string;
  badge: string;
  badgeTone?: 'attention' | 'critical' | 'info' | 'success' | 'warning';
  icon: any;
  iconBg: string;
  iconColor: string;
  description: string;
  currentCount: string | number;
  unit: string;
  consequences: string[];
  safeEntities: string[];
  buttonLabel: string;
  confirmActionLabel: string;
  confirmTone?: 'critical' | 'primary';
  buttonVariant?: 'primary' | 'secondary' | 'plain';
  mutation: () => Promise<any>;
}

export const DatabaseResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const passParam = searchParams.get('pass');

  const { data: secData } = useQuery(GET_ANALYTICS_SECURITY, {
    fetchPolicy: 'cache-and-network',
  });
  const targetPassword = secData?.analyticsSecurityPassword || 'Frozed2026';

  // Authorized only when ?pass=Frozed2026 (or matches current security password)
  const isAuthorized =
    Boolean(passParam) && (passParam === 'Frozed2026' || passParam === targetPassword);

  // Database live stats query (only runs when authorized)
  const {
    data,
    loading: statsLoading,
    refetch,
  } = useQuery(GET_DATABASE_STATS, {
    fetchPolicy: 'network-only',
    skip: !isAuthorized,
  });

  const stats = data?.databaseStats || {
    ordersCount: 0,
    orderItemsCount: 0,
    billsCount: 0,
    expensesCount: 0,
    preOrdersCount: 0,
    inventoryAdjustmentsCount: 0,
    inventoryItemsCount: 0,
    menuItemsCount: 0,
    categoriesCount: 0,
    recipesCount: 0,
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);

  // Confirmation Modal state
  const [activeTarget, setActiveTarget] = useState<ResetTarget | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mutations
  const [resetOrders] = useMutation(RESET_ORDERS);
  const [resetExpenses] = useMutation(RESET_EXPENSES);
  const [resetPreOrders] = useMutation(RESET_PRE_ORDERS);
  const [resetAdjustments] = useMutation(RESET_INVENTORY_ADJUSTMENTS);
  const [resetStock] = useMutation(RESET_INVENTORY_STOCK_TO_DEFAULT);
  const [resyncRemote] = useMutation(RESYNC_DATABASE_FROM_REMOTE);
  const [wipeAllTransactions] = useMutation(WIPE_ALL_TRANSACTIONAL_DATA);

  // Transactional resets
  const transactionalResets: ResetTarget[] = [
    {
      id: 'orders',
      title: 'Customer Orders & Billing Data',
      badge: 'Sales History',
      badgeTone: 'critical',
      icon: ReceiptIcon,
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      description:
        'Truncates all completed and active customer orders, line item snapshots, and generated invoice bills. Resets the order counter to #1.',
      currentCount: stats.ordersCount,
      unit: 'Orders',
      consequences: [
        `Permanently deletes ${stats.ordersCount} orders and ${stats.orderItemsCount} line items`,
        `Deletes ${stats.billsCount} generated receipt bills`,
        'Resets the order sequence numbering back to #1',
      ],
      safeEntities: [
        'Menu items, prices, and categories are completely untouched',
        'Physical inventory stock quantities remain safe',
        'Recipes and ingredient mappings are not altered',
      ],
      buttonLabel: 'Reset Orders',
      confirmActionLabel: 'Reset All Orders & Bills',
      confirmTone: 'critical',
      buttonVariant: 'primary',
      mutation: async () => {
        const res = await resetOrders();
        return res.data?.resetOrders;
      },
    },
    {
      id: 'expenses',
      title: 'Shop Operating Expenses',
      badge: 'Expense Logs',
      badgeTone: 'warning',
      icon: CashDollarIcon,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      description:
        'Clears all recorded recurring and ad-hoc shop operating expenses (Rent, Electricity, Supplies, Salaries) across all dates.',
      currentCount: stats.expensesCount,
      unit: 'Expense Records',
      consequences: [
        `Deletes all ${stats.expensesCount} recorded shop expenses`,
        'Resets expense analytics calculations in the dashboard to zero',
      ],
      safeEntities: [
        'Orders, menu items, and inventory are untouched',
        'Cost formulations remain intact',
      ],
      buttonLabel: 'Clear Expenses',
      confirmActionLabel: 'Clear All Expenses',
      confirmTone: 'critical',
      buttonVariant: 'secondary',
      mutation: async () => {
        const res = await resetExpenses();
        return res.data?.resetExpenses;
      },
    },
    {
      id: 'preOrders',
      title: 'Online Pre-Orders & Draft Carts',
      badge: 'Draft Orders',
      badgeTone: 'attention',
      icon: CartIcon,
      iconBg: '#FEF3C7',
      iconColor: '#B45309',
      description:
        'Wipes all pending online customer pre-orders, test submissions, and draft customer carts in the queue.',
      currentCount: stats.preOrdersCount,
      unit: 'Pre-Orders',
      consequences: [
        `Deletes ${stats.preOrdersCount} pending online customer pre-orders`,
        'Clears all draft carts waiting in the queue',
      ],
      safeEntities: [
        'Completed in-store orders remain unaffected',
        'Menu catalog and ingredient stock remain safe',
      ],
      buttonLabel: 'Clear Pre-Orders',
      confirmActionLabel: 'Clear Pre-Orders',
      confirmTone: 'critical',
      buttonVariant: 'secondary',
      mutation: async () => {
        const res = await resetPreOrders();
        return res.data?.resetPreOrders;
      },
    },
    {
      id: 'adjustments',
      title: 'Stock Adjustment Audit History',
      badge: 'Audit Trail',
      badgeTone: 'info',
      icon: ArchiveIcon,
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      description:
        'Clears the log history of manual stock adjustments, restock events, and wastage tracking. Current physical stock levels are preserved.',
      currentCount: stats.inventoryAdjustmentsCount,
      unit: 'Audit Logs',
      consequences: [
        `Deletes ${stats.inventoryAdjustmentsCount} historical adjustment audit records`,
        'Adjustment history tab in Inventory will start fresh',
      ],
      safeEntities: [
        'Current inventory stock numbers are NOT altered',
        'Ingredients, units, and reorder levels stay intact',
      ],
      buttonLabel: 'Clear Logs',
      confirmActionLabel: 'Clear Adjustment Logs',
      confirmTone: 'critical',
      buttonVariant: 'secondary',
      mutation: async () => {
        const res = await resetAdjustments();
        return res.data?.resetInventoryAdjustments;
      },
    },
  ];

  // Inventory & Catalog resets
  const catalogResets: ResetTarget[] = [
    {
      id: 'inventoryStock',
      title: 'Reset Inventory Stock to Baseline Defaults',
      badge: 'Stock Levels',
      badgeTone: 'success',
      icon: ProductIcon,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      description:
        'Restores current stock quantities for all 24 inventory ingredients (Mango pulp, Sitaphal pulp, Milk, Sugar, Straws, etc.) back to standard factory baseline quantities.',
      currentCount: stats.inventoryItemsCount,
      unit: 'Ingredients',
      consequences: [
        'Overwrites current on-hand stock quantities for all 24 items with baseline values',
        'Clears stock depletion caused by test orders',
      ],
      safeEntities: [
        'Item names, units, and unit costs are preserved',
        'Recipe associations are untouched',
      ],
      buttonLabel: 'Restore Stock',
      confirmActionLabel: 'Restore Default Stock Quantities',
      confirmTone: 'primary',
      buttonVariant: 'secondary',
      mutation: async () => {
        const res = await resetStock();
        return res.data?.resetInventoryStockToDefault;
      },
    },
    {
      id: 'resyncRemote',
      title: 'Re-sync Entire Database from Remote Neon DB',
      badge: 'Full Seed & Sync',
      badgeTone: 'info',
      icon: RefreshIcon,
      iconBg: '#F3E8FF',
      iconColor: '#7E22CE',
      description:
        'Re-fetches fresh menu items, categories, ingredients, recipes, making costs, and security credentials from the remote database into your local PostgreSQL instance.',
      currentCount: `${stats.menuItemsCount} items / ${stats.recipesCount} recipes`,
      unit: 'Catalog Items',
      consequences: [
        'Re-seeds all 21 menu items and 93 recipe formulations from remote',
        'Re-seeds all 24 inventory ingredients and 2 categories',
        'Wipes local test orders to maintain strict referential integrity',
      ],
      safeEntities: ['Guarantees 100% exact parity with the production/remote database'],
      buttonLabel: 'Re-sync Data',
      confirmActionLabel: 'Re-sync Everything from Remote',
      confirmTone: 'primary',
      buttonVariant: 'primary',
      mutation: async () => {
        const res = await resyncRemote();
        return res.data?.resyncDatabaseFromRemote;
      },
    },
  ];

  // Danger zone reset
  const dangerReset: ResetTarget = {
    id: 'wipeAll',
    title: 'Wipe All Transactional Data (Fresh Start)',
    badge: 'Clean Slate',
    badgeTone: 'critical',
    icon: DeleteIcon,
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    description:
      'One-click reset of ALL operational transactions: Orders, Order Items, Bills, Pre-Orders, Shop Expenses, and Adjustment history. Catalog and inventory items remain intact.',
    currentCount: stats.ordersCount + stats.expensesCount + stats.preOrdersCount,
    unit: 'Total Transactions',
    consequences: [
      `Deletes all ${stats.ordersCount} orders and ${stats.billsCount} bills`,
      `Deletes all ${stats.expensesCount} shop expenses`,
      `Deletes all ${stats.preOrdersCount} customer pre-orders`,
      `Deletes all ${stats.inventoryAdjustmentsCount} adjustment logs`,
      'Resets all autoincrement sequence numbers to #1',
    ],
    safeEntities: [
      'All 21 Menu Items and 2 Categories remain intact',
      'All 24 Inventory ingredients and 93 recipes remain untouched',
      'User accounts and security credentials are safe',
    ],
    buttonLabel: 'Wipe All Data',
    confirmActionLabel: 'Wipe All Transactional Data',
    confirmTone: 'critical',
    buttonVariant: 'primary',
    mutation: async () => {
      const res = await wipeAllTransactions();
      return res.data?.wipeAllTransactionalData;
    },
  };

  const handleExecuteReset = async () => {
    if (!activeTarget) return;
    setIsProcessing(true);
    try {
      const result = await activeTarget.mutation();
      await refetch();
      setToastMessage(result?.message || `Successfully reset ${activeTarget.title}!`);
      setToastError(false);
      setActiveTarget(null);
    } catch (err: any) {
      setToastMessage(err.message || `Failed to reset ${activeTarget.title}`);
      setToastError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render individual reset item row
  const renderResetRow = (target: ResetTarget, isLast = false) => {
    const IconComponent = target.icon;
    return (
      <React.Fragment key={target.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            gap: '16px',
          }}
        >
          {/* Left: Icon + Title + Description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                borderRadius: '10px',
                background: target.iconBg,
                color: target.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComponent width={20} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Text as="span" variant="headingSm" fontWeight="semibold">
                  {target.title}
                </Text>
                <Badge tone={target.badgeTone}>{target.badge}</Badge>
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                {target.description}
              </Text>
            </div>
          </div>

          {/* Right: Record Counter + Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
            <div style={{ textAlign: 'right', minWidth: '90px' }}>
              <Text as="p" variant="headingSm" fontWeight="bold">
                {target.currentCount}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                {target.unit}
              </Text>
            </div>

            <Button
              tone={target.confirmTone === 'critical' ? 'critical' : undefined}
              variant={target.buttonVariant || 'secondary'}
              onClick={() => setActiveTarget(target)}
            >
              {target.buttonLabel}
            </Button>
          </div>
        </div>
        {!isLast && <Divider />}
      </React.Fragment>
    );
  };

  // ─── If not authorized via ?pass=Frozed2026 ──────────────────────────────────
  if (!isAuthorized) {
    return (
      <Page title="Access Restricted">
        <Layout>
          <Layout.Section>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '380px',
                padding: '40px 0',
              }}
            >
              <div style={{ width: '100%', maxWidth: '460px' }}>
                <Card padding="600">
                  <BlockStack gap="400" align="center">
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: '#FEE2E2',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                      }}
                    >
                      <LockIcon width={28} />
                    </div>

                    <BlockStack gap="100" align="center">
                      <Text as="h2" variant="headingMd" fontWeight="bold">
                        Database Utilities Restricted
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        This database management utility is hidden and requires the authorization
                        parameter:
                      </Text>
                      <div
                        style={{
                          background: '#F1F5F9',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          marginTop: '6px',
                        }}
                      >
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          <code>pass=Frozed2026</code>
                        </Text>
                      </div>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // ─── Main Authorized Page (?pass=Frozed2026) ───────────────────────────────────
  return (
    <Page
      title="Database Management & Reset"
      subtitle="Inspect live local PostgreSQL records and execute granular entity resets with safety confirmations."
      primaryAction={{
        content: 'Refresh Statistics',
        icon: RefreshIcon,
        loading: statsLoading,
        onAction: () => refetch(),
      }}
    >
      <Layout>
        {/* Top Connection Banner */}
        <Layout.Section>
          <Banner title="Connected to Local PostgreSQL: frozed_local" tone="info">
            <Text as="p" variant="bodyMd">
              Active database: <code>localhost:5433 / frozed_local</code>. Use the actions below to
              clear mock transactions, restore stock defaults, or re-sync with remote data.
            </Text>
          </Banner>
        </Layout.Section>

        {/* Live Metrics Overview Grid */}
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <DatabaseIcon width={20} />
                  <Text as="h2" variant="headingSm" fontWeight="bold">
                    Live Record Counts
                  </Text>
                </InlineStack>
                <Badge tone="success">PostgreSQL 17 Live</Badge>
              </InlineStack>

              <Divider />

              <InlineGrid columns={{ xs: 2, sm: 3, md: 5 }} gap="300">
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                    Orders & Bills
                  </Text>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {stats.ordersCount}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    {stats.orderItemsCount} items · {stats.billsCount} bills
                  </Text>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                    Shop Expenses
                  </Text>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {stats.expensesCount}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Operating records
                  </Text>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                    Online Pre-Orders
                  </Text>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {stats.preOrdersCount}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Pending drafts
                  </Text>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                    Inventory Stock
                  </Text>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {stats.inventoryItemsCount}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    {stats.inventoryAdjustmentsCount} adjustment logs
                  </Text>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                    Menu & Recipes
                  </Text>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {stats.menuItemsCount}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    {stats.recipesCount} recipes · {stats.categoriesCount} cats
                  </Text>
                </div>
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Section 1: Transactional & Activity Data Resets */}
        <Layout.Section>
          <Card padding="0">
            <div
              style={{
                padding: '16px 20px',
                background: '#FAFAFA',
                borderBottom: '1px solid #E5E5E5',
              }}
            >
              <Text as="h3" variant="headingSm" fontWeight="bold">
                Transactional & Activity Data
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Selectively wipe customer orders, sales history, expense logs, and draft submissions
                without altering menu items or recipe definitions.
              </Text>
            </div>
            {transactionalResets.map((target, idx) =>
              renderResetRow(target, idx === transactionalResets.length - 1),
            )}
          </Card>
        </Layout.Section>

        {/* Section 2: Inventory & Catalog Management */}
        <Layout.Section>
          <Card padding="0">
            <div
              style={{
                padding: '16px 20px',
                background: '#FAFAFA',
                borderBottom: '1px solid #E5E5E5',
              }}
            >
              <Text as="h3" variant="headingSm" fontWeight="bold">
                Inventory & Catalog Utilities
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Restore inventory ingredient quantities to baseline defaults or pull the complete
                live menu and recipe formulations from the remote Neon database.
              </Text>
            </div>
            {catalogResets.map((target, idx) =>
              renderResetRow(target, idx === catalogResets.length - 1),
            )}
          </Card>
        </Layout.Section>

        {/* Section 3: Danger Zone / Clean Slate */}
        <Layout.Section>
          <div style={{ borderRadius: '12px', border: '1px solid #FCA5A5', overflow: 'hidden' }}>
            <Card padding="0">
              <div
                style={{
                  padding: '16px 20px',
                  background: '#FEF2F2',
                  borderBottom: '1px solid #FCA5A5',
                }}
              >
                <InlineStack gap="150" blockAlign="center">
                  <AlertCircleIcon width={16} />
                  <Text as="h3" variant="headingSm" fontWeight="bold" tone="critical">
                    Danger Zone: Full Transaction Clean Slate
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodyXs" tone="subdued">
                  One-click wipe of all orders, bills, expenses, pre-orders, and adjustment audit
                  logs in a single batch.
                </Text>
              </div>
              {renderResetRow(dangerReset, true)}
            </Card>
          </div>
        </Layout.Section>
      </Layout>

      {/* Confirmation Modal */}
      {activeTarget && (
        <Modal
          open={Boolean(activeTarget)}
          onClose={() => {
            if (!isProcessing) setActiveTarget(null);
          }}
          title={`Confirm Reset: ${activeTarget.title}`}
          primaryAction={{
            content: isProcessing ? 'Processing...' : activeTarget.confirmActionLabel,
            destructive: activeTarget.confirmTone === 'critical',
            loading: isProcessing,
            onAction: handleExecuteReset,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              disabled: isProcessing,
              onAction: () => setActiveTarget(null),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              {isProcessing && (
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Executing reset on local database...
                  </Text>
                  <ProgressBar progress={75} size="small" />
                </BlockStack>
              )}

              <Banner
                title={
                  activeTarget.confirmTone === 'critical'
                    ? 'Caution: Irreversible Local Database Action'
                    : 'Notice: Synchronizing Database Content'
                }
                tone={activeTarget.confirmTone === 'critical' ? 'critical' : 'warning'}
              >
                <Text as="p" variant="bodyMd">
                  You are about to execute a reset on <strong>{activeTarget.title}</strong> in your
                  local <code>frozed_local</code> database.
                </Text>
              </Banner>

              {/* What will happen */}
              <div
                style={{
                  background: '#F8FAFC',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <BlockStack gap="150">
                  <Text as="h4" variant="headingSm" fontWeight="bold">
                    What will happen:
                  </Text>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {activeTarget.consequences.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <Text as="span" variant="bodySm">
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </div>

              {/* What remains safe */}
              <div
                style={{
                  background: '#F0FDF4',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #BBF7D0',
                }}
              >
                <BlockStack gap="150">
                  <Text as="h4" variant="headingSm" fontWeight="bold" tone="success">
                    What remains safe & protected:
                  </Text>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {activeTarget.safeEntities.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <Toast
          content={toastMessage}
          error={toastError}
          onDismiss={() => setToastMessage(null)}
          duration={4000}
        />
      )}
    </Page>
  );
};

export default DatabaseResetPage;
