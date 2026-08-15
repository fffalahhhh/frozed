import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { DELETE_PRE_ORDER, GET_PRE_ORDERS } from '../../graphql/queries';
import { fmt } from './posConstants';
import { triggerPOSToast } from './POSToast';

interface POSPreOrdersDrawerProps {
  preOrders: any[];
  onProcessPreOrder: (preOrder: any) => void;
  onClose: () => void;
}

export const POSPreOrdersDrawer: React.FC<POSPreOrdersDrawerProps> = ({
  preOrders,
  onProcessPreOrder,
  onClose,
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [deletePreOrderMutation] = useMutation(DELETE_PRE_ORDER, {
    refetchQueries: [{ query: GET_PRE_ORDERS }],
  });

  const handleProceed = async (ord: any, itemsList: any[]) => {
    try {
      setProcessingId(ord.id);
      await onProcessPreOrder({ ...ord, items: itemsList });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setCancellingId(id);
      await deletePreOrderMutation({ variables: { id } });
      triggerPOSToast('Pre-order cancelled', 'info');
    } catch (err: any) {
      triggerPOSToast(err?.message || 'Failed to cancel pre-order', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <aside className="pos-preorders-drawer">
      {/* Header */}
      <div className="pos-preorders-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--pos-amber)',
            }}
          />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
            Pending Pre-Orders ({preOrders.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--pos-text-muted)',
            padding: '2px',
          }}
          title="Close drawer"
        >
          ✕
        </button>
      </div>

      {/* List */}
      <div className="pos-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {preOrders.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '180px',
              color: 'var(--pos-text-muted)',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--pos-surface-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                fontSize: '18px',
              }}
            >
              ⏰
            </div>
            <span>No pending pre-orders</span>
          </div>
        ) : (
          preOrders.map((ord) => {
            let itemsList: any[] = [];
            if (Array.isArray(ord.items)) {
              itemsList = ord.items;
            } else if (typeof ord.items === 'string') {
              try {
                itemsList = JSON.parse(ord.items);
              } catch {
                itemsList = [];
              }
            }

            const totalQty = itemsList.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
            const isCancelling = cancellingId === ord.id;
            const isProcessing = processingId === ord.id;

            return (
              <div key={ord.id} className="pos-preorder-card">
                {/* Customer header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    paddingBottom: '6px',
                    borderBottom: '1px solid var(--pos-border-subtle)',
                    marginBottom: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {ord.customerName || 'Walk-in Customer'}
                    </div>
                    {ord.customerPhone && (
                      <div style={{ fontSize: '11px', color: 'var(--pos-text-muted)' }}>
                        📞 {ord.customerPhone}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleCancel(ord.id, e)}
                    disabled={isCancelling}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--pos-red-bg)',
                      border: '1px solid var(--pos-red-border)',
                      color: 'var(--pos-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                    title="Cancel pre-order"
                  >
                    {isCancelling ? '...' : '✕'}
                  </button>
                </div>

                {/* Items summary */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginBottom: '8px',
                  }}
                >
                  {itemsList.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                        color: 'var(--pos-text-secondary)',
                      }}
                    >
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          paddingRight: '4px',
                        }}
                      >
                        • {it.quantity}x {it.menuItemName || 'Item'}
                        {it.flavourName && (
                          <span
                            style={{
                              color: 'var(--pos-text-muted)',
                              fontSize: '10px',
                              marginLeft: '4px',
                            }}
                          >
                            ({it.flavourName})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total & Proceed Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--pos-border-subtle)',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--pos-text-muted)' }}>
                    Total ({totalQty} item{totalQty !== 1 ? 's' : ''})
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--pos-primary)' }}>
                    {fmt(parseFloat(ord.totalAmount || 0))}
                  </span>
                </div>

                <button
                  onClick={() => handleProceed(ord, itemsList)}
                  disabled={isProcessing || isCancelling}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'var(--pos-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: isProcessing ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: isProcessing ? 0.75 : 1,
                    boxShadow: 'var(--pos-shadow-xs)',
                  }}
                >
                  {isProcessing ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="pos-spinning"
                      >
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      <span>Loading Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Order</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
