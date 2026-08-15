import React, { useState, useCallback, useMemo } from 'react';
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Button,
  InlineStack,
  Text,
  Modal,
  FormLayout,
  TextField,
  Select,
  BlockStack,
  Box,
  useIndexResourceState,
  Banner,
  Tabs,
  Divider,
} from '@shopify/polaris';
import { PlusIcon, EditIcon, DeleteIcon, RefreshIcon } from '@shopify/polaris-icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_INVENTORY,
  CREATE_INVENTORY_ITEM,
  UPDATE_INVENTORY_ITEM,
  DELETE_INVENTORY_ITEM,
  ADJUST_INVENTORY_STOCK,
} from '../graphql/queries';

export interface InventoryItemData {
  id: string;
  name: string;
  unit: string;
  currentStock: string;
  stockNum: number;
  reorderLevel: string;
  reorderNum: number;
  costPerUnit: string;
  costNum: number;
  updatedAt: string;
  needsRestock: boolean;
}

export const InventoryPage: React.FC = () => {
  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemData | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemData | null>(null);
  const [selectedAdjustTab, setSelectedAdjustTab] = useState(0); // 0 = Add (+), 1 = Decrease (-)

  // Polaris Confirmation Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActionLabel, setConfirmActionLabel] = useState('');
  const [confirmTone, setConfirmTone] = useState<'critical' | 'primary'>('primary');
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form states for Item Create/Edit
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [currentStock, setCurrentStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('100');
  const [costPerUnit, setCostPerUnit] = useState('0');

  // Form states for Stock Adjustment
  const [quantityDelta, setQuantityDelta] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Apollo queries & mutations
  const { data, loading, error, refetch } = useQuery(GET_INVENTORY);

  const [createInventoryItem, { loading: createLoading }] = useMutation(CREATE_INVENTORY_ITEM, {
    onCompleted: () => {
      refetch();
      handleCloseItemModal();
    },
  });

  const [updateInventoryItem, { loading: updateLoading }] = useMutation(UPDATE_INVENTORY_ITEM, {
    onCompleted: () => {
      refetch();
      handleCloseItemModal();
    },
  });

  const [deleteInventoryItem] = useMutation(DELETE_INVENTORY_ITEM, {
    onCompleted: () => refetch(),
  });

  const [adjustStock, { loading: adjustLoading }] = useMutation(ADJUST_INVENTORY_STOCK, {
    onCompleted: () => {
      refetch();
      handleCloseAdjustModal();
    },
  });

  const inventoryList: InventoryItemData[] = useMemo(() => {
    if (!data?.inventory) return [];
    return data.inventory.map((inv: any) => ({
      id: inv.id,
      name: inv.name,
      unit: inv.unit,
      currentStock: inv.currentStock,
      stockNum: parseFloat(inv.currentStock) || 0,
      reorderLevel: inv.reorderLevel,
      reorderNum: parseFloat(inv.reorderLevel) || 0,
      costPerUnit: inv.costPerUnit,
      costNum: parseFloat(inv.costPerUnit) || 0,
      updatedAt: inv.updatedAt,
      needsRestock: inv.needsRestock || false,
    }));
  }, [data]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventoryList;
    const q = searchQuery.toLowerCase();
    return inventoryList.filter(
      (item) => item.name.toLowerCase().includes(q) || item.unit.toLowerCase().includes(q),
    );
  }, [inventoryList, searchQuery]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    filteredInventory as any,
  );

  // Item Modal Handlers
  const handleOpenAddModal = useCallback(() => {
    setEditingItem(null);
    setName('');
    setUnit('g');
    setCurrentStock('0');
    setReorderLevel('100');
    setCostPerUnit('0');
    setIsItemModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((item: InventoryItemData) => {
    setEditingItem(item);
    setName(item.name);
    setUnit(item.unit);
    setCurrentStock(item.currentStock);
    setReorderLevel(item.reorderLevel);
    setCostPerUnit(item.costPerUnit);
    setIsItemModalOpen(true);
  }, []);

  const handleCloseItemModal = useCallback(() => {
    setIsItemModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleSaveItem = useCallback(async () => {
    if (!name || !unit) return;

    const stockVal = parseFloat(currentStock) || 0;
    const reorderVal = parseFloat(reorderLevel) || 0;
    const costVal = parseFloat(costPerUnit) || 0;

    if (editingItem) {
      await updateInventoryItem({
        variables: {
          id: editingItem.id,
          input: {
            name,
            unit,
            currentStock: stockVal,
            reorderLevel: reorderVal,
            costPerUnit: costVal,
          },
        },
      });
    } else {
      await createInventoryItem({
        variables: {
          input: {
            name,
            unit,
            currentStock: stockVal,
            reorderLevel: reorderVal,
            costPerUnit: costVal,
          },
        },
      });
    }
  }, [
    editingItem,
    name,
    unit,
    currentStock,
    reorderLevel,
    costPerUnit,
    createInventoryItem,
    updateInventoryItem,
  ]);

  // Adjust Modal Handlers
  const handleOpenAdjustModal = useCallback((item: InventoryItemData) => {
    setAdjustingItem(item);
    setSelectedAdjustTab(0); // Default to Add Stock (+)
    setQuantityDelta('');
    setIsAdjustModalOpen(true);
  }, []);

  const handleCloseAdjustModal = useCallback(() => {
    setIsAdjustModalOpen(false);
    setAdjustingItem(null);
  }, []);

  const handleSaveAdjustment = useCallback(async () => {
    if (!adjustingItem || !quantityDelta) return;

    const deltaNum = Math.abs(parseFloat(quantityDelta));
    if (isNaN(deltaNum) || deltaNum === 0) return;

    // Positive delta for Add (+), Negative delta for Decrease (-)
    const finalDelta = selectedAdjustTab === 0 ? deltaNum : -deltaNum;
    const adjType = selectedAdjustTab === 0 ? 'restock' : 'waste';

    await adjustStock({
      variables: {
        input: {
          inventoryItemId: adjustingItem.id,
          type: adjType,
          quantityDelta: finalDelta,
          note: `${selectedAdjustTab === 0 ? 'ADD' : 'DECREASE'} via Admin Dashboard`,
        },
      },
    });
  }, [adjustingItem, quantityDelta, selectedAdjustTab, adjustStock]);

  // Calculation totals for stock adjustment
  const currentStockVal = adjustingItem?.stockNum || 0;
  const inputDeltaVal = Math.abs(parseFloat(quantityDelta) || 0);
  const calculatedNewStock =
    selectedAdjustTab === 0
      ? currentStockVal + inputDeltaVal
      : Math.max(0, currentStockVal - inputDeltaVal);

  const adjustTabs = useMemo(
    () => [
      { id: 'add', content: 'Add Stock (+)' },
      { id: 'decrease', content: 'Decrease Stock (-)' },
    ],
    [],
  );

  // Confirmation Trigger for Delete Inventory Item
  const triggerDeleteItemConfirm = useCallback(
    (item: InventoryItemData) => {
      setConfirmTitle(`Delete Inventory Item "${item.name}"?`);
      setConfirmMessage(
        `Are you sure you want to delete "${item.name}"? This action will permanently remove it from inventory.`,
      );
      setConfirmActionLabel('Delete Item');
      setConfirmTone('critical');
      setPendingAction(() => async () => {
        await deleteInventoryItem({ variables: { id: item.id } });
      });
      setIsConfirmOpen(true);
    },
    [deleteInventoryItem],
  );

  const handleExecuteConfirm = useCallback(async () => {
    if (!pendingAction) return;
    try {
      setIsActionLoading(true);
      await pendingAction();
    } finally {
      setIsActionLoading(false);
      setIsConfirmOpen(false);
      setPendingAction(null);
    }
  }, [pendingAction]);

  const rowMarkup = filteredInventory.map((item, index) => (
    <IndexTable.Row
      id={item.id}
      key={item.id}
      selected={selectedResources.includes(item.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {item.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {item.stockNum.toLocaleString()} {item.unit}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {item.reorderNum.toLocaleString()} {item.unit}
      </IndexTable.Cell>
      <IndexTable.Cell>
        ₹{item.costNum.toFixed(2)} / {item.unit}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={item.needsRestock ? 'critical' : 'success'}>
          {item.needsRestock ? 'Low Stock' : 'Sufficient'}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div onClick={(e) => e.stopPropagation()}>
          <InlineStack gap="200" align="end">
            <Button icon={RefreshIcon} size="micro" onClick={() => handleOpenAdjustModal(item)}>
              Adjust Stock
            </Button>
            <Button icon={EditIcon} size="micro" onClick={() => handleOpenEditModal(item)} />
            <Button
              icon={DeleteIcon}
              size="micro"
              tone="critical"
              onClick={() => triggerDeleteItemConfirm(item)}
            />
          </InlineStack>
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Inventory Management"
      subtitle="Track ingredient stock levels, add new inventory, and record stock adjustments"
      primaryAction={{
        content: 'Add Inventory Item',
        icon: PlusIcon,
        onAction: handleOpenAddModal,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {error && (
              <Banner tone="warning" title="Inventory Load Error">
                <p>
                  Unable to connect to GraphQL inventory API: {error.message}. Ensure `npm run
                  server:admin` is running.
                </p>
              </Banner>
            )}

            <Card padding="0">
              <Box padding="400">
                <TextField
                  label="Search inventory items"
                  labelHidden
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Filter inventory by name or unit..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchQuery('')}
                />
              </Box>

              <IndexTable
                resourceName={{ singular: 'inventory item', plural: 'inventory items' }}
                itemCount={filteredInventory.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                loading={loading}
                headings={[
                  { title: 'Item Name' },
                  { title: 'Current Stock' },
                  { title: 'Reorder Threshold' },
                  { title: 'Cost per Unit' },
                  { title: 'Status' },
                  { title: 'Actions', alignment: 'end' },
                ]}
              >
                {rowMarkup}
              </IndexTable>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Add / Edit Inventory Item Modal */}
      <Modal
        open={isItemModalOpen}
        onClose={handleCloseItemModal}
        title={editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        primaryAction={{
          content: editingItem ? 'Save Changes' : 'Create Item',
          onAction: handleSaveItem,
          loading: createLoading || updateLoading,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseItemModal,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Item Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Whole Milk, Chocolate Syrup"
              autoComplete="off"
            />
            <Select
              label="Measurement Unit"
              options={[
                { label: 'Grams (g)', value: 'g' },
                { label: 'Kilograms (kg)', value: 'kg' },
                { label: 'Milliliters (ml)', value: 'ml' },
                { label: 'Liters (l)', value: 'l' },
                { label: 'Pieces (pcs)', value: 'pcs' },
                { label: 'Scoops', value: 'scoops' },
              ]}
              value={unit}
              onChange={setUnit}
            />
            <TextField
              label="Current Stock Quantity"
              type="number"
              value={currentStock}
              onChange={setCurrentStock}
              placeholder="1000"
              autoComplete="off"
            />
            <TextField
              label="Reorder Threshold Level"
              type="number"
              value={reorderLevel}
              onChange={setReorderLevel}
              placeholder="200"
              autoComplete="off"
              helpText="Alert Low Stock when quantity drops below this level"
            />
            <TextField
              label="Cost Per Unit (₹)"
              type="number"
              value={costPerUnit}
              onChange={setCostPerUnit}
              placeholder="0.25"
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Stock Adjustment Modal with Tabs & Live Totals */}
      <Modal
        open={isAdjustModalOpen}
        onClose={handleCloseAdjustModal}
        title={`Adjust Stock: ${adjustingItem?.name || ''}`}
        primaryAction={{
          content: selectedAdjustTab === 0 ? 'Add Stock (+)' : 'Reduce Stock (-)',
          onAction: handleSaveAdjustment,
          loading: adjustLoading,
          destructive: selectedAdjustTab === 1,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseAdjustModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Tabs tabs={adjustTabs} selected={selectedAdjustTab} onSelect={setSelectedAdjustTab} />

            <FormLayout>
              <TextField
                label={`Quantity to ${selectedAdjustTab === 0 ? 'Add (+)' : 'Reduce (-)'} (${adjustingItem?.unit || ''})`}
                type="number"
                value={quantityDelta}
                onChange={setQuantityDelta}
                placeholder="Enter quantity amount..."
                autoComplete="off"
              />
            </FormLayout>

            {/* Live Calculated Total Stock Section */}
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Stock Calculation Breakdown
                </Text>
                <InlineStack align="space-between">
                  <Text as="span" tone="subdued">
                    Current Inventory Stock:
                  </Text>
                  <Text as="span" fontWeight="bold">
                    {currentStockVal.toLocaleString()} {adjustingItem?.unit}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" tone="subdued">
                    {selectedAdjustTab === 0 ? 'Quantity Added:' : 'Quantity Reduced:'}
                  </Text>
                  <Text
                    as="span"
                    fontWeight="bold"
                    tone={selectedAdjustTab === 0 ? 'success' : 'critical'}
                  >
                    {selectedAdjustTab === 0 ? '+' : '-'}
                    {inputDeltaVal.toLocaleString()} {adjustingItem?.unit}
                  </Text>
                </InlineStack>
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="span" variant="bodyMd" fontWeight="bold">
                    Updated Total Stock:
                  </Text>
                  <Text
                    as="span"
                    variant="headingMd"
                    fontWeight="bold"
                    tone={
                      selectedAdjustTab === 0
                        ? 'success'
                        : calculatedNewStock < (adjustingItem?.reorderNum || 0)
                          ? 'critical'
                          : undefined
                    }
                  >
                    {calculatedNewStock.toLocaleString()} {adjustingItem?.unit}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Polaris Confirmation Modal */}
      <Modal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmTitle}
        primaryAction={{
          content: confirmActionLabel,
          destructive: confirmTone === 'critical',
          loading: isActionLoading,
          onAction: handleExecuteConfirm,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setIsConfirmOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">{confirmMessage}</Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
};
