import React, { useState } from 'react';
import { customersAPI, dealersAPI, devicesAPI } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { customerFields, dealerFields, deviceFields } from '../utils/entityFields';
import { deviceLabel } from '../utils/status';
import EntityForm from './EntityForm';
import { Button, Row, Select } from './ui';

const KINDS = {
  customer: {
    api: customersAPI,
    fields: customerFields,
    firstKey: 'name',
    newTitle: 'customers.addCustomer',
    editTitle: 'customers.editCustomer',
    option: (c) => ({ value: c.id, label: c.name, sublabel: [c.city, c.email].filter(Boolean).join(' · ') || undefined }),
  },
  dealer: {
    api: dealersAPI,
    fields: dealerFields,
    firstKey: 'name',
    newTitle: 'dealers.addDealer',
    editTitle: 'dealers.editDealer',
    option: (d) => ({ value: d.id, label: d.name, sublabel: d.city || undefined }),
  },
  device: {
    api: devicesAPI,
    fields: deviceFields,
    firstKey: 'serial_number',
    newTitle: 'devices.addDevice',
    editTitle: 'devices.editDevice',
    option: (d) => ({ value: d.id, label: deviceLabel(d) }),
  },
};

// Searchable picker for a customer / dealer / device. Something not in the
// list opens the full form (prefilled with what was typed), and the picked
// record can be edited in place.
const LookupField = ({ kind, label, value, records, onChange, onSaved, placeholder, hint, exclude, children }) => {
  const { t } = useLanguage();
  const cfg = KINDS[kind];
  const [form, setForm] = useState(null); // { mode: 'new' | 'edit', initial }
  const selected = records.find((r) => String(r.id) === String(value));
  const options = records.filter((r) => !exclude || !exclude.has(r.id) || r.id === value).map(cfg.option);

  // Let the picker sheet close before the form sheet opens (iOS can't
  // present a modal while another one is still dismissing).
  const openForm = (next) => setTimeout(() => setForm(next), 350);

  const submit = async (values) => {
    if (form.mode === 'edit') {
      await cfg.api.update(selected.id, values);
      await onSaved?.();
    } else {
      const res = await cfg.api.create(values);
      await onSaved?.();
      onChange(res.data.data.id);
    }
    setForm(null);
  };

  const label1 = (key) => t(key).replace(/^\+\s*/, '');

  return (
    <>
      <Select
        label={label}
        value={value}
        options={options}
        allowClear
        placeholder={placeholder}
        hint={hint}
        createLabel={label1(cfg.newTitle)}
        onCreate={(text) => {
          openForm({ mode: 'new', initial: { [cfg.firstKey]: text } });
          return undefined;
        }}
        onChange={(v) => onChange(v)}
      />
      <Row style={{ marginTop: -6, marginBottom: 14, flexWrap: 'wrap' }}>
        {selected ? (
          <Button title={t('common.edit')} icon='✏️' small variant='secondary' onPress={() => setForm({ mode: 'edit', initial: selected })} />
        ) : (
          <Button title={label1(cfg.newTitle)} icon='＋' small variant='secondary' onPress={() => setForm({ mode: 'new', initial: {} })} />
        )}
        {children}
      </Row>
      <EntityForm
        visible={!!form}
        title={form?.mode === 'edit' ? t(cfg.editTitle) : label1(cfg.newTitle)}
        fields={cfg.fields(t)}
        initial={form?.initial}
        onClose={() => setForm(null)}
        onSubmit={submit}
      />
    </>
  );
};

export default LookupField;
