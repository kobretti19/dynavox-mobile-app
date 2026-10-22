import React, { useEffect, useState } from 'react';
import { equipmentTemplatesAPI, partsAPI } from '../api';
import { errorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Input, Sheet, SwitchRow, showError } from './ui';
import PartsPicker from './PartsPicker';

// Create / edit / duplicate an equipment template: name, parts list and
// (for buildable items) required component templates.
const TemplateForm = ({ visible, template, duplicate, onClose, onSaved }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', description: '', brand: '', category: '', article_id: '', is_component: false });
  const [partRows, setPartRows] = useState([]);
  const [componentRows, setComponentRows] = useState([]);
  const [parts, setParts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm({
      name: template ? `${template.name}${duplicate ? ` ${t('equipmentTemplates.copySuffix')}` : ''}` : '',
      description: template?.description || '',
      brand: template?.brand || '',
      category: template?.category || '',
      article_id: duplicate ? '' : template?.article_id || '',
      is_component: !!template?.is_component,
    });
    setPartRows((template?.parts_data || []).map((p) => ({ id: p.part_id, quantity: Number(p.quantity) || 1 })));
    setComponentRows((template?.components_data || []).map((c) => ({ id: c.component_template_id, quantity: Number(c.quantity) || 1 })));
    Promise.all([partsAPI.getAll(), equipmentTemplatesAPI.getAll()])
      .then(([p, tpl]) => {
        setParts(p.data.data || []);
        setTemplates(tpl.data.data || []);
      })
      .catch(() => {});
  }, [visible, template, duplicate, t]);

  const save = async () => {
    if (!form.name.trim()) {
      showError(t('common.error'), t('equipmentTemplates.templateNameLabel'));
      return;
    }
    if (partRows.length === 0) {
      showError(t('common.error'), t('equipmentTemplates.pleaseAddPart'));
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      parts_data: partRows.map((r) => ({ part_id: r.id, quantity: r.quantity })),
      components_data: componentRows.map((r) => ({ component_template_id: r.id, quantity: r.quantity })),
    };
    try {
      if (template && !duplicate) {
        await equipmentTemplatesAPI.update(template.id, payload);
        onSaved(template.id);
      } else {
        const res = await equipmentTemplatesAPI.create(payload);
        onSaved(res.data?.data?.id);
      }
    } catch (err) {
      const key = template && !duplicate ? 'equipmentTemplates.failedToUpdate' : 'equipmentTemplates.failedToCreate';
      showError(t('common.error'), t(key, { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const partOptions = parts.map((p) => ({
    value: p.id,
    label: `${p.name}${p.color ? ` (${p.color})` : ''}`,
    sublabel: [`${t('equipmentTemplates.stock')}: ${p.quantity}`, p.sku].filter(Boolean).join(' · '),
  }));
  const componentOptions = templates
    .filter((tpl) => tpl.is_component && tpl.id !== template?.id)
    .map((tpl) => ({ value: tpl.id, label: `🧩 ${tpl.name}`, sublabel: tpl.article_id || undefined }));

  const title = duplicate
    ? t('equipmentTemplates.duplicateTemplateModalTitle')
    : template
      ? t('equipmentTemplates.editTemplateModalTitle')
      : t('equipmentTemplates.createTemplateModalTitle');

  return (
    <Sheet visible={visible} onClose={onClose} title={title} actionLabel={t('common.save')} onAction={save} actionLoading={saving}>
      <Input label={t('equipmentTemplates.templateNameLabel')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      <Input label={t('equipmentTemplates.articleId')} value={form.article_id} onChangeText={(v) => setForm({ ...form, article_id: v })} placeholder={t('equipmentTemplates.articleIdPlaceholder')} />
      <Input label={t('equipmentTemplates.brand')} value={form.brand} onChangeText={(v) => setForm({ ...form, brand: v })} />
      <Input label={t('common.category')} value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} />
      <Input label={t('common.description')} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline />
      <SwitchRow label={t('equipmentTemplates.isComponentLabel')} value={form.is_component} onValueChange={(v) => setForm({ ...form, is_component: v })} />
      <PartsPicker
        label={t('equipmentTemplates.parts')}
        rows={partRows}
        onChange={setPartRows}
        options={partOptions}
        placeholder={t('equipmentTemplates.searchPartPlaceholder')}
      />
      <PartsPicker
        label={t('equipmentTemplates.componentsConfiguration')}
        rows={componentRows}
        onChange={setComponentRows}
        options={componentOptions}
        placeholder={t('equipmentTemplates.searchComponentPlaceholder')}
      />
    </Sheet>
  );
};

export default TemplateForm;
