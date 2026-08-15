import React, { useState } from 'react';
import { Card, BlockStack, InlineStack, Text, Box } from '@shopify/polaris';

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

interface AnalyticsChartProps {
  data: SalesDataPoint[];
  loading?: boolean;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, loading }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <Card padding="500">
        <BlockStack gap="300" align="center">
          <Text as="p" tone="subdued">
            Loading analytics chart...
          </Text>
        </BlockStack>
      </Card>
    );
  }

  // Ensure dataset is sorted by date ascending
  const chartData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (chartData.length === 0) {
    return (
      <Card padding="500">
        <BlockStack gap="200" align="center">
          <Text as="h3" variant="headingSm">
            Revenue & Orders Performance
          </Text>
          <Text as="p" tone="subdued">
            No sales data recorded for the selected date range.
          </Text>
        </BlockStack>
      </Card>
    );
  }

  const rawMaxRev = Math.max(...chartData.map((d) => d.revenue), 100);
  const maxRevenue = Math.ceil(rawMaxRev / 500) * 500 || 1000;
  const rawMaxOrd = Math.max(...chartData.map((d) => d.orderCount), 5);
  const maxOrders = Math.ceil(rawMaxOrd / 5) * 5 || 10;

  const svgWidth = 850;
  const svgHeight = 280;
  const margin = { top: 25, right: 35, bottom: 45, left: 60 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Calculate pixel coordinates for data points
  const points = chartData.map((d, index) => {
    const x =
      chartData.length === 1
        ? margin.left + plotWidth / 2
        : margin.left + (index / (chartData.length - 1)) * plotWidth;
    const yRev = margin.top + plotHeight - (d.revenue / maxRevenue) * plotHeight;
    const yOrd = margin.top + plotHeight - (d.orderCount / maxOrders) * plotHeight;
    return { x, yRev, yOrd, item: d };
  });

  // Generate smooth cubic bezier SVG path for Revenue
  const getSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const revenuePoints = points.map((p) => ({ x: p.x, y: p.yRev }));
  const ordersPoints = points.map((p) => ({ x: p.x, y: p.yOrd }));

  const revenueLinePath = getSmoothPath(revenuePoints);
  const ordersLinePath = getSmoothPath(ordersPoints);

  const revenueAreaPath =
    points.length > 0
      ? `${revenueLinePath} L ${points[points.length - 1].x} ${margin.top + plotHeight} L ${points[0].x} ${margin.top + plotHeight} Z`
      : '';

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <Card padding="500">
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Revenue & Orders Performance
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Daily revenue trend vs. order volume
            </Text>
          </BlockStack>

          <InlineStack gap="400" blockAlign="center">
            <InlineStack gap="150" blockAlign="center">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#005bd3',
                  display: 'inline-block',
                }}
              />
              <Text as="span" variant="bodySm" fontWeight="bold">
                Revenue (₹)
              </Text>
            </InlineStack>

            <InlineStack gap="150" blockAlign="center">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#008060',
                  display: 'inline-block',
                }}
              />
              <Text as="span" variant="bodySm" fontWeight="bold">
                Order Count
              </Text>
            </InlineStack>
          </InlineStack>
        </InlineStack>

        <Box padding="0">
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <defs>
                <linearGradient id="polarisRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#005bd3" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#005bd3" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = margin.top + plotHeight * (1 - ratio);
                const val = Math.round(maxRevenue * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={svgWidth - margin.right}
                      y2={y}
                      stroke="#e1e3e5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={margin.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#6d7175"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'San Francisco', Roboto, sans-serif"
                    >
                      ₹{val}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Date Labels */}
              {points.map((p, i) => {
                const dateObj = new Date(p.item.date);
                const dateLabel = dateObj.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <text
                    key={i}
                    x={p.x}
                    y={margin.top + plotHeight + 24}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6d7175"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'San Francisco', Roboto, sans-serif"
                  >
                    {dateLabel}
                  </text>
                );
              })}

              {/* Revenue Gradient Fill */}
              <path d={revenueAreaPath} fill="url(#polarisRevenueGradient)" />

              {/* Revenue Smooth Curve */}
              <path
                d={revenueLinePath}
                fill="none"
                stroke="#005bd3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Orders Dotted Curve */}
              <path
                d={ordersLinePath}
                fill="none"
                stroke="#008060"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Hover Vertical Guide Line */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={margin.top}
                  x2={activePoint.x}
                  y2={margin.top + plotHeight}
                  stroke="#8c9196"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Data Points & Interactive Targets */}
              {points.map((p, i) => {
                const isHovered = hoveredIndex === i;
                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Hover Target Overlay Column */}
                    <rect
                      x={p.x - 20}
                      y={margin.top}
                      width="40"
                      height={plotHeight}
                      fill="transparent"
                    />

                    {/* Revenue Dot */}
                    <circle
                      cx={p.x}
                      cy={p.yRev}
                      r={isHovered ? 6 : 4}
                      fill="#005bd3"
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ transition: 'all 0.15s ease' }}
                    />

                    {/* Orders Dot */}
                    <circle
                      cx={p.x}
                      cy={p.yOrd}
                      r={isHovered ? 5 : 3.5}
                      fill="#008060"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      style={{ transition: 'all 0.15s ease' }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Polaris Dark Tooltip Popover */}
            {activePoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(activePoint.x / svgWidth) * 100}%`,
                  top: `${(Math.min(activePoint.yRev, activePoint.yOrd) / svgHeight) * 100}%`,
                  transform: 'translate(-50%, -110%)',
                  backgroundColor: '#202123',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  fontSize: '12px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 20,
                  fontFamily: '-apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                }}
              >
                <div style={{ fontWeight: 600, color: '#e3e3e3', marginBottom: '6px' }}>
                  {new Date(activePoint.item.date).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#388bfd' }} />
                  <span>Revenue: <strong>₹{activePoint.item.revenue.toFixed(2)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3fb950' }} />
                  <span>Orders: <strong>{activePoint.item.orderCount} orders</strong></span>
                </div>
              </div>
            )}
          </div>
        </Box>
      </BlockStack>
    </Card>
  );
};
