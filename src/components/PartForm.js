import React, { useEffect, useState } from 'react';
import { partsAPI } from '../api';
import { errorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Input, NumberInput, Select, Sheet, SwitchRow, showError } from './ui';

const empty = {
  name: '',
  description: '',
  color: '',
  category: '',
  supplier: '',
  sku: '',
  article_id: '',
  purchase_price: '',
  selling_price: '',
  quantity: '',
  min_stock_level: '5',
  is_nla: false,
};

const uniqOptions = (parts, key) =>
  [...new Set((parts || []).map((p) => p[key]).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));

// Create (part = null) or edit a part. `parts` feeds the color/category/
// supplier suggestions, like the web form's datalists.
const PartForm = ({ visible, part, parts, onClose, onSaved }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(
      part
        ? {
            name: part.name || '',
            description: part.description || '',
            color: part.color || '',
            category: part.category || '',
            supplier: part.supplier || '',
            sku: part.sku || '',
            article_id: part.article_id || '',
            purchase_price: part.purchase_price ?? '',
            selling_price: part.selling_price ?? '',
            quantity: part.quantity ?? '',
            min_stock_level: part.min_stock_level ?? '',
            is_nla: !!part.is_nla,
          }
        : empty,
    );
  }, [visible, part]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      showError(t('common.error'), t('parts.partName'));
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      quantity: parseInt(form.quantity, 10) || 0,
      min_stock_level: form.min_stock_level === '' ? 5 : parseInt(form.min_stock_level, 10) || 0,
    };
    try {
      if (part) {
        await partsAPI.update(part.id, payload);
        onSaved(part.id);
      } else {
        const { is_nla, ...createPayload } = payload;
        const res = await partsAPI.create(createPayload);
        onSaved(res.data?.data?.id);
      }
    } catch (err) {
      showError(t('common.error'), t('mobile.saveFailed', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={part ? t('partsTable.editPart') : t('parts.createNewPart')}
      actionLabel={t('common.save')}
      onAction={save}
      actionLoading={saving}
    >
      <Input label={t('parts.partName')} value={form.name} onChangeText={set('name')} placeholder={t('parts.enterPartName')} />
      <Input label={t('parts.skuOrderNumber')} value={form.sku} onChangeText={set('sku')} placeholder={t('parts.skuPlaceholder')} autoCapitalize='characters' />
      <Select label={t('parts.color')} value={form.color} options={uniqOptions(parts, 'color')} onChange={(v) => set('color')(v || '')} allowCustom allowClear placeholder={t('parts.colorPlaceholder')} />
      <Select label={t('parts.category')} value={form.category} options={uniqOptions(parts, 'category')} onChange={(v) => set('category')(v || '')} allowCustom allowClear placeholder={t('parts.categoryPlaceholder')} />
      <Select label={t('parts.supplier')} value={form.supplier} options={uniqOptions(parts, 'supplier')} onChange={(v) => set('supplier')(v || '')} allowCustom allowClear placeholder={t('parts.supplierPlaceholder')} />
      <Input label={t('parts.articleId')} value={form.article_id} onChangeText={set('article_id')} placeholder={t('parts.articleIdPlaceholder')} />
      <Input label={t('parts.description')} value={form.description} onChangeText={set('description')} multiline placeholder={t('parts.enterDescription')} />
      <NumberInput label={t('parts.purchasePrice')} value={form.purchase_price} onChange={set('purchase_price')} />
      <NumberInput label={t('parts.sellingPrice')} value={form.selling_price} onChange={set('selling_price')} />
      <NumberInput
        label={part ? t('common.quantity') : t('parts.initialQuantity')}
        value={form.quantity}
        onChange={set('quantity')}
        keyboardType='number-pad'
      />
      <NumberInput label={t('parts.minStockLevel')} value={form.min_stock_level} onChange={set('min_stock_level')} keyboardType='number-pad' />
      {part ? <SwitchRow label={t('partsTable.nlaLong')} value={form.is_nla} onValueChange={set('is_nla')} /> : null}
    </Sheet>
  );
};

export default PartForm;
