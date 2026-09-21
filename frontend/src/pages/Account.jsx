import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  RotateCcw,
  Check,
  MapPin,
  Trash2,
  XCircle,
  Download,
  X,
} from 'lucide-react';
import useStore from '../store/useStore';
import api, { resolveImageUrl } from '../utils/api';
import { inr } from '../utils/format';
import useTitle from '../utils/useTitle';
import useConfirm from '../utils/useConfirm';
import { downloadInvoice } from '../utils/invoice';
import { uploadFile } from '../utils/upload';

const inputClass =
  'w-full border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink';

const TIMELINE = ['processing', 'shipped', 'delivered'];

function OrderTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-red-700">
        <XCircle size={13} strokeWidth={1.5} /> Cancelled
      </p>
    );
  }
  const idx = TIMELINE.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {TIMELINE.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-5 w-5 items-center justify-center text-[9px] ${
                i <= idx
                  ? 'bg-ink text-cream'
                  : 'border border-beige bg-white text-mauve'
              }`}
            >
              {i < idx ? <Check size={10} /> : i + 1}
            </div>
            <span
              className={`mt-1 text-[9px] capitalize ${i <= idx ? 'text-ink' : 'text-mauve'}`}
            >
              {step}
            </span>
          </div>
          {i < TIMELINE.length - 1 && (
            <div
              className={`mx-1 mb-4 h-px w-10 ${i < idx ? 'bg-ink' : 'bg-beige'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ReturnModal({ order, onClose, onDone }) {
  const [type, setType] = useState('return');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [desiredSku, setDesiredSku] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const canExchange = order.items.length === 1;
  const originalItem = order.items[0];

  useEffect(() => {
    if (type !== 'exchange' || !canExchange || product) return;
    api.post('/product/detail', { id: originalItem.product?._id || originalItem.product })
      .then((res) => setProduct(res.data.data))
      .catch(() => setProduct(null));
  }, [type, canExchange, originalItem, product]);

  const exchangeOptions = (product?.variants || [])
    .filter((v) => v.sku !== originalItem.variant?.sku)
    .map((v) => ({
      value: v.sku,
      label: `${v.colour?.name || ''} / ${v.size?.name || ''}${v.stock <= 0 ? ' — Out of stock' : ''}`,
      disabled: v.stock <= 0,
    }));

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (photos.length + files.length > 5) {
      setError('Up to 5 photos only');
      return;
    }
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadFile(f, `returns/${order._id}`)));
      setPhotos((p) => [...p, ...urls]);
    } catch {
      setError('Photo upload failed — please try again');
    }
    setUploading(false);
    e.target.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (type === 'exchange' && !desiredSku) {
      setError('Please choose the size/colour you want in exchange');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/order/return-request', {
        id: order._id,
        type,
        reason,
        photos,
        ...(type === 'exchange' && { desiredSku }),
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-y-auto bg-white p-6" style={{ maxHeight: '90vh' }}>
        <h3 className="mb-4 font-heading text-xl italic text-ink">
          Return / Exchange — {order.orderNumber}
        </h3>
        {error && (
          <div className="mb-4 bg-blush px-4 py-2.5 text-sm text-ink">
            {error}
          </div>
        )}
        <div className="mb-4 flex gap-2">
          {['return', 'exchange'].map((t) => (
            <button
              type="button"
              key={t}
              disabled={t === 'exchange' && !canExchange}
              onClick={() => setType(t)}
              className={`border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40 ${type === t ? 'border-ink bg-ink text-cream' : 'border-beige text-ink'}`}
            >
              {t}
            </button>
          ))}
        </div>
        {type === 'exchange' && !canExchange && (
          <p className="mb-4 text-xs text-mauve-dark">
            Exchanges are only available for orders with a single item — please contact support for multi-item orders.
          </p>
        )}
        {type === 'exchange' && canExchange && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              Exchange for
            </label>
            <select
              required
              value={desiredSku}
              onChange={(e) => setDesiredSku(e.target.value)}
              className="w-full border border-beige bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            >
              <option value="">{product ? 'Choose size/colour...' : 'Loading options...'}</option>
              {exchangeOptions.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <textarea
          rows={3}
          required
          minLength={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us what went wrong (size, fit, damage...)"
          className="mb-4 w-full border border-beige px-4 py-3 text-sm text-ink outline-none focus:border-ink"
        />
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
            Photos (optional, up to 5)
          </label>
          {photos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <div key={url} className="relative">
                  <img src={resolveImageUrl(url)} alt="" className="h-16 w-16 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-cream"
                    aria-label="Remove photo"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={handlePhotoUpload}
              className="w-full text-xs text-mauve-dark"
            />
          )}
          {uploading && <p className="mt-1 text-xs text-mauve">Uploading...</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-beige px-5 py-2.5 text-xs font-semibold uppercase text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-ink px-6 py-2.5 text-xs font-semibold uppercase text-cream disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileSection({ user, setUser, toast }) {
  const [name, setName] = useState(user.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/auth/profile');
        setAddresses(res.data.data?.addresses || []);
        setName(res.data.data?.name || user.name || '');
      } catch {
        // best-effort
      }
    })();
  }, [user.name]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await api.post('/auth/profile-update', payload);
      setUser({ ...user, name: res.data.data.name });
      setCurrentPassword('');
      setNewPassword('');
      toast('Profile updated');
    } catch (err) {
      toast(err.response?.data?.message || 'Update failed', 'error');
    }
    setSaving(false);
  };

  const removeAddress = async (idx) => {
    const next = addresses.filter((_, i) => i !== idx);
    try {
      await api.post('/auth/profile-update', { addresses: next });
      setAddresses(next);
      toast('Address removed');
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove address', 'error');
    }
  };

  return (
    <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
      <form onSubmit={save} className="border border-beige bg-white p-6">
        <h2 className="mb-4 font-heading text-lg italic text-ink">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              Name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              New Password (optional)
            </label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              placeholder="Leave blank to keep current"
            />
          </div>
          {newPassword && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                Current Password
              </label>
              <input
                type="password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-cream disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="border border-beige bg-white p-6">
        <h2 className="mb-4 font-heading text-lg italic text-ink">
          Saved Addresses
        </h2>
        {addresses.length === 0 ? (
          <p className="text-sm text-mauve">
            No saved addresses yet — one is saved automatically when you check
            out.
          </p>
        ) : (
          <div className="space-y-3">
            {addresses.map((a, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 bg-cream p-3.5"
              >
                <p className="flex items-start gap-2 text-sm text-ink">
                  <MapPin
                    size={14}
                    strokeWidth={1.5}
                    className="mt-0.5 flex-shrink-0 text-mauve"
                  />
                  <span>
                    <b>{a.fullName}</b> · {a.addressLine1}, {a.city}{' '}
                    {a.postalCode} · {a.phone}
                  </span>
                </p>
                <button
                  onClick={() => removeAddress(i)}
                  className="text-mauve hover:text-red-700"
                  aria-label="Remove address"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DangerZone({ toast, logout, navigate, confirm }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (
      !(await confirm(
        'This permanently deletes your account. Your order history is kept for our records but is no longer linked to your name or email. This cannot be undone.',
        { confirmLabel: 'Delete My Account', cancelLabel: 'Keep My Account', danger: true },
      ))
    )
      return;
    setDeleting(true);
    try {
      await api.post('/auth/delete-account', { password });
      toast('Your account has been deleted');
      await logout();
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.message || 'Could not delete account', 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="mb-12 border border-red-200 bg-white p-6">
      <h2 className="mb-1 font-heading text-lg italic text-ink">Danger Zone</h2>
      <p className="mb-4 text-sm text-mauve-dark">
        Deleting your account is permanent and cannot be undone.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="border border-red-700 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-red-700 transition-colors hover:bg-red-700 hover:text-white"
        >
          Delete My Account
        </button>
      ) : (
        <form onSubmit={submit} className="max-w-sm space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              Confirm your password
            </label>
            <input
              type="password"
              required
              autoFocus
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword('');
              }}
              className="border border-beige px-5 py-2.5 text-xs font-semibold uppercase text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleting}
              className="bg-red-700 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Account() {
  useTitle('My Account');
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const setUser = useStore((s) => s.setUser);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnFor, setReturnFor] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.post('/order/list', { page: 1, limit: 50 });
      setOrders(res.data.data.docs || []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate, fetchOrders]);

  if (!user) return null;

  const canReturn = (o) =>
    o.orderStatus === 'delivered' &&
    (!o.returnRequest || o.returnRequest.status === 'none') &&
    Date.now() - new Date(o.deliveredAt || o.updatedAt).getTime() <
      7 * 24 * 60 * 60 * 1000;

  const cancelOrder = async (o) => {
    if (
      !(await confirm(`Cancel order ${o.orderNumber}? Items will be restocked.`, {
        confirmLabel: 'Cancel Order',
        cancelLabel: 'Keep Order',
        danger: true,
      }))
    )
      return;
    try {
      await api.post('/order/cancel', { id: o._id });
      toast('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not cancel order', 'error');
    }
  };

  const handleInvoiceDownload = async (o) => {
    try {
      await downloadInvoice(o);
    } catch {
      toast('Could not download invoice', 'error');
    }
  };

  return (
    <div className="min-h-[60vh] bg-cream font-body text-ink">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl italic text-ink">
              Hi, {user.name?.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-mauve-dark">{user.email}</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="flex items-center gap-2 border border-beige px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-beige"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <ProfileSection user={user} setUser={setUser} toast={toast} />

        <DangerZone toast={toast} logout={logout} navigate={navigate} confirm={confirm} />

        <h2 className="mb-5 font-heading text-xl italic text-ink">
          Your Orders
        </h2>
        {loading ? (
          <p className="py-10 text-center text-mauve">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <p className="text-mauve">You haven't placed any orders yet.</p>
            <Link
              to="/collection"
              className="bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o._id} className="border border-beige bg-white p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {o.orderNumber}
                    </p>
                    <p className="text-xs text-mauve">
                      {new Date(o.createdAt).toLocaleDateString()} ·{' '}
                      {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                      {inr(o.total)}
                    </p>
                    {o.returnRequest?.status &&
                      o.returnRequest.status !== 'none' && (
                        <span className="mt-1.5 inline-block bg-beige px-3 py-1 text-[11px] capitalize text-ink">
                          {o.returnRequest.type}: {o.returnRequest.status}
                        </span>
                      )}
                  </div>
                  <OrderTimeline status={o.orderStatus} />
                </div>
                <div className="space-y-1 border-t border-beige/60 pt-3 text-sm text-mauve-dark">
                  {o.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {i.name} × {i.quantity}
                      </span>
                      <span>{inr(i.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleInvoiceDownload(o)}
                    className="flex items-center gap-2 border border-beige px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark transition-all hover:border-ink hover:text-ink"
                  >
                    <Download size={13} /> Invoice
                  </button>
                  {o.orderStatus === 'processing' && (
                    <button
                      onClick={() => cancelOrder(o)}
                      className="flex items-center gap-2 border border-beige px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-mauve-dark transition-all hover:border-red-700 hover:text-red-700"
                    >
                      <XCircle size={13} /> Cancel Order
                    </button>
                  )}
                  {canReturn(o) && (
                    <button
                      onClick={() => setReturnFor(o)}
                      className="flex items-center gap-2 border border-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition-all hover:bg-ink hover:text-cream"
                    >
                      <RotateCcw size={13} /> Return / Exchange
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {returnFor && (
        <ReturnModal
          order={returnFor}
          onClose={() => setReturnFor(null)}
          onDone={() => {
            setReturnFor(null);
            toast('Request submitted');
            fetchOrders();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}
