import { db } from './index.js';
import {
  users,
  categories,
  flavours,
  menuItems,
  menuItemFlavours,
  recipes,
  makingCosts,
  inventoryItems,
  shopExpenses,
} from './schema.js';
import 'dotenv/config';

async function seed() {
  console.log('🌱 Starting DB seed...');

  // 1. Users
  console.log('Inserting default users...');
  const [cashier] = await db
    .insert(users)
    .values([
      { name: 'Default Cashier', email: 'cashier@frozenshake.com', role: 'cashier' },
      { name: 'Store Manager', email: 'manager@frozenshake.com', role: 'manager' },
    ])
    .onConflictDoNothing()
    .returning();

  // 2. Categories
  console.log('Inserting categories...');
  const categoryRows = await db
    .insert(categories)
    .values([
      { name: 'Fresh Juices', icon: '🥤', sortOrder: 1 },
      { name: 'Fruit Milkshakes', icon: '🧃', sortOrder: 2 },
      { name: 'Special Smoothies', icon: '🥭', sortOrder: 3 },
    ])
    .onConflictDoNothing()
    .returning();

  const freshJuicesCat = categoryRows.find((c) => c.name === 'Fresh Juices') ?? categoryRows[0];
  const milkshakesCat = categoryRows.find((c) => c.name === 'Fruit Milkshakes') ?? categoryRows[1];

  // 3. Flavours (1 Base + 20 Flavours)
  console.log('Inserting 20 flavours...');
  const [baseFlavour] = await db
    .insert(flavours)
    .values([{ name: 'Standard Fruit Base' }])
    .onConflictDoNothing()
    .returning();

  const flavourNames = [
    'Mango',
    'Strawberry',
    'Avocado',
    'Chocolate',
    'Banana',
    'Pineapple',
    'Papaya',
    'Watermelon',
    'Apple',
    'Kiwi',
    'Dragonfruit',
    'Berry Blast',
    'Chiku',
    'Muskmelon',
    'Orange',
    'Guava',
    'Pomegranate',
    'Lychee',
    'Peach',
    'Passionfruit',
  ];

  const flavourRows = await db
    .insert(flavours)
    .values(
      flavourNames.map((name) => ({
        name,
        baseFlavourId: baseFlavour?.id ?? null,
      })),
    )
    .onConflictDoNothing()
    .returning();

  // 4. Menu Items
  console.log('Inserting menu items...');
  const menuRows = await db
    .insert(menuItems)
    .values([
      {
        categoryId: milkshakesCat.id,
        name: 'Signature Mango Shake',
        description: 'Rich thick mango shake topped with fruit chunks',
        sellingPrice: '120.00',
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
        isAvailable: true,
      },
      {
        categoryId: milkshakesCat.id,
        name: 'Double Chocolate Shake',
        description: 'Creamy chocolate shake made with real cocoa',
        sellingPrice: '140.00',
        imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&q=80',
        isAvailable: true,
      },
      {
        categoryId: freshJuicesCat.id,
        name: 'Fresh Avocado Juice',
        description: 'Pure cold-pressed fresh avocado',
        sellingPrice: '110.00',
        imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80',
        isAvailable: true,
      },
    ])
    .onConflictDoNothing()
    .returning();

  const mangoShake = menuRows.find((m) => m.name.includes('Mango')) ?? menuRows[0];

  // 5. Menu Item Flavours junction
  if (mangoShake && flavourRows.length > 0) {
    await db
      .insert(menuItemFlavours)
      .values(
        flavourRows.slice(0, 5).map((f) => ({
          menuItemId: mangoShake.id,
          flavourId: f.id,
          extraCost: '0.00',
        })),
      )
      .onConflictDoNothing();
  }

  // 6. Recipes & Making Costs (for COGS & profit computation)
  console.log('Inserting recipes & making costs...');
  if (mangoShake) {
    await db
      .insert(recipes)
      .values([
        {
          menuItemId: mangoShake.id,
          ingredientName: 'Fruit Pulp',
          unit: 'g',
          quantity: '100.000',
          costPerUnit: '0.2500', // ₹25.00
        },
        {
          menuItemId: mangoShake.id,
          ingredientName: 'Milk',
          unit: 'ml',
          quantity: '150.000',
          costPerUnit: '0.0600', // ₹9.00
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(makingCosts)
      .values([
        { menuItemId: mangoShake.id, label: 'Packaging & Cup', amount: '5.00' },
        { menuItemId: mangoShake.id, label: 'Labour & Overhead', amount: '8.00' },
      ])
      .onConflictDoNothing();
  }

  // 7. Inventory Items
  console.log('Inserting inventory items...');
  await db
    .insert(inventoryItems)
    .values([
      {
        name: 'Fruit Pulp',
        unit: 'g',
        currentStock: '5000.000',
        reorderLevel: '1000.000',
        costPerUnit: '0.2500',
      },
      {
        name: 'Milk',
        unit: 'ml',
        currentStock: '10000.000',
        reorderLevel: '2000.000',
        costPerUnit: '0.0600',
      },
      {
        name: 'Paper Cups 350ml',
        unit: 'pcs',
        currentStock: '500.000',
        reorderLevel: '100.000',
        costPerUnit: '3.5000',
      },
    ])
    .onConflictDoNothing();

  // 8. Shop Expenses
  console.log('Inserting shop expenses...');
  if (cashier) {
    await db
      .insert(shopExpenses)
      .values([
        {
          recordedBy: cashier.id,
          category: 'Rent',
          amount: '15000.00',
          note: 'Monthly shop rent',
          expenseDate: new Date().toISOString().split('T')[0],
        },
        {
          recordedBy: cashier.id,
          category: 'Electricity',
          amount: '2500.00',
          note: 'Utility bill',
          expenseDate: new Date().toISOString().split('T')[0],
        },
      ])
      .onConflictDoNothing();
  }

  console.log('✅ DB seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ DB seed failed:', err);
  process.exit(1);
});
