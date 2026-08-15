import React, { useState, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
  Button,
  Badge,
  Banner,
  IndexTable,
  Box,
  Tooltip,
  SkeletonDisplayText,
} from '@shopify/polaris';
import { ProductIcon, RefreshIcon } from '@shopify/polaris-icons';
import { useQuery } from '@apollo/client';
import { GET_ANALYTICS_SUMMARY, GET_RECENT_ORDERS } from '../graphql/queries';
import { DateRangeSelector } from '../components/dashboard/DateRangeSelector';

interface DashboardPageProps {
  onNavigateToMenuItems: () => void;
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
const formatLocalDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToMenuItems }) => {
  // Date Range state (default: Today in local timezone)
  const [fromDate, setFromDate] = useState<string>(() => formatLocalDateStr(new Date()));
  const [toDate, setToDate] = useState<string>(() => formatLocalDateStr(new Date()));

  const handleDateChange = useCallback((from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
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

  const ordersRowMarkup = selectedRangeOrders.map((order: any, index: number) => {
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
              • {i.menuItemName}{i.flavourName ? ` (${i.flavourName})` : ''} × {i.quantity}
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
              {`${totalItemsCount} ${totalItemsCount === 1 ? 'Item' : 'Items'}`}
            </Badge>
          </Tooltip>
        </IndexTable.Cell>
        <IndexTable.Cell>{dateFormatted}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={statusTone}>{order.status ? order.status.toUpperCase() : 'PENDING'}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>₹{total.toFixed(2)}</IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="Live Analytics & Orders Dashboard"
      subtitle="Real-time sales performance, revenue metrics, and order streams"
      primaryAction={{
        content: 'Refresh Live Data',
        icon: RefreshIcon,
        onAction: handleRefresh,
      }}
      secondaryActions={[
        {
          content: 'Manage Menu Items',
          icon: ProductIcon,
          onAction: onNavigateToMenuItems,
        },
      ]}
    >
      <BlockStack gap="500">
        {analyticsError && (
          <Banner title="Live Analytics Note" tone="warning">
            <p>Unable to fetch live analytics: {analyticsError.message}. Ensure `npm run server:admin` is running.</p>
          </Banner>
        )}

        {/* Date Selector Header Bar */}
        <InlineStack align="space-between" blockAlign="center">
          <DateRangeSelector
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={handleDateChange}
          />
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
                  ₹{summary.totalRevenue ? parseFloat(summary.totalRevenue).toFixed(2) : '0.00'}
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
                  {summary.orderCount ?? 0} {summary.orderCount === 1 ? 'Order' : 'Orders'}
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
                  ₹{summary.netProfit ? parseFloat(summary.netProfit).toFixed(2) : '0.00'}
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
                  ₹{summary.unpaidAmount ? parseFloat(summary.unpaidAmount).toFixed(2) : '0.00'}
                </Text>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Orders List Filtered By Date Selection */}
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Box padding="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Orders List ({activePeriodLabel})
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Displaying {selectedRangeOrders.length} {selectedRangeOrders.length === 1 ? 'order' : 'orders'} for {activePeriodLabel}. Hover over total items badge to view item breakdown.
                    </Text>
                  </BlockStack>
                  <Button icon={RefreshIcon} onClick={handleRefresh}>
                    Refresh Orders
                  </Button>
                </InlineStack>
              </Box>

              <IndexTable
                resourceName={{ singular: 'order', plural: 'orders' }}
                itemCount={selectedRangeOrders.length}
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
              >
                {ordersRowMarkup}
              </IndexTable>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
};
