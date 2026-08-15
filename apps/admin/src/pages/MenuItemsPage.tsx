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
  Checkbox,
  BlockStack,
  Box,
  Thumbnail,
  useIndexResourceState,
  Banner,
  Divider,
  DropZone,
} from '@shopify/polaris';
import { PlusIcon, EditIcon, DeleteIcon, ImageIcon } from '@shopify/polaris-icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_MENU,
  GET_INVENTORY,
  CREATE_MENU_ITEM,
  UPDATE_MENU_ITEM,
  TOGGLE_MENU_ITEM_AVAILABILITY,
  DELETE_MENU_ITEM,
} from '../graphql/queries';

export interface IngredientRow {
  inventoryItemId: string;
  quantity: string;
}

export interface MenuItemData {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  sellingPrice: string;
  priceNum: number;
  isAvailable: boolean;
  description?: string;
  imageUrl?: string;
  recipes?: Array<{
    id?: string;
    ingredientName: string;
    unit: string;
    quantity: string;
    costPerUnit?: string;
  }>;
}

export const MenuItemsPage: React.FC = () => {
  // Add / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);

  // Form states
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  // Polaris Confirmation Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActionLabel, setConfirmActionLabel] = useState('');
  const [confirmTone, setConfirmTone] = useState<'critical' | 'primary'>('primary');
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Apollo queries & mutations
  const { data, loading, error, refetch } = useQuery(GET_MENU);
  const { data: inventoryData } = useQuery(GET_INVENTORY);

  const [createMenuItem, { loading: createLoading }] = useMutation(CREATE_MENU_ITEM, {
    onCompleted: () => {
      refetch();
      handleCloseModal();
    },
  });

  const [updateMenuItem, { loading: updateLoading }] = useMutation(UPDATE_MENU_ITEM, {
    onCompleted: () => {
      refetch();
      handleCloseModal();
    },
  });

  const [toggleAvailability] = useMutation(TOGGLE_MENU_ITEM_AVAILABILITY, {
    onCompleted: () => refetch(),
  });

  const [deleteMenuItem] = useMutation(DELETE_MENU_ITEM, {
    onCompleted: () => refetch(),
  });

  // Extract menu items and categories from GraphQL response
  const { itemsList, categoryOptions } = useMemo(() => {
    if (!data?.menu) return { itemsList: [], categoryOptions: [] };

    const items: MenuItemData[] = [];
    const catOpts = data.menu.map((group: any) => ({
      label: group.category.name,
      value: group.category.id,
    }));

    data.menu.forEach((group: any) => {
      const category = group.category;
      group.items?.forEach((item: any) => {
        const pNum = parseFloat(item.sellingPrice) || 0;
        items.push({
          id: item.id,
          categoryId: category.id,
          categoryName: category.name,
          name: item.name,
          sellingPrice: item.sellingPrice,
          priceNum: pNum,
          isAvailable: item.isAvailable,
          description: item.description || '',
          imageUrl: item.imageUrl || '',
          recipes: item.recipes || [],
        });
      });
    });

    items.sort((a, b) => a.name.localeCompare(b.name));

    return { itemsList: items, categoryOptions: catOpts };
  }, [data]);

  // Inventory options for ingredients picker
  const inventoryOptions = useMemo(() => {
    if (!inventoryData?.inventory) return [];
    return inventoryData.inventory.map((inv: any) => ({
      label: `${inv.name} (${inv.unit})`,
      value: inv.id,
    }));
  }, [inventoryData]);

  // Filtered items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return itemsList;
    const q = searchQuery.toLowerCase();
    return itemsList.filter(
      (item) => item.name.toLowerCase().includes(q) || item.categoryName?.toLowerCase().includes(q),
    );
  }, [itemsList, searchQuery]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    filteredItems as any,
  );

  const handleOpenAddModal = useCallback(() => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(categoryOptions[0]?.value || '');
    setItemPrice('');
    setItemDescription('');
    setItemImageUrl('');
    setItemAvailable(true);
    setIngredients([]);
    setIsModalOpen(true);
  }, [categoryOptions]);

  const handleOpenEditModal = useCallback(
    (item: MenuItemData) => {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategory(item.categoryId);
      setItemPrice(item.sellingPrice);
      setItemDescription(item.description || '');
      setItemImageUrl(item.imageUrl || '');
      setItemAvailable(item.isAvailable);

      // Map existing recipes to actual inventory item IDs by matching ingredientName
      if (item.recipes && item.recipes.length > 0) {
        const invList = inventoryData?.inventory || [];
        setIngredients(
          item.recipes.map((r: any) => {
            const match = invList.find(
              (inv: any) => inv.name.toLowerCase().trim() === r.ingredientName.toLowerCase().trim(),
            );
            return {
              inventoryItemId: match ? match.id : invList[0]?.id || '',
              quantity: r.quantity || '1',
            };
          }),
        );
      } else {
        setIngredients([]);
      }

      setIsModalOpen(true);
    },
    [inventoryData],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
  }, []);

  // Confirmation Modal Trigger Handlers
  const triggerToggleConfirm = useCallback(
    (item: MenuItemData) => {
      const actionLabel = item.isAvailable ? 'Disable' : 'Enable';
      setConfirmTitle(`${actionLabel} Menu Item?`);
      setConfirmMessage(
        `Are you sure you want to ${actionLabel.toLowerCase()} "${item.name}"? ${
          item.isAvailable
            ? 'Customers will not be able to order this item.'
            : 'Item will become visible for ordering.'
        }`,
      );
      setConfirmActionLabel(actionLabel);
      setConfirmTone(item.isAvailable ? 'critical' : 'primary');
      setPendingAction(() => async () => {
        await toggleAvailability({ variables: { id: item.id } });
      });
      setIsConfirmOpen(true);
    },
    [toggleAvailability],
  );

  const triggerDeleteConfirm = useCallback(
    (item: MenuItemData) => {
      setConfirmTitle(`Delete "${item.name}"?`);
      setConfirmMessage(
        `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      );
      setConfirmActionLabel('Delete Item');
      setConfirmTone('critical');
      setPendingAction(() => async () => {
        await deleteMenuItem({ variables: { id: item.id } });
      });
      setIsConfirmOpen(true);
    },
    [deleteMenuItem],
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

  // Ingredients builder helpers
  const handleAddIngredient = useCallback(() => {
    if (inventoryOptions.length === 0) return;
    setIngredients((prev) => [
      ...prev,
      { inventoryItemId: inventoryOptions[0].value, quantity: '1' },
    ]);
  }, [inventoryOptions]);

  const handleRemoveIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleIngredientChange = useCallback(
    (index: number, field: keyof IngredientRow, value: string) => {
      setIngredients((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDropZoneDrop = useCallback(
    async (_dropFiles: File[], acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      try {
        setIsUploadingImage(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success && data.url) {
          setItemImageUrl(data.url);
        } else {
          setUploadError(data.error || 'Failed to upload image to CDN');
        }
      } catch (err: any) {
        console.error('Image upload failed:', err);
        setUploadError(err.message || 'Image CDN upload failed');
      } finally {
        setIsUploadingImage(false);
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!itemName || !itemPrice || !itemCategory) return;

    const formattedIngredients = ingredients
      .filter((ing) => ing.inventoryItemId && parseFloat(ing.quantity) > 0)
      .map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        quantity: ing.quantity,
      }));

    if (editingItem) {
      await updateMenuItem({
        variables: {
          id: editingItem.id,
          input: {
            name: itemName,
            categoryId: itemCategory,
            sellingPrice: itemPrice,
            description: itemDescription,
            imageUrl: itemImageUrl,
            isAvailable: itemAvailable,
            ingredients: formattedIngredients.length > 0 ? formattedIngredients : undefined,
          },
        },
      });
    } else {
      await createMenuItem({
        variables: {
          input: {
            name: itemName,
            categoryId: itemCategory,
            sellingPrice: itemPrice,
            description: itemDescription,
            imageUrl: itemImageUrl,
            isAvailable: itemAvailable,
            ingredients: formattedIngredients.length > 0 ? formattedIngredients : undefined,
          },
        },
      });
    }
  }, [
    editingItem,
    itemName,
    itemPrice,
    itemCategory,
    itemDescription,
    itemImageUrl,
    itemAvailable,
    ingredients,
    createMenuItem,
    updateMenuItem,
  ]);

  const hasChanges = useMemo(() => {
    if (!editingItem) {
      return Boolean(itemName.trim() && itemPrice.trim() && itemCategory);
    }

    const nameChanged = itemName.trim() !== (editingItem.name || '').trim();
    const categoryChanged = itemCategory !== editingItem.categoryId;
    const priceChanged = itemPrice.trim() !== (editingItem.sellingPrice || '').trim();
    const descriptionChanged = itemDescription.trim() !== (editingItem.description || '').trim();
    const imageChanged = itemImageUrl.trim() !== (editingItem.imageUrl || '').trim();
    const availableChanged = itemAvailable !== editingItem.isAvailable;

    if (nameChanged || categoryChanged || priceChanged || descriptionChanged || imageChanged || availableChanged) {
      return true;
    }

    const invList = inventoryData?.inventory || [];
    const initialIngredients = (editingItem.recipes || []).map((r: any) => {
      const match = invList.find(
        (inv: any) => inv.name.toLowerCase().trim() === r.ingredientName.toLowerCase().trim(),
      );
      return {
        inventoryItemId: match ? match.id : invList[0]?.id || '',
        quantity: String(r.quantity || '1'),
      };
    });

    if (ingredients.length !== initialIngredients.length) {
      return true;
    }

    for (let i = 0; i < ingredients.length; i++) {
      if (
        ingredients[i].inventoryItemId !== initialIngredients[i].inventoryItemId ||
        String(ingredients[i].quantity) !== String(initialIngredients[i].quantity)
      ) {
        return true;
      }
    }

    return false;
  }, [
    editingItem,
    itemName,
    itemCategory,
    itemPrice,
    itemDescription,
    itemImageUrl,
    itemAvailable,
    ingredients,
    inventoryData,
  ]);

  const rowMarkup = filteredItems.map((item, index) => (
    <IndexTable.Row
      id={item.id}
      key={item.id}
      selected={selectedResources.includes(item.id)}
      position={index}
    >
      <IndexTable.Cell>
        <InlineStack gap="300" blockAlign="center">
          <Thumbnail source={item.imageUrl || ImageIcon} alt={item.name} size="small" />
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {item.name}
          </Text>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>{item.categoryName || 'Uncategorized'}</IndexTable.Cell>
      <IndexTable.Cell>₹{item.priceNum.toFixed(2)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={item.isAvailable ? 'success' : 'critical'}>
          {item.isAvailable ? 'Available' : 'Unavailable'}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div onClick={(e) => e.stopPropagation()}>
          <InlineStack gap="200" align="end">
            <Button size="micro" onClick={() => triggerToggleConfirm(item)}>
              {item.isAvailable ? 'Disable' : 'Enable'}
            </Button>
            <Button icon={EditIcon} size="micro" onClick={() => handleOpenEditModal(item)} />
            <Button
              icon={DeleteIcon}
              size="micro"
              tone="critical"
              onClick={() => triggerDeleteConfirm(item)}
            />
          </InlineStack>
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Menu Items Management"
      subtitle="Edit pricing, image URLs, ingredients, and availability"
      primaryAction={{
        content: 'Add Menu Item',
        icon: PlusIcon,
        onAction: handleOpenAddModal,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {error && (
              <Banner tone="warning" title="Backend Connection Note">
                <p>
                  Error querying GraphQL API: {error.message}. Please verify backend server status.
                </p>
              </Banner>
            )}

            <Card padding="0">
              <Box padding="400">
                <TextField
                  label="Search menu items"
                  labelHidden
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Filter menu items by name or category..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchQuery('')}
                />
              </Box>

              <IndexTable
                resourceName={{ singular: 'menu item', plural: 'menu items' }}
                itemCount={filteredItems.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                loading={loading}
                headings={[
                  { title: 'Item Name' },
                  { title: 'Category' },
                  { title: 'Selling Price' },
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

      {/* Add / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Menu Item Details' : 'Add New Menu Item'}
        primaryAction={{
          content: editingItem ? 'Save Changes' : 'Create Item',
          onAction: handleSave,
          loading: createLoading || updateLoading || isUploadingImage,
          disabled: !hasChanges || isUploadingImage,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseModal,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Item Name"
              value={itemName}
              onChange={setItemName}
              placeholder="e.g. Chocolate Frozen Shake"
              autoComplete="off"
            />
            {categoryOptions.length > 0 && (
              <Select
                label="Category"
                options={categoryOptions}
                onChange={setItemCategory}
                value={itemCategory}
              />
            )}
            <TextField
              label="Selling Price (₹)"
              type="number"
              value={itemPrice}
              onChange={setItemPrice}
              placeholder="120"
              autoComplete="off"
            />
            <BlockStack gap="200">
              <Text as="span" variant="bodyMd" fontWeight="bold">
                Menu Item Image
              </Text>
              {uploadError && (
                <Banner tone="critical" onDismiss={() => setUploadError(null)}>
                  <p>{uploadError}</p>
                </Banner>
              )}
              {itemImageUrl ? (
                <Card padding="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail source={itemImageUrl} alt="Preview" size="large" />
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          CDN Image Uploaded
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Hosted CDN URL: {itemImageUrl.length > 40 ? `${itemImageUrl.slice(0, 40)}...` : itemImageUrl}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Button tone="critical" onClick={() => setItemImageUrl('')}>
                      Remove Image
                    </Button>
                  </InlineStack>
                </Card>
              ) : (
                <DropZone onDrop={handleDropZoneDrop} accept="image/*" type="image" allowMultiple={false} disabled={isUploadingImage}>
                  <DropZone.FileUpload
                    actionTitle={isUploadingImage ? "Uploading to Free CDN..." : "Upload Image from Device"}
                    actionHint="Accepts .png, .jpg, .jpeg, .webp, .svg (Auto-hosted on Free CDN)"
                  />
                </DropZone>
              )}
              <TextField
                label="Or enter direct Image CDN URL"
                value={itemImageUrl}
                onChange={setItemImageUrl}
                placeholder="https://files.catbox.moe/..."
                autoComplete="off"
                helpText="Upload an image file from your device to Free CDN or paste a direct image URL"
              />
            </BlockStack>
            <TextField
              label="Description"
              value={itemDescription}
              onChange={setItemDescription}
              placeholder="Rich creamy chocolate shake..."
              autoComplete="off"
              multiline={2}
            />
            <Checkbox
              label="Available for ordering"
              checked={itemAvailable}
              onChange={setItemAvailable}
            />

            <Divider />

            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  Ingredients / Recipe Composition
                </Text>
                <Button
                  icon={PlusIcon}
                  size="micro"
                  onClick={handleAddIngredient}
                  disabled={inventoryOptions.length === 0}
                >
                  Add Ingredient
                </Button>
              </InlineStack>

              {ingredients.length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  No recipe ingredients configured. Click "Add Ingredient" to link inventory stock.
                </Text>
              ) : (
                ingredients.map((ing, idx) => (
                  <InlineStack key={idx} gap="300" blockAlign="center">
                    <Box width="60%">
                      <Select
                        label="Inventory Ingredient"
                        labelHidden
                        options={inventoryOptions}
                        value={ing.inventoryItemId}
                        onChange={(val) => handleIngredientChange(idx, 'inventoryItemId', val)}
                      />
                    </Box>
                    <Box width="30%">
                      <TextField
                        label="Quantity"
                        labelHidden
                        type="number"
                        value={ing.quantity}
                        onChange={(val) => handleIngredientChange(idx, 'quantity', val)}
                        placeholder="Qty"
                        autoComplete="off"
                      />
                    </Box>
                    <Button
                      icon={DeleteIcon}
                      tone="critical"
                      size="micro"
                      onClick={() => handleRemoveIngredient(idx)}
                    />
                  </InlineStack>
                ))
              )}
            </BlockStack>
          </FormLayout>
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
