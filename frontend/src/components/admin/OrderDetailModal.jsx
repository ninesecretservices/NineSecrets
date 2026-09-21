import { useState } from 'react';
import { X, Download, Truck } from 'lucide-react';
import api, { resolveImageUrl } from '../../utils/api';
import { downloadInvoice } from '../../utils/invoice';
import useStore from '../../store/useStore';

// Shared by the Orders list and the Returns worklist — both need the exact
// same "view an order, resolve its return, update shipment info" flow.
export default function OrderDetailModal({ order, onClose, onResolved }) {
  const toast = useStore((s) => s.toast);
  const [courier, setCourier] = useState(order.shipment?.courier || '');
  const [awbNumber, setAwbNumber] = useState(order.shipment?.awbNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.shipment?.trackingUrl || '');
  const [savingShipment, setSavingShipment] = useState(false);

  const resolveReturn = async (status) => {
    try {
      const res = await api.post('/order/return-update', { id: order._id, status });
      onResolved(res.data.data);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update return request', 'error');
    }
  };

  const saveShipment = async () => {
    setSavingShipment(true);
    try {
      const res = await api.post('/order/update', {
        id: order._id,
        shipment: { courier, awbNumber, trackingUrl },
      });
      onResolved(res.data.data);
      toast('Shipment info saved');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save shipment info', 'error');
    }
    setSavingShipment(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-xl italic text-ink">{order.orderNumber}</h3>
            <p className="text-xs text-mauve">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  await downloadInvoice(order);
                } catch {
                  toast('Could not download invoice', 'error');
                }
              }}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark hover:text-ink"
            >
              <Download size={14} strokeWidth={1.5} /> Invoice
            </button>
            <button onClick={onClose} className="text-mauve hover:text-ink" aria-label="Close">
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-cream p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">Customer</p>
            <p className="font-medium text-ink">{order.user?.name || '—'}</p>
            <p className="text-mauve-dark">{order.user?.email}</p>
          </div>
          <div className="rounded-xl bg-cream p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">Shipping Address</p>
            {order.shippingAddress?.fullName ? (
              <>
                <p className="font-medium text-ink">{order.shippingAddress.fullName}</p>
                <p className="text-mauve-dark">
                  {[order.shippingAddress.addressLine1, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                    .filter(Boolean).join(', ')}
                </p>
                <p className="text-mauve-dark">{order.shippingAddress.phone}</p>
              </>
            ) : (
              <p className="text-mauve">Not provided</p>
            )}
          </div>
        </div>

        <table className="mb-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-beige text-[11px] uppercase tracking-[0.1em] text-mauve">
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">Qty</th>
              <th className="py-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((it, i) => (
              <tr key={i} className="border-b border-beige/60">
                <td className="py-2.5 pr-3 text-ink">{it.name}</td>
                <td className="py-2.5 pr-3 text-mauve-dark">{it.variant?.sku || '—'}</td>
                <td className="py-2.5 pr-3 text-mauve-dark">{it.quantity}</td>
                <td className="py-2.5 text-right font-medium text-ink">₹{it.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-56 space-y-1.5 text-sm">
          <div className="flex justify-between text-mauve-dark"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
          {order.coupon?.discount > 0 && (
            <div className="flex justify-between text-mauve-dark"><span>Discount ({order.coupon.code})</span><span>−₹{order.coupon.discount}</span></div>
          )}
          <div className="flex justify-between text-mauve-dark"><span>Tax</span><span>₹{order.tax}</span></div>
          <div className="flex justify-between text-mauve-dark">
            <span>Shipping{order.shippingMethod === 'express' ? ' (Express)' : ''}</span>
            <span>₹{order.shippingFee}</span>
          </div>
          <div className="flex justify-between border-t border-beige pt-1.5 font-bold text-ink"><span>Total</span><span>₹{order.total}</span></div>
        </div>

        {/* Shipment / tracking — manual entry, no live courier API */}
        {['shipped', 'delivered'].includes(order.orderStatus) && (
          <div className="mt-6 rounded-xl border border-beige p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">
              <Truck size={13} strokeWidth={1.5} /> Shipment
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <input
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder="Courier (e.g. Delhivery)"
                className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <input
                value={awbNumber}
                onChange={(e) => setAwbNumber(e.target.value)}
                placeholder="AWB / Tracking No."
                className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="Tracking URL (optional)"
                className="rounded-lg border border-beige px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <button
              onClick={saveShipment}
              disabled={savingShipment}
              className="mt-3 rounded-full bg-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-cream disabled:opacity-50"
            >
              {savingShipment ? 'Saving...' : 'Save Shipment Info'}
            </button>
          </div>
        )}

        {/* Return / exchange handling */}
        {order.returnRequest?.status && order.returnRequest.status !== 'none' && (
          <div className="mt-6 rounded-xl bg-cream p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-mauve">
              {order.returnRequest.type} request — <span className="capitalize text-ink">{order.returnRequest.status}</span>
            </p>
            <p className="mb-3 text-sm text-mauve-dark">"{order.returnRequest.reason}"</p>
            {order.returnRequest.photos?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {order.returnRequest.photos.map((url) => (
                  <a key={url} href={resolveImageUrl(url)} target="_blank" rel="noreferrer">
                    <img src={resolveImageUrl(url)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            )}
            {['requested', 'approved'].includes(order.returnRequest.status) && (
              <div className="flex gap-2">
                {order.returnRequest.status === 'requested' && (
                  <>
                    <button
                      onClick={() => resolveReturn('approved')}
                      className="rounded-full bg-pastel-green px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => resolveReturn('rejected')}
                      className="rounded-full bg-blush px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink"
                    >
                      Reject
                    </button>
                  </>
                )}
                {order.returnRequest.status === 'approved' && (
                  <button
                    onClick={() => resolveReturn('completed')}
                    className="rounded-full bg-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-cream"
                  >
                    Mark Completed (restocks items{order.returnRequest.type === 'return' ? ' + refund' : ' — creates replacement order'})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
