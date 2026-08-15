import { db } from './index.js';
import { users, categories, menuItems, recipes, inventoryItems } from './schema.js';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

export async function seedFrozenShakeData() {
  console.log('🌱 Starting full Frozen Shake database seeding with custom image URLs...');

  try {
    // 1. Ensure default cashier user
    console.log('Inserting default user...');
    await db
      .insert(users)
      .values([{ name: 'Default Cashier', email: 'cashier@frozenshake.com', role: 'cashier' }])
      .onConflictDoNothing();

    // 2. Clear old data completely to guarantee 100% fresh seed
    console.log('Wiping existing data for fresh seed...');
    await db.execute(sql`
      TRUNCATE 
        "order_items", "orders", "bills", "shop_expenses", 
        "inventory_adjustments", "pre_orders", "recipes", 
        "making_costs", "menu_item_flavours", "menu_items", 
        "flavours", "categories", "inventory_items" 
      RESTART IDENTITY CASCADE;
    `);

    // 3. Two Categories: Shakes & Special Shakes
    console.log('Inserting 2 Categories...');
    const categoryRows = await db
      .insert(categories)
      .values([
        { name: 'Shakes', icon: '🥤', sortOrder: 1 },
        { name: 'Special Shakes', icon: '✨', sortOrder: 2 },
      ])
      .returning();

    const shakesCat = categoryRows.find((c) => c.name === 'Shakes')!;
    const specialCat = categoryRows.find((c) => c.name === 'Special Shakes')!;

    // 4. Inventory Stock Items (from Handwritten Notepad + Excel Specs)
    console.log('Inserting Inventory Stock Items...');
    const inventoryData = [
      {
        name: 'Mango Pulp',
        unit: 'kg',
        currentStock: '8.00',
        reorderLevel: '2.00',
        costPerUnit: '210.00',
      },
      {
        name: 'Chiku Pulp',
        unit: 'kg',
        currentStock: '8.00',
        reorderLevel: '2.00',
        costPerUnit: '150.00',
      },
      {
        name: 'Sitaphal Pulp',
        unit: 'kg',
        currentStock: '7.00',
        reorderLevel: '2.00',
        costPerUnit: '230.00',
      },
      {
        name: 'Strawberry',
        unit: 'kg',
        currentStock: '7.00',
        reorderLevel: '2.00',
        costPerUnit: '180.00',
      },
      {
        name: 'Jamun Pulp',
        unit: 'kg',
        currentStock: '3.00',
        reorderLevel: '1.00',
        costPerUnit: '190.00',
      },
      {
        name: 'Coconut Pulp',
        unit: 'kg',
        currentStock: '7.00',
        reorderLevel: '2.00',
        costPerUnit: '240.00',
      },
      {
        name: 'Oreo Biscuit',
        unit: 'packs',
        currentStock: '100.00',
        reorderLevel: '15.00',
        costPerUnit: '9.00',
      },
      {
        name: 'Boost Powder',
        unit: 'packs',
        currentStock: '100.00',
        reorderLevel: '15.00',
        costPerUnit: '5.00',
      },
      {
        name: 'Coffee Powder',
        unit: 'packs',
        currentStock: '150.00',
        reorderLevel: '20.00',
        costPerUnit: '5.00',
      },
      {
        name: 'Vanilla Syrup',
        unit: 'bottles',
        currentStock: '2.00',
        reorderLevel: '1.00',
        costPerUnit: '150.00',
      },
      {
        name: 'Butterscotch Syrup',
        unit: 'bottles',
        currentStock: '2.00',
        reorderLevel: '1.00',
        costPerUnit: '150.00',
      },
      {
        name: 'Strawberry Syrup',
        unit: 'bottles',
        currentStock: '2.00',
        reorderLevel: '1.00',
        costPerUnit: '150.00',
      },
      {
        name: 'Chocolate Syrup',
        unit: 'bottles',
        currentStock: '2.00',
        reorderLevel: '1.00',
        costPerUnit: '150.00',
      },
      {
        name: 'Kaju',
        unit: 'kg',
        currentStock: '1.00',
        reorderLevel: '0.20',
        costPerUnit: '700.00',
      },
      {
        name: 'Badam',
        unit: 'kg',
        currentStock: '1.00',
        reorderLevel: '0.20',
        costPerUnit: '800.00',
      },
      {
        name: 'Dates',
        unit: 'kg',
        currentStock: '5.00',
        reorderLevel: '1.00',
        costPerUnit: '130.00',
      },
      {
        name: 'Anjeer',
        unit: 'kg',
        currentStock: '1.00',
        reorderLevel: '0.20',
        costPerUnit: '1000.00',
      },
      {
        name: 'Nutella Chocolate',
        unit: 'jars',
        currentStock: '3.00',
        reorderLevel: '1.00',
        costPerUnit: '321.00',
      },
      {
        name: 'Banana',
        unit: 'kg',
        currentStock: '5.00',
        reorderLevel: '1.00',
        costPerUnit: '40.00',
      },
      {
        name: 'Apple',
        unit: 'kg',
        currentStock: '5.00',
        reorderLevel: '1.00',
        costPerUnit: '120.00',
      },
      {
        name: 'Dragon Fruit',
        unit: 'kg',
        currentStock: '3.00',
        reorderLevel: '1.00',
        costPerUnit: '150.00',
      },
      {
        name: 'Milk',
        unit: 'liters',
        currentStock: '50.00',
        reorderLevel: '10.00',
        costPerUnit: '50.00',
      },
      {
        name: 'Sugar',
        unit: 'kg',
        currentStock: '10.00',
        reorderLevel: '2.00',
        costPerUnit: '44.00',
      },
      {
        name: 'Glass/Straw/Lid',
        unit: 'sets',
        currentStock: '500.00',
        reorderLevel: '50.00',
        costPerUnit: '3.00',
      },
    ];

    const insertedInventory = await db.insert(inventoryItems).values(inventoryData).returning();

    // 5. Menu Items with EXACT requested Image URLs (20 in Shakes @ ₹50, 1 in Special Shakes @ ₹70)
    console.log('Inserting 21 Menu Items with provided image URLs...');
    const menuItemsToInsert = [
      // Shakes Category (20 items @ ₹50.00)
      {
        categoryId: shakesCat.id,
        name: 'Mango Shake',
        description: 'Thick fresh Alphonso Mango Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1635716279493-d1e30afc25a0?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Chiku Shake',
        description: 'Natural fresh Sapota Chiku Milkshake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1699863164964-13805b27bc42?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Sitaphal Shake',
        description: 'Exotic Custard Apple Sitaphal Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1680008702737-aad40d0f1e56?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Strawberry Shake',
        description: 'Fresh pink Strawberry Milkshake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=1315&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Jamun Shake',
        description: 'Vibrant purple Black Plum Jamun Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://plus.unsplash.com/premium_photo-1675365352000-0ed2b799d7b3?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Tender Coconut Shake',
        description: 'Refreshing Tender Coconut Elaneer Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1603779046675-2eccbab9b982?q=80&w=1333&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Banana Shake',
        description: 'Creamy fresh Banana Milkshake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Apple Shake',
        description: 'Fresh Red Apple Milkshake',
        sellingPrice: '50.00',
        imageUrl:
          'https://plus.unsplash.com/premium_photo-1724249990837-f6dfcb7f3eaa?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Dragon Fruit Shake',
        description: 'Exotic magenta Pink Dragon Fruit Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1698546690393-45482eb06942?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Mix Fruit Shake',
        description: 'Special multi-fruit shake blend',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1628689469838-524a4a973b8e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Oreo Shake',
        description: 'Rich thick chocolate Oreo Shake with crushed biscuits',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1672753261221-608b9d15d597?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Chocolate Shake',
        description: 'Decadent thick Belgian Chocolate Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1623660053975-cf75a8be0908?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Boost Shake',
        description: 'Malty chocolate Boost Shake with malt powder',
        sellingPrice: '50.00',
        imageUrl:
          'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRlXLUx4qd2J_ij_WgBoYmgPr5hRxvgfLe809pQN6xDMsRgPudTPnC76teZXjWinu25sFPh3tuwxdGsEWj4hgFT8VWEQTQ-5_qssnWpgtzaJYn4WAxrcC8Fa1c',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Cold Coffee',
        description: 'Smooth frosted Cold Coffee with creamy foam',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1961&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Vanilla Shake',
        description: 'Classic creamy French Vanilla Milkshake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1581524674552-80462a204517?q=80&w=988&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Butterscotch Shake',
        description: 'Golden Butterscotch Shake with crunchy praline',
        sellingPrice: '50.00',
        imageUrl:
          'https://icecreambakery.in/wp-content/uploads/2025/02/butterscotch-ice-cream-recipe.jpg',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Dry Fruits Shake',
        description: 'Royal Dry Fruit Shake with figs, dates, kaju & badam',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1607664608695-45aaa6d621fc?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Dates Shake',
        description: 'Rich healthy Arabian Date Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://images.unsplash.com/photo-1614061811858-dde54a522f5e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Anjeer Shake',
        description: 'Luxurious dried Fig Anjeer Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://plus.unsplash.com/premium_photo-1669205340693-755739ea443d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
      {
        categoryId: shakesCat.id,
        name: 'Kaaju Badam Shake',
        description: 'Nutty Cashew and Almond Shake',
        sellingPrice: '50.00',
        imageUrl:
          'https://plus.unsplash.com/premium_photo-1675237626334-5cf9d9d8b30c?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },

      // Special Shakes Category (Only Nutella Shake @ ₹70.00)
      {
        categoryId: specialCat.id,
        name: 'Nutella Shake',
        description: 'Indulgent thick Nutella Hazelnut Chocolate Shake',
        sellingPrice: '70.00',
        imageUrl:
          'https://images.unsplash.com/photo-1543254077-8bd7c22afbf1?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        isAvailable: true,
      },
    ];

    const insertedMenuItems = await db.insert(menuItems).values(menuItemsToInsert).returning();

    // 6. Recipe Ingredients Mapping
    console.log('Inserting Recipes...');
    const recipeList: any[] = [];

    const getMenuItemId = (name: string) =>
      insertedMenuItems.find((m) => m.name.toLowerCase() === name.toLowerCase())?.id;

    const addRecipe = (
      menuItemName: string,
      ingredientName: string,
      qty: string,
      unit: string,
      costPerUnit: string,
    ) => {
      const menuItemId = getMenuItemId(menuItemName);
      if (menuItemId) {
        recipeList.push({
          menuItemId,
          ingredientName,
          unit,
          quantity: qty,
          costPerUnit,
        });
      }
    };

    // Oreo Shake: Oreo 2 PC, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Oreo Shake', 'Oreo Biscuit', '2', 'packs', '9.00');
    addRecipe('Oreo Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Oreo Shake', 'Sugar', '0.03', 'kg', '44.00');
    addRecipe('Oreo Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Chocolate Shake: Choco Syrup 8mL, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Chocolate Shake', 'Chocolate Syrup', '0.01', 'bottles', '150.00');
    addRecipe('Chocolate Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Chocolate Shake', 'Sugar', '0.03', 'kg', '44.00');
    addRecipe('Chocolate Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Boost Shake: Boost 0.6 pack, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Boost Shake', 'Boost Powder', '0.6', 'packs', '5.00');
    addRecipe('Boost Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Boost Shake', 'Sugar', '0.03', 'kg', '44.00');
    addRecipe('Boost Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Cold Coffee: Coffee 0.6 pack, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Cold Coffee', 'Coffee Powder', '0.6', 'packs', '5.00');
    addRecipe('Cold Coffee', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Cold Coffee', 'Sugar', '0.03', 'kg', '44.00');
    addRecipe('Cold Coffee', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Vanilla Shake: Vanilla Syrup, Milk 250mL, Sugar 37g, Glass 1
    addRecipe('Vanilla Shake', 'Vanilla Syrup', '0.02', 'bottles', '150.00');
    addRecipe('Vanilla Shake', 'Milk', '0.25', 'liters', '50.00');
    addRecipe('Vanilla Shake', 'Sugar', '0.037', 'kg', '44.00');
    addRecipe('Vanilla Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Butterscotch Shake: Butterscotch Syrup, Milk 250mL, Sugar 37g, Glass 1
    addRecipe('Butterscotch Shake', 'Butterscotch Syrup', '0.02', 'bottles', '150.00');
    addRecipe('Butterscotch Shake', 'Milk', '0.25', 'liters', '50.00');
    addRecipe('Butterscotch Shake', 'Sugar', '0.037', 'kg', '44.00');
    addRecipe('Butterscotch Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Nutella Shake: Nutella 17.5g, Milk 250mL, Sugar 37.5g, Glass 1
    addRecipe('Nutella Shake', 'Nutella Chocolate', '0.05', 'jars', '321.00');
    addRecipe('Nutella Shake', 'Milk', '0.25', 'liters', '50.00');
    addRecipe('Nutella Shake', 'Sugar', '0.0375', 'kg', '44.00');
    addRecipe('Nutella Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Mango Shake: Mango Pulp 42g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Mango Shake', 'Mango Pulp', '0.042', 'kg', '210.00');
    addRecipe('Mango Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Mango Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Mango Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Chiku Shake: Chiku Pulp 42g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Chiku Shake', 'Chiku Pulp', '0.042', 'kg', '150.00');
    addRecipe('Chiku Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Chiku Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Chiku Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Sitaphal Shake: Sitaphal Pulp 42g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Sitaphal Shake', 'Sitaphal Pulp', '0.042', 'kg', '230.00');
    addRecipe('Sitaphal Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Sitaphal Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Sitaphal Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Strawberry Shake: Strawberry 42g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Strawberry Shake', 'Strawberry', '0.042', 'kg', '180.00');
    addRecipe('Strawberry Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Strawberry Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Strawberry Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Jamun Shake: Jamun Pulp 42g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Jamun Shake', 'Jamun Pulp', '0.042', 'kg', '190.00');
    addRecipe('Jamun Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Jamun Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Jamun Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Tender Coconut Shake: Coconut Pulp 42g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Tender Coconut Shake', 'Coconut Pulp', '0.042', 'kg', '240.00');
    addRecipe('Tender Coconut Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Tender Coconut Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Tender Coconut Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Banana Shake: Banana 0.15kg, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Banana Shake', 'Banana', '0.15', 'kg', '40.00');
    addRecipe('Banana Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Banana Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Banana Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Apple Shake: Apple 0.1kg, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Apple Shake', 'Apple', '0.10', 'kg', '120.00');
    addRecipe('Apple Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Apple Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Apple Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Dragon Fruit Shake: Dragon Fruit 0.1kg, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Dragon Fruit Shake', 'Dragon Fruit', '0.10', 'kg', '150.00');
    addRecipe('Dragon Fruit Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Dragon Fruit Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Dragon Fruit Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Mix Fruit Shake: Chiku 8.3g, Sitaphal 8.3g, Strawberry 8.3g, Jamun 8.3g, Coconut 8.3g, Milk 166mL, Sugar 25g, Glass 1
    addRecipe('Mix Fruit Shake', 'Chiku Pulp', '0.0083', 'kg', '150.00');
    addRecipe('Mix Fruit Shake', 'Sitaphal Pulp', '0.0083', 'kg', '230.00');
    addRecipe('Mix Fruit Shake', 'Strawberry', '0.0083', 'kg', '180.00');
    addRecipe('Mix Fruit Shake', 'Jamun Pulp', '0.0083', 'kg', '190.00');
    addRecipe('Mix Fruit Shake', 'Coconut Pulp', '0.0083', 'kg', '240.00');
    addRecipe('Mix Fruit Shake', 'Milk', '0.166', 'liters', '50.00');
    addRecipe('Mix Fruit Shake', 'Sugar', '0.025', 'kg', '44.00');
    addRecipe('Mix Fruit Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Dry Fruits Shake: Anjeer 6g, Dates 14g, Kaju 1g, Badam 1g, Boost 1 pack, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Dry Fruits Shake', 'Anjeer', '0.006', 'kg', '1000.00');
    addRecipe('Dry Fruits Shake', 'Dates', '0.014', 'kg', '130.00');
    addRecipe('Dry Fruits Shake', 'Kaju', '0.001', 'kg', '700.00');
    addRecipe('Dry Fruits Shake', 'Badam', '0.001', 'kg', '800.00');
    addRecipe('Dry Fruits Shake', 'Boost Powder', '1', 'packs', '5.00');
    addRecipe('Dry Fruits Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Dry Fruits Shake', 'Sugar', '0.030', 'kg', '44.00');
    addRecipe('Dry Fruits Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Dates Shake: Dates 30g, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Dates Shake', 'Dates', '0.030', 'kg', '130.00');
    addRecipe('Dates Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Dates Shake', 'Sugar', '0.030', 'kg', '44.00');
    addRecipe('Dates Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Anjeer Shake: Anjeer 30g, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Anjeer Shake', 'Anjeer', '0.030', 'kg', '1000.00');
    addRecipe('Anjeer Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Anjeer Shake', 'Sugar', '0.030', 'kg', '44.00');
    addRecipe('Anjeer Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    // Kaaju Badam Shake: Kaju 15g, Badam 15g, Milk 200mL, Sugar 30g, Glass 1
    addRecipe('Kaaju Badam Shake', 'Kaju', '0.015', 'kg', '700.00');
    addRecipe('Kaaju Badam Shake', 'Badam', '0.015', 'kg', '800.00');
    addRecipe('Kaaju Badam Shake', 'Milk', '0.20', 'liters', '50.00');
    addRecipe('Kaaju Badam Shake', 'Sugar', '0.030', 'kg', '44.00');
    addRecipe('Kaaju Badam Shake', 'Glass/Straw/Lid', '1', 'sets', '3.00');

    if (recipeList.length > 0) {
      await db.insert(recipes).values(recipeList);
    }

    console.log(
      `✅ Seeding finished successfully! Inserted ${insertedMenuItems.length} Menu Items with custom image URLs and ${insertedInventory.length} Inventory Stock Items.`,
    );
  } catch (err) {
    console.error('Error seeding Frozen Shake data:', err);
  } finally {
    process.exit(0);
  }
}

seedFrozenShakeData();
