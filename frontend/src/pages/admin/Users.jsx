import MasterData from './MasterData';

const columns = [
  { label: 'Name', key: 'name' },
  { label: 'Email', key: 'email' },
  {
    label: 'Role',
    key: 'role',
    render: (val) => (
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] capitalize ${val === 'superadmin' ? 'bg-blush' : 'bg-baby-pink'} text-ink`}>
        {val}
      </span>
    ),
  },
  {
    label: 'Active',
    key: 'isActive',
    render: (val) => (
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${val === false ? 'bg-beige text-mauve-dark' : 'bg-pastel-green text-ink'}`}>
        {val === false ? 'Inactive' : 'Active'}
      </span>
    ),
  },
];

const formSchema = [
  { label: 'Name', key: 'name', required: true },
  { label: 'Email', key: 'email', type: 'email', required: true },
  {
    label: 'Password',
    key: 'password',
    type: 'password',
    required: true,
    omitIfEmpty: true,
    hint: 'Leave blank to keep the current password.',
  },
  {
    label: 'Role',
    key: 'role',
    type: 'select',
    required: true,
    default: 'admin',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'superadmin', label: 'Superadmin' },
      { value: 'fulfillment', label: 'Fulfillment (Orders only)' },
      { value: 'catalog', label: 'Catalog (Products only)' },
    ],
  },
  {
    label: 'Status',
    key: 'isActive',
    type: 'select',
    default: true,
    options: [
      { value: true, label: 'Active' },
      { value: false, label: 'Inactive (blocked — cannot log in)' },
    ],
  },
];

export default function Users() {
  return <MasterData title="Admin Users" endpoint="user" columns={columns} formSchema={formSchema} />;
}
