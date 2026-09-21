import { useEffect, useState } from 'react';
import MasterData from './MasterData';
import api from '../../utils/api';

const sharedColumns = [{ label: 'Name', key: 'name' }];

export function Departments() {
  return (
    <MasterData
      title="Departments"
      description={'The top-level sections of your shop — for example "Women". Every category (like Bras) belongs to a department.'}
      emptyHint={'Start here! Add your first department — for most stores that\'s simply "Women".'}
      endpoint="department"
      columns={sharedColumns}
      formSchema={[{ label: 'Name', key: 'name', required: true, placeholder: 'e.g. Women' }]}
    />
  );
}

export function Items() {
  // Items belong to a department, so the form needs the department list.
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/department/list', { page: 1, limit: 100 });
        setDepartments(res.data.data.docs || res.data.data);
      } catch {
        // Form select stays empty; list still loads.
      }
    })();
  }, []);

  const columns = [
    { label: 'Name', key: 'name' },
    { label: 'Department', key: 'department', render: (val) => val?.name || '—' },
  ];

  const formSchema = [
    { label: 'Name', key: 'name', required: true, placeholder: 'e.g. Bra, Nightdress, Lounge Set' },
    {
      label: 'Department',
      key: 'department',
      type: 'select',
      required: true,
      options: departments.map((d) => ({ value: d._id, label: d.name })),
    },
  ];

  return (
    <MasterData
      title="Categories"
      description={'The types of products you sell — Bras, Nightwear, Lounge Sets. Each belongs to a department. Customers browse by these.'}
      emptyHint="Add your product types here, e.g. Bra, Nightdress, Lounge Set. (Create a Department first if the dropdown is empty.)"
      endpoint="item"
      columns={columns}
      formSchema={formSchema}
    />
  );
}

export function Designs() {
  return (
    <MasterData
      title="Designs"
      description={'Optional style/design codes for your own reference — e.g. "D-101 Lace Trim". You can link a product to a design when creating it.'}
      endpoint="design"
      columns={sharedColumns}
      formSchema={[{ label: 'Name', key: 'name', required: true, placeholder: 'e.g. D-101 Lace Trim' }]}
    />
  );
}

export function Fabrics() {
  return (
    <MasterData
      title="Fabrics"
      description={'The materials your pieces are made of — shown on product pages. Optional.'}
      endpoint="fabric"
      columns={sharedColumns}
      formSchema={[{ label: 'Name', key: 'name', required: true, placeholder: 'e.g. Cotton, Modal, Satin' }]}
    />
  );
}

export function Fits() {
  return (
    <MasterData
      title="Fits"
      description={'The cuts you offer — customers don\'t pick these, but every product option needs one (use "Regular" if unsure).'}
      emptyHint={'Add at least one fit — "Regular" works fine if you don\'t differentiate.'}
      endpoint="fit"
      columns={sharedColumns}
      formSchema={[{ label: 'Name', key: 'name', required: true, placeholder: 'e.g. Regular, Padded, Push-Up' }]}
    />
  );
}

export function Sizes() {
  return (
    <MasterData
      title="Sizes"
      description={'The sizes customers choose on a product page — add each one you stock.'}
      emptyHint="Add each size you sell: S, M, L, XL..."
      endpoint="size"
      columns={sharedColumns}
      formSchema={[{ label: 'Name', key: 'name', required: true, placeholder: 'e.g. M' }]}
    />
  );
}

export function DescriptionTemplates() {
  const columns = [
    { label: 'Name', key: 'name' },
    {
      label: 'Preview',
      key: 'body',
      render: (val) => <span className="line-clamp-2 max-w-md text-mauve-dark">{val}</span>,
    },
  ];

  return (
    <MasterData
      title="Description Templates"
      description={'Reusable snippets you can drop into any product\'s Description field from the Products page — handy for boilerplate you use across many products (e.g. a standard care note or brand blurb).'}
      emptyHint="Add your first template — e.g. a standard fabric/fit blurb you reuse across products."
      endpoint="description-template"
      columns={columns}
      formSchema={[
        { label: 'Name', key: 'name', required: true, placeholder: 'e.g. Standard Cotton Blurb' },
        { label: 'Description text', key: 'body', type: 'textarea', required: true, placeholder: 'The text that gets inserted into the product description...' },
      ]}
    />
  );
}

export function Colours() {
  const colourColumns = [
    { label: 'Name', key: 'name' },
    {
      label: 'Colour',
      key: 'hexCode',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full border border-beige" style={{ backgroundColor: val }}></div>
          <span>{val}</span>
        </div>
      )
    }
  ];

  const colourSchema = [
    { label: 'Name', key: 'name', required: true, placeholder: 'e.g. Blush Pink' },
    { label: 'Colour', key: 'hexCode', type: 'color', required: true, default: '#E8CDD3' },
  ];

  return (
    <MasterData
      title="Colours"
      description={'The colours customers pick on a product page — shown as little round swatches. Use the colour picker to match your fabric.'}
      emptyHint="Add the colours you sell — pick the shade with the colour picker."
      endpoint="colour"
      columns={colourColumns}
      formSchema={colourSchema}
    />
  );
}
