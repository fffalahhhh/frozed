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
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useQuery } from '@apollo/client';
import { GET_ANALYTICS_SUMMARY, GET_RECENT_ORDERS } from '../graphql/queries';
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

const safeGetDateStr = (rawDate: any): string | null => {
  const d = parseValidDate(rawDate);
  return d ? formatLocalDateStr(d) : null;
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
};const formatCurrency = (val: number | string): string => {
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

  const handleDateChange = useCallback((from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setOrdersPage(1);
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
    data: ordersData,
    loading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery(GET_RECENT_ORDERS, {
    variables: { limit: 250 },
    pollInterval: 10000,
  });

  const handleRefresh = () => {
    refetchAnalytics();
    refetchOrders();
  };

  const summary = analyticsData?.analyticsSummary;
  const allOrders = ordersData?.orders || [];

  // Filter orders list strictly based on active date range selection in local timezone
  const selectedRangeOrders = useMemo(() => {
    if (!allOrders.length) return [];
    return allOrders.filter((order: any) => {
      const orderDateStr = safeGetDateStr(order.createdAt);
      if (!orderDateStr) return false;
      return orderDateStr >= fromDate && orderDateStr <= toDate;
    });
  }, [allOrders, fromDate, toDate]);

  const activePeriodLabel = getFormattedDateLabel(fromDate, toDate);

  // Paginated Orders Calculation
  const totalOrderPages = Math.ceil(selectedRangeOrders.length / ORDERS_PER_PAGE) || 1;
  const currentOrdersPage = Math.min(ordersPage, totalOrderPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentOrdersPage - 1) * ORDERS_PER_PAGE;
    return selectedRangeOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [selectedRangeOrders, currentOrdersPage]);

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
              • {i.menuItemName}{i.flavourName ? ` (${i.flavourName})` : ''} × {formatCount(i.quantity)}
            </div>
          ))}
        </div>
      ) : (
        'No item details'
      );

    return (
      <IndexTable.Row id={order.id} key={order.id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            #{order.orderNumber || order.id.slice(-6)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{order.customerName || 'Walk-in Customer'}</IndexTable.Cell>
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
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
        </IndexTable.Row>
      )),
    [],
  );

  const isItemSummaryLoading = ordersLoading || analyticsLoading;

  const itemSalesSkeletonMarkup = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => (
        <IndexTable.Row id={`skel-item-${index}`} key={`skel-item-${index}`} position={index}>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
          <IndexTable.Cell><SkeletonDisplayText size="small" /></IndexTable.Cell>
        </IndexTable.Row>
      )),
    [],
  );

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
              Unable to fetch analytics: {analyticsError.message}. Ensure `npm run server:admin` is running.
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
              {analyticsLoading || !summary ? (
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
              {analyticsLoading || !summary ? (
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
              {analyticsLoading || !summary ? (
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
              {analyticsLoading || !summary ? (
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
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Orders List ({activePeriodLabel})
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Showing {selectedRangeOrders.length === 0 ? 0 : formatCount((currentOrdersPage - 1) * ORDERS_PER_PAGE + 1)}–
                    {formatCount(Math.min(currentOrdersPage * ORDERS_PER_PAGE, selectedRangeOrders.length))} of{' '}
                    {formatCount(selectedRangeOrders.length)} {selectedRangeOrders.length === 1 ? 'order' : 'orders'} for{' '}
                    {activePeriodLabel}. Hover over total items badge to view item breakdown.
                  </Text>
                </BlockStack>
              </Box>

              <IndexTable
                resourceName={{ singular: 'order', plural: 'orders' }}
                itemCount={ordersLoading ? 5 : selectedRangeOrders.length}
                selectable={false}
                loading={ordersLoading}
                headings={[
                  { title: 'Order #' },
                  { title: 'Customer' },
                  { title: 'Total Items' },
                  { title: 'Time' },
                  { title: 'Status' },
                  { title: 'Total Amount' },
                ]}
                pagination={
                  ordersLoading
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
                {ordersLoading ? ordersSkeletonMarkup : ordersRowMarkup}
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
                      Total {formatCount(grandTotalQuantitySold)} {grandTotalQuantitySold === 1 ? 'item' : 'items'} sold across{' '}
                      {formatCount(itemSalesSummary.length)} unique items ({activePeriodLabel}). Total Amount: {formatCurrency(grandTotalAmountSold)}
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
    </Page>
  );
};
