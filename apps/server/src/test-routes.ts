import 'dotenv/config';

const BASE_URL = process.env.TEST_API_URL ?? 'http://localhost:3000';

interface TestResult {
  route: string;
  method: string;
  status: number;
  passed: boolean;
  message?: string;
  data?: unknown;
}

const results: TestResult[] = [];

async function request(method: string, path: string, body?: unknown) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    const passed = res.ok && json.success !== false;

    results.push({
      route: path,
      method,
      status: res.status,
      passed,
      message: passed ? 'OK' : json.error || `HTTP ${res.status}`,
      data: json.data || json,
    });

    console.log(
      `${passed ? '✅' : '❌'} ${method.padEnd(6)} ${path.padEnd(30)} → ${res.status}`
    );
    return json;
  } catch (err: any) {
    results.push({
      route: path,
      method,
      status: 0,
      passed: false,
      message: err.message,
    });
    console.log(`❌ ${method.padEnd(6)} ${path.padEnd(30)} → FAILED (${err.message})`);
    return null;
  }
}

async function runTests() {
  console.log(`\n🧪 Testing Frozen Shake API routes against ${BASE_URL}\n${'─'.repeat(60)}`);

  // 1. Health Check
  await request('GET', '/health');

  // 2. Menu Routes
  const menuRes = await request('GET', '/menu');
  
  // 3. Create Category
  const catRes = await request('POST', '/menu/categories', {
    name: 'Special Mocktails',
    icon: '🍹',
    sortOrder: 4,
  });

  const newCatId = catRes?.data?.id;

  // 4. Create Menu Item
  let newItemId: string | undefined;
  if (newCatId) {
    const itemRes = await request('POST', '/menu/items', {
      categoryId: newCatId,
      name: 'Tropical Mint Cooler',
      description: 'Refreshing mint and lime mocktail',
      sellingPrice: '130.00',
    });
    newItemId = itemRes?.data?.id;
  }

  // 5. Menu Snapshot for Sync
  await request('GET', '/sync/menu');

  // 6. Create Order
  let createdOrderId: string | undefined;
  const menuItems = menuRes?.data?.[0]?.items ?? [];
  const sampleItem = menuItems[0];

  if (sampleItem) {
    const orderRes = await request('POST', '/orders', {
      tableRef: 'Table 4',
      orderType: 'dine_in',
      customerName: 'Test Customer',
      notes: 'Less ice please',
      items: [
        {
          menuItemId: sampleItem.id,
          flavourId: null,
          quantity: 2,
          notes: 'Fresh pulp',
        },
      ],
    });
    createdOrderId = orderRes?.data?.id;
  }

  // 7. Get Orders History
  await request('GET', '/orders');

  // 8. Pay Order
  if (createdOrderId) {
    await request('POST', `/orders/${createdOrderId}/pay`, {
      paymentMethod: 'upi',
    });
  }

  // 9. Inventory Routes
  const invRes = await request('GET', '/inventory');
  const sampleInvItem = invRes?.data?.[0];

  if (sampleInvItem) {
    await request('POST', '/inventory/adjust', {
      inventoryItemId: sampleInvItem.id,
      userId: '00000000-0000-0000-0000-000000000000', // placeholder uuid for test
      type: 'restock',
      quantityDelta: 50,
      note: 'Routine restock',
    });
  }

  // 10. Expenses Routes
  await request('GET', '/expenses');
  await request('POST', '/expenses', {
    category: 'Packaging Supplies',
    amount: '1200.00',
    note: '500 paper cups',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  // 11. Analytics Routes
  await request('GET', '/analytics/sales');
  await request('GET', '/analytics/profit');

  // 12. Offline Sync Orders
  if (sampleItem) {
    await request('POST', '/sync/orders', {
      orders: [
        {
          localId: 'offline-order-101',
          order: {
            cashierId: '00000000-0000-0000-0000-000000000000',
            tableRef: 'Takeaway',
            orderType: 'take_away',
            status: 'paid',
            paymentMethod: 'cash',
            subtotal: '120.00',
            totalAmount: '120.00',
          },
          items: [
            {
              menuItemId: sampleItem.id,
              menuItemName: sampleItem.name,
              quantity: 1,
              unitPrice: sampleItem.sellingPrice,
              lineTotal: sampleItem.sellingPrice,
            },
          ],
        },
      ],
    });
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`📊 Test Results: ${passed}/${total} passed (${failed} failed)\n`);

  if (failed > 0) {
    console.log('Failed Endpoints:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.method} ${r.route}: ${r.message}`));
    process.exit(1);
  } else {
    console.log('🎉 All server API routes are functioning 100% cleanly!');
    process.exit(0);
  }
}

runTests();
