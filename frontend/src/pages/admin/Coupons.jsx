import MasterData from './MasterData';

const columns = [
  { label: 'Code', key: 'code', render: (v) => <span className="font-semibold">{v}</span> },
  { label: 'Discount', key: 'value', render: (v, row) => (row.type === 'percent' ? `${v}%${row.maxDiscount ? ` (max ₹${row.maxDiscount})` : ''}` : `₹${v}`) },
  { label: 'Min Order', key: 'minOrderValue', render: (v) => (v ? `₹${v}` : '—') },
  { label: 'Expires', key: 'expiresAt', render: (v) => (v ? new Date(v).toLocaleDateString() : 'Never') },
  { label: 'Used', key: 'usedCount', render: (v, row) => `${v || 0}${row.usageLimit ? ` / ${row.usageLimit}` : ''}` },
  {
    label: 'Status',
    key: 'isActive',
    render: (v) => (
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${v ? 'bg-pastel-green' : 'bg-beige text-mauve-dark'} text-ink`}>
        {v ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

const formSchema = [
  { label: 'Code', key: 'code', required: true, placeholder: 'WELCOME10' },
  {
    label: 'Type', key: 'type', type: 'select', required: true, default: 'percent',
    options: [
      { value: 'percent', label: 'Percent (%)' },
      { value: 'fixed', label: 'Fixed amount (₹)' },
    ],
  },
  { label: 'Value', key: 'value', type: 'number', required: true, placeholder: '10' },
  { label: 'Minimum Order Value (₹)', key: 'minOrderValue', type: 'number', placeholder: '0' },
  { label: 'Max Discount (₹, percent coupons only)', key: 'maxDiscount', type: 'number' },
  { label: 'Expires At', key: 'expiresAt', type: 'date' },
  { label: 'Usage Limit (total redemptions)', key: 'usageLimit', type: 'number' },
  {
    label: 'Status', key: 'isActive', type: 'select', default: 'true',
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];

export default function Coupons() {
  return <MasterData title="Coupons" endpoint="coupon" columns={columns} formSchema={formSchema} />;
}
