import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { equipmentTemplatesAPI, partsAPI, productionTasksAPI, usersAPI } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Input, MultiSelect, Segmented, Select, Sheet, showError, styles } from './ui';

const isLowStock = (p) => Number(p.quantity) <= Number(p.min_stock_level);

// New "To produce" note: a part, a component or free text, sent to one or
// more colleagues. `prefill` = { item_type, part_id?, template_id? }.
const NewTaskSheet = ({ visible, prefill, onClose, onSent }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [form, setForm] = useState({ item_type: 'part', part_id: null, template_id: null, quantity: '', note: '', recipients: [] });
  const [parts, setParts] = useState([]);
  const [components, setComponents] = useState([]);
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm({ item_type: 'part', part_id: null, template_id: null, quantity: '', note: '', recipients: [], ...prefill });
    Promise.all([partsAPI.getAll(), equipmentTemplatesAPI.getComponentsStock(), usersAPI.getAll()])
      .then(([p, c, u]) => {
        setParts(p.data.data || []);
        setComponents(c.data.data || []);
        setUsers(u.data.data || []);
      })
      .catch(() => {});
  }, [visible, prefill]);

  const partOptions = parts
    .filter((p) => !p.is_nla)
    .sort((a, b) => isLowStock(b) - isLowStock(a) || a.name.localeCompare(b.name))
    .map((p) => ({
      value: p.id,
      label: `${isLowStock(p) ? '⚠️ ' : ''}${p.name}${p.color ? ` (${p.color})` : ''}`,
      sublabel: t('productionTasks.stockInfo', { qty: p.quantity, min: p.min_stock_level }),
    }));
  const componentOptions = components.map((c) => ({
    value: c.template_id,
    label: c.name,
    sublabel: t('productionTasks.componentStockInfo', { qty: c.component_stock }),
  }));
  const userOptions = users
    .filter((u) => u.id !== user?.id)
    .map((u) => ({ value: u.id, label: u.full_name || u.loginName || `#${u.id}` }));

  const send = async () => {
    setSending(true);
    try {
      const { data } = await productionTasksAPI.create({
        ...form,
        quantity: form.quantity === '' ? null : Number(form.quantity),
      });
      onSent(t('productionTasks.sent', { count: data.count }));
    } catch (err) {
      showError(t('common.error'), t('productionTasks.failedToSend', { error: errorMessage(err) }));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('productionTasks.newTask').replace('+ ', '')}
      actionLabel={t('productionTasks.send')}
      onAction={send}
      actionLoading={sending}
    >
      <Text style={[styles.label]}>{t('productionTasks.itemType')}</Text>
      <Segmented
        options={[
          { value: 'part', label: t('productionTasks.type_part') },
          { value: 'component', label: t('productionTasks.type_component') },
          { value: 'text', label: t('productionTasks.type_text') },
        ]}
        value={form.item_type}
        onChange={(v) => setForm({ ...form, item_type: v })}
        style={{ marginBottom: 14 }}
      />
      {form.item_type === 'part' ? (
        <Select
          label={t('productionTasks.type_part')}
          value={form.part_id}
          options={partOptions}
          onChange={(v) => setForm({ ...form, part_id: v })}
          placeholder={t('productionTasks.selectPart')}
          hint={t('productionTasks.lowStockFirst')}
        />
      ) : null}
      {form.item_type === 'component' ? (
        <Select
          label={t('productionTasks.type_component')}
          value={form.template_id}
          options={componentOptions}
          onChange={(v) => setForm({ ...form, template_id: v })}
          placeholder={t('productionTasks.selectComponent')}
        />
      ) : null}
      {form.item_type !== 'text' ? (
        <Input
          label={t('productionTasks.quantity')}
          value={String(form.quantity)}
          onChangeText={(v) => setForm({ ...form, quantity: v.replace(/[^0-9]/g, '') })}
          keyboardType='number-pad'
        />
      ) : null}
      <Input
        label={t('productionTasks.note')}
        value={form.note}
        onChangeText={(v) => setForm({ ...form, note: v })}
        placeholder={t('productionTasks.notePlaceholder')}
        multiline
      />
      <MultiSelect
        label={t('productionTasks.recipients')}
        value={form.recipients}
        options={userOptions}
        onChange={(v) => setForm({ ...form, recipients: v })}
        placeholder={t('productionTasks.selectRecipients')}
      />
    </Sheet>
  );
};

export default NewTaskSheet;
