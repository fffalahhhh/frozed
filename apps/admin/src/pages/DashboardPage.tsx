import React, { useState, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
  Badge,
  Banner,
  IndexTable,
  Box,
  Tooltip,
  SkeletonDisplayText,
  Select,
  TextField,
  Button,
  Modal,
} from '@shopify/polaris';
import { RefreshIcon, CheckIcon } from '@shopify/polaris-icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_ANALYTICS_SUMMARY,
  GET_RECENT_ORDERS,
  GET_PERIOD_ORDERS,
  UPDATE_ORDER_STATUS,
} from '../graphql/queries';
import { DateRangeSelector } from '../components/dashboard/DateRangeSelector';

interface DashboardPageProps {
  onNavigateToMenuItems?: () => void;
}

const parseValidDate = (rawDate: any): Date | null => {
  if (!rawDate) return null;
  let d = new Date(rawDate);
  if (isNaN(d.getTime()) && typeof rawDate === 'string' && !isNaN(Number(rawDate))) {
    d = new Date(Number(rawDate));
  }
  return isNaN(d.getTime()) ? null : d;
};

// Formats Date to YYYY-MM-DD in LOCAL timezone
const formatLocalDateStr = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safeGetTimeString = (rawDate: any): string => {
  const d = parseValidDate(rawDate);
  return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
};

const getFormattedDateLabel = (from: string, to: string): string => {
  const todayStr = formatLocalDateStr(new Date());
  if (from === todayStr && to === todayStr) {
    return 'Today';
  }
  if (from === to) {
    return new Date(from).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const formattedFrom = new Date(from).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  const formattedTo = new Date(to).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${formattedFrom} – ${formattedTo}`;
};
const formatCurrency = (val: number | string): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCount = (val: number | string): string => {
  const num = typeof val === 'number' ? val : parseInt(String(val || '0'), 10);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
};

const ORDERS_PER_PAGE = 10;

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  // Date Range state (default: Today in local timezone)
  const [fromDate, setFromDate] = useState<string>(() => formatLocalDateStr(new Date()));
  const [toDate, setToDate] = useState<string>(() => formatLocalDateStr(new Date()));
  const [ordersPage, setOrdersPage] = useState<number>(1);

  // Orders List Filter & Sort states
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedSortOption, setSelectedSortOption] = useState('time_desc');

  // Mark as Paid Modal & Paying Order state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedOrderToPay, setSelectedOrderToPay] = useState<any>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [updateOrderStatus, { loading: updateStatusLoading }] = useMutation(UPDATE_ORDER_STATUS);

  const handleOpenPayModal = useCallback((order: any) => {
    setSelectedOrderToPay(order);
    setPayModalOpen(true);
  }, []);

  const handleClosePayModal = useCallback(() => {
    setPayModalOpen(false);
    setSelectedOrderToPay(null);
  }, []);

  const handleDateChange = useCallback((from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setOrdersPage(1);
    setSearchOrderQuery('');
    setSelectedCustomerFilter('all');
    setSelectedStatusFilter('all');
    setSelectedSortOption('time_desc');
  }, []);

  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery(GET_ANALYTICS_SUMMARY, {
    variables: { from: fromDate, to: toDate },
    pollInterval: 10000,
  });

  const {
    data: periodOrdersData,
    loading: periodOrdersLoading,
    refetch: refetchPeriodOrders,
  } = useQuery(GET_PERIOD_ORDERS, {
    variables: { from: fromDate, to: toDate, limit: 500 },
    pollInterval: 10000,
  });

  const {
    data: ordersData,
    loading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery(GET_RECENT_ORDERS, {
    variables: {
      from: fromDate,
      to: toDate,
      search: searchOrderQuery.trim() || undefined,
      customerName: selectedCustomerFilter !== 'all' ? selectedCustomerFilter : undefined,
      status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
      sortBy: selectedSortOption,
      page: ordersPage,
      limit: ORDERS_PER_PAGE,
    },
    pollInterval: 10000,
  });

  const handleConfirmPayOrder = useCallback(async () => {
    if (!selectedOrderToPay) return;
    try {
      setPayingOrderId(selectedOrderToPay.id);
      await updateOrderStatus({
        variables: {
          id: selectedOrderToPay.id,
          status: 'paid',
        },
      });
      await Promise.all([refetchOrders(), refetchAnalytics(), refetchPeriodOrders()]);
    } finally {
      setPayingOrderId(null);
      handleClosePayModal();
    }
  }, [
    selectedOrderToPay,
    updateOrderStatus,
    refetchOrders,
    refetchAnalytics,
    refetchPeriodOrders,
    handleClosePayModal,
  ]);

  const handleRefresh = async () => {
    await Promise.all([refetchAnalytics(), refetchOrders(), refetchPeriodOrders()]);
  };

  const summary = analyticsData?.analyticsSummary;
  const paginatedOrdersResult = ordersData?.orders;
  const paginatedOrders = paginatedOrdersResult?.orders || [];
  const totalOrdersCount = paginatedOrdersResult?.totalCount || 0;
  const totalOrderPages = paginatedOrdersResult?.totalPages || 1;
  const currentOrdersPage = paginatedOrdersResult?.page || 1;

  const selectedRangeOrders = periodOrdersData?.orders?.orders || [];
  const activePeriodLabel = getFormattedDateLabel(fromDate, toDate);

  // Dynamic Options for Customer Filter
  const customerOptions = useMemo(() => {
    const names = new Set<string>();
    selectedRangeOrders.forEach((o: any) => {
      names.add(o.customerName || 'Walk-in Customer');
    });
    const sortedNames = Array.from(names).sort();
    return [
      { label: 'All Customers', value: 'all' },
      ...sortedNames.map((name) => ({ label: name, value: name })),
    ];
  }, [selectedRangeOrders]);

  const statusOptions = useMemo(
    () => [
      { label: 'All Statuses', value: 'all' },
      { label: 'Paid', value: 'paid' },
      { label: 'Pending / Open', value: 'open' },
      { label: 'Voided', value: 'voided' },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { label: 'Time (Newest First)', value: 'time_desc' },
      { label: 'Time (Oldest First)', value: 'time_asc' },
      { label: 'Amount (High to Low)', value: 'amount_desc' },
      { label: 'Amount (Low to High)', value: 'amount_asc' },
      { label: 'Customer Name (A to Z)', value: 'customer_asc' },
    ],
    [],
  );

  const hasActiveOrderFilters =
    searchOrderQuery.trim() !== '' ||
    selectedCustomerFilter !== 'all' ||
    selectedStatusFilter !== 'all' ||
    selectedSortOption !== 'time_desc';

  const showOrderFiltersBar = totalOrdersCount > ORDERS_PER_PAGE || hasActiveOrderFilters;

  const handleClearOrderFilters = useCallback(() => {
    setSearchOrderQuery('');
    setSelectedCustomerFilter('all');
    setSelectedStatusFilter('all');
    setSelectedSortOption('time_desc');
    setOrdersPage(1);
  }, []);

  const hasAnyUnpaidOrders = useMemo(() => {
    return paginatedOrders.some(
      (order: any) => order.status !== 'paid' && order.status !== 'voided',
    );
  }, [paginatedOrders]);

  const ordersHeadings = useMemo(() => {
    const base: Array<{ title: string; alignment?: 'start' | 'center' | 'end' }> = [
      { title: 'Order #' },
      { title: 'Customer' },
      { title: 'Total Items' },
      { title: 'Time' },
      { title: 'Status' },
      { title: 'Total Amount' },
    ];
    if (hasAnyUnpaidOrders) {
      base.push({ title: 'Action', alignment: 'end' });
    }
    return base as [{ title: string }, ...{ title: string }[]];
  }, [hasAnyUnpaidOrders]);

  const ordersRowMarkup = paginatedOrders.map((order: any, index: number) => {
    const total = parseFloat(order.totalAmount) || 0;
    const dateFormatted = safeGetTimeString(order.createdAt);

    let statusTone: 'success' | 'warning' | 'info' | 'critical' = 'info';
    if (order.status === 'paid') statusTone = 'success';
    if (order.status === 'open') statusTone = 'warning';
    if (order.status === 'voided') statusTone = 'critical';

    const totalItemsCount =
      order.items && order.items.length > 0
        ? order.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
        : 0;

    const itemsTooltipContent =
      order.items && order.items.length > 0 ? (
        <div style={{ textAlign: 'left', padding: '2px 4px' }}>
          {order.items.map((i: any, idx: number) => (
            <div key={idx} style={{ marginBottom: idx === order.items.length - 1 ? 0 : '4px' }}>
              • {i.menuItemName}
              {i.flavourName ? ` (${i.flavourName})` : ''} × {formatCount(i.quantity)}
            </div>
          ))}
        </div>
      ) : (
        'No item details'
      );

    const customerNameStr = order.customerName || 'Walk-in Customer';
    const customerPhoneStr = order.customerPhone?.trim();

    const customerCellMarkup = customerPhoneStr ? (
      <Tooltip content={`Phone: ${customerPhoneStr}`} dismissOnMouseOut>
        <Text as="span" variant="bodyMd">
          {customerNameStr}
        </Text>
      </Tooltip>
    ) : (
      <Text as="span" variant="bodyMd">
        {customerNameStr}
      </Text>
    );

    const isUnpaid = order.status !== 'paid' && order.status !== 'voided';

    return (
      <IndexTable.Row id={order.id} key={order.id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            #{order.orderNumber || order.id.slice(-6)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{customerCellMarkup}</IndexTable.Cell>
        <IndexTable.Cell>
          <Tooltip content={itemsTooltipContent} dismissOnMouseOut>
            <Badge tone="info">
              {`${formatCount(totalItemsCount)} ${totalItemsCount === 1 ? 'Item' : 'Items'}`}
            </Badge>
          </Tooltip>
        </IndexTable.Cell>
        <IndexTable.Cell>{dateFormatted}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={statusTone}>{order.status ? order.status.toUpperCase() : 'PENDING'}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{formatCurrency(total)}</IndexTable.Cell>
        {hasAnyUnpaidOrders && (
          <IndexTable.Cell>
            {isUnpaid ? (
              <InlineStack align="end">
                <Button
                  size="micro"
                  tone="success"
                  icon={CheckIcon}
                  loading={payingOrderId === order.id}
                  onClick={() => handleOpenPayModal(order)}
                >
                  Mark as Paid
                </Button>
              </InlineStack>
            ) : null}
          </IndexTable.Cell>
        )}
      </IndexTable.Row>
    );
  });

  // Aggregate item sales summary (Shake / Item -> Total Count -> Total Amount)
  const itemSalesSummary = useMemo(() => {
    const map = new Map<string, { name: string; totalQuantity: number; totalAmount: number }>();

    selectedRangeOrders.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item.menuItemName || 'Item';
          const qty = Number(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          const lineTotal = item.lineTotal ? parseFloat(item.lineTotal) : price * qty;

          const existing = map.get(name);
          if (existing) {
            existing.totalQuantity += qty;
            existing.totalAmount += lineTotal;
          } else {
            map.set(name, {
              name,
              totalQuantity: qty,
              totalAmount: lineTotal,
            });
          }
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name));
    return list;
  }, [selectedRangeOrders]);

  const grandTotalQuantitySold = useMemo(() => {
    return itemSalesSummary.reduce((sum, item) => sum + item.totalQuantity, 0);
  }, [itemSalesSummary]);

  const grandTotalAmountSold = useMemo(() => {
    return itemSalesSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [itemSalesSummary]);

  const itemSalesRowMarkup = itemSalesSummary.map((item, index) => (
    <IndexTable.Row id={`item-summary-${index}`} key={item.name} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {item.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">{`${formatCount(item.totalQuantity)} sold`}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>{formatCurrency(item.totalAmount)}</IndexTable.Cell>
    </IndexTable.Row>
  ));

  const ordersSkeletonMarkup = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => (
        <IndexTable.Row id={`skel-order-${index}`} key={`skel-order-${index}`} position={index}>
          <IndexTable.Cell>
            <Box paddingBlock={'100'}>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </Box>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Box paddingBlock={'100'}>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </Box>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Box paddingBlock={'100'}>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </Box>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Box paddingBlock={'100'}>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </Box>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Box paddingBlock={'100'}>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </Box>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Box paddingBlock={'100'}>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </Box>
          </IndexTable.Cell>
          {hasAnyUnpaidOrders && (
            <IndexTable.Cell>
              <Box
                minHeight="17px"
                width="100px"
                background="bg-surface-brand"
                borderRadius="100"
              />
            </IndexTable.Cell>
          )}
        </IndexTable.Row>
      )),
    [hasAnyUnpaidOrders],
  );

  const itemSalesSkeletonMarkup = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => (
        <IndexTable.Row id={`skel-item-${index}`} key={`skel-item-${index}`} position={index}>
          <IndexTable.Cell>
            <SkeletonDisplayText size="small" />
          </IndexTable.Cell>
          <IndexTable.Cell>
            <SkeletonDisplayText size="small" />
          </IndexTable.Cell>
          <IndexTable.Cell>
            <SkeletonDisplayText size="small" />
          </IndexTable.Cell>
        </IndexTable.Row>
      )),
    [],
  );

  const isInitialAnalyticsLoading = analyticsLoading && !analyticsData;
  const isInitialOrdersLoading = ordersLoading && !ordersData;
  const isInitialPeriodOrdersLoading = periodOrdersLoading && !periodOrdersData;

  const isMetricsLoading = isInitialAnalyticsLoading || !summary;
  const isOrdersTableLoading = isInitialOrdersLoading;
  const isItemSummaryLoading = isInitialPeriodOrdersLoading;

  return (
    <Page
      title="Analytics & Orders Dashboard"
      subtitle="Sales performance, revenue metrics, and order streams"
      primaryAction={{
        content: 'Refresh Data',
        icon: RefreshIcon,
        onAction: handleRefresh,
      }}
    >
      <BlockStack gap="500">
        {analyticsError && (
          <Banner title="Analytics Connection Note" tone="warning">
            <p>
              Unable to fetch analytics: {analyticsError.message}. Ensure `npm run server:admin` is
              running.
            </p>
          </Banner>
        )}

        {/* Date Selector Header Bar */}
        <InlineStack align="space-between" blockAlign="center">
          <DateRangeSelector fromDate={fromDate} toDate={toDate} onDateChange={handleDateChange} />
          <Text as="span" variant="bodySm" tone="subdued">
            Selected Period: <strong>{activePeriodLabel}</strong>
          </Text>
        </InlineStack>

        {/* Overview Metric Cards */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm" tone="subdued">
                Total Revenue
              </Text>
              {isMetricsLoading ? (
                <Box width="110px">
                  <SkeletonDisplayText size="small" />
                </Box>
              ) : (
                <Text as="p" variant="headingLg">
                  {formatCurrency(summary.totalRevenue)}
                </Text>
              )}
            </BlockStack>
          </Card>

          <Card padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm" tone="subdued">
                Orders Count
              </Text>
              {isMetricsLoading ? (
                <Box width="90px">
                  <SkeletonDisplayText size="small" />
                </Box>
              ) : (
                <Text as="p" variant="headingLg">
                  {formatCount(summary.orderCount)} {summary.orderCount === 1 ? 'Order' : 'Orders'}
                </Text>
              )}
            </BlockStack>
          </Card>

          <Card padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm" tone="subdued">
                Net Profit
              </Text>
              {isMetricsLoading ? (
                <Box width="110px">
                  <SkeletonDisplayText size="small" />
                </Box>
              ) : (
                <Text as="p" variant="headingLg">
                  {formatCurrency(summary.netProfit)}
                </Text>
              )}
            </BlockStack>
          </Card>

          <Card padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm" tone="subdued">
                Unpaid Amount
              </Text>
              {isMetricsLoading ? (
                <Box width="110px">
                  <SkeletonDisplayText size="small" />
                </Box>
              ) : (
                <Text as="p" variant="headingLg">
                  {formatCurrency(summary.unpaidAmount)}
                </Text>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* 1. Orders List Filtered By Date Selection (Paginated) */}
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Box padding="400">
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        Orders List ({activePeriodLabel})
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Showing{' '}
                        {totalOrdersCount === 0
                          ? 0
                          : formatCount((currentOrdersPage - 1) * ORDERS_PER_PAGE + 1)}
                        –
                        {formatCount(
                          Math.min(currentOrdersPage * ORDERS_PER_PAGE, totalOrdersCount),
                        )}{' '}
                        of {formatCount(totalOrdersCount)}{' '}
                        {totalOrdersCount === 1 ? 'order' : 'orders'} for {activePeriodLabel}. Hover
                        over total items badge to view item breakdown.
                      </Text>
                    </BlockStack>
                    {hasActiveOrderFilters && (
                      <Button variant="plain" onClick={handleClearOrderFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </InlineStack>

                  {showOrderFiltersBar && (
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="300">
                      <TextField
                        label="Search Orders"
                        value={searchOrderQuery}
                        onChange={(val) => {
                          setSearchOrderQuery(val);
                          setOrdersPage(1);
                        }}
                        placeholder="Search by order #, customer..."
                        autoComplete="off"
                        clearButton
                        onClearButtonClick={() => {
                          setSearchOrderQuery('');
                          setOrdersPage(1);
                        }}
                      />
                      <Select
                        label="Filter by Customer"
                        options={customerOptions}
                        value={selectedCustomerFilter}
                        onChange={(val) => {
                          setSelectedCustomerFilter(val);
                          setOrdersPage(1);
                        }}
                      />
                      <Select
                        label="Payment Status"
                        options={statusOptions}
                        value={selectedStatusFilter}
                        onChange={(val) => {
                          setSelectedStatusFilter(val);
                          setOrdersPage(1);
                        }}
                      />
                      <Select
                        label="Sort By"
                        options={sortOptions}
                        value={selectedSortOption}
                        onChange={(val) => {
                          setSelectedSortOption(val);
                          setOrdersPage(1);
                        }}
                      />
                    </InlineGrid>
                  )}
                </BlockStack>
              </Box>

              <IndexTable
                resourceName={{ singular: 'order', plural: 'orders' }}
                itemCount={isOrdersTableLoading ? 5 : totalOrdersCount}
                selectable={false}
                loading={isOrdersTableLoading}
                headings={ordersHeadings}
                pagination={
                  isOrdersTableLoading || totalOrderPages <= 1
                    ? undefined
                    : {
                        hasNext: currentOrdersPage < totalOrderPages,
                        hasPrevious: currentOrdersPage > 1,
                        onNext: () => setOrdersPage((p) => Math.min(p + 1, totalOrderPages)),
                        onPrevious: () => setOrdersPage((p) => Math.max(p - 1, 1)),
                        label: `Page ${formatCount(currentOrdersPage)} of ${formatCount(totalOrderPages)}`,
                      }
                }
              >
                {isOrdersTableLoading ? ordersSkeletonMarkup : ordersRowMarkup}
              </IndexTable>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 2. Item Sales Summary Table (Shake - Total Count - Amount) below Orders List */}
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Box padding="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Item Sales Summary ({activePeriodLabel})
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Total {formatCount(grandTotalQuantitySold)}{' '}
                      {grandTotalQuantitySold === 1 ? 'item' : 'items'} sold across{' '}
                      {formatCount(itemSalesSummary.length)} unique items ({activePeriodLabel}).
                      Total Amount: {formatCurrency(grandTotalAmountSold)}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>

              <IndexTable
                resourceName={{ singular: 'item summary', plural: 'item summaries' }}
                itemCount={isItemSummaryLoading ? 5 : itemSalesSummary.length}
                selectable={false}
                loading={isItemSummaryLoading}
                headings={[
                  { title: 'Shake / Item' },
                  { title: 'Total Count' },
                  { title: 'Total Amount' },
                ]}
              >
                {isItemSummaryLoading ? itemSalesSkeletonMarkup : itemSalesRowMarkup}
              </IndexTable>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Mark as Paid Confirmation Modal */}
      <Modal
        open={payModalOpen}
        onClose={handleClosePayModal}
        title={`Mark Order #${selectedOrderToPay?.orderNumber || selectedOrderToPay?.id?.slice(-6) || ''} as Paid?`}
        primaryAction={{
          content: 'Mark as Paid',
          onAction: handleConfirmPayOrder,
          loading: updateStatusLoading || payingOrderId === selectedOrderToPay?.id,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleClosePayModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">
              Are you sure you want to mark Order{' '}
              <strong>
                #{selectedOrderToPay?.orderNumber || selectedOrderToPay?.id?.slice(-6)}
              </strong>{' '}
              for customer <strong>{selectedOrderToPay?.customerName || 'Walk-in Customer'}</strong>{' '}
              as paid?
            </Text>
            <Text as="p" tone="subdued">
              Total Order Amount:{' '}
              <strong>{formatCurrency(selectedOrderToPay?.totalAmount || 0)}</strong>. This will
              move the unpaid balance to revenue and update net profit metrics.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
};
