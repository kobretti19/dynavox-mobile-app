import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { equipmentAPI, equipmentTemplatesAPI, partsAPI } from '../api';
import { errorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Button, Input, Row, Segmented, Select, Sheet, SwitchRow, confirm, showError, styles } from './ui';
import DateField from './DateField';
import PartsPicker from './PartsPicker';
import ScanModal from './ScanModal';
import { colors } from '../theme';

// Create one or more pieces of equipment, either from a template (its parts
// and components are consumed) or from a hand-picked parts list -- the
// mobile version of the web "Create Equipment" modal.
const ProduceSheet = ({ visible, templateId, onClose, onDone }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState('template');
  const [templates, setTemplates] = useState([]);
  const [parts, setParts] = useState([]);
  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState({ template_id: null, model: '', brand: '', category: '', article_id: '', production_date: null });
  const [serials, setSerials] = useState(['']);
  const [partRows, setPartRows] = useState([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanIndex, setScanIndex] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setMode('template');
    setForm({ template_id: templateId || null, model: '', brand: '', category: '', article_id: '', production_date: null });
    setSerials(['']);
    setPartRows([]);
    setSaveAsTemplate(false);
    setTemplate(null);
    Promise.all([equipmentTemplatesAPI.getAll(), partsAPI.getAll()])
      .then(([tpl, p]) => {
        setTemplates(tpl.data.data || []);
        setParts(p.data.data || []);
      })
      .catch(() => {});
  }, [visible, templateId]);

  // Picking a template loads its details (parts with current stock).
  useEffect(() => {
    if (!form.template_id) {
      setTemplate(null);
      return;
    }
    equipmentTemplatesAPI
      .getById(form.template_id)
      .then((res) => {
        const tpl = res.data.data;
        setTemplate(tpl);
        setForm((f) => ({ ...f, model: tpl.name, brand: tpl.brand || '', category: tpl.category || '', article_id: tpl.article_id || '' }));
      })
      .catch(() => setTemplate(null));
  }, [form.template_id]);

  const units = serials.length;
  const setSerial = (i, v) => setSerials((s) => s.map((x, j) => (j === i ? v : x)));

  const submit = async () => {
    if (mode === 'template' && !form.template_id) {
      showError(t('common.error'), t('equipment.selectTemplateOrAddPart'));
      return;
    }
    if (mode === 'manual' && (partRows.length === 0 || !form.model.trim())) {
      showError(t('common.error'), t('equipment.selectTemplateOrAddPart'));
      return;
    }
    const missing = serials.filter((s) => !s.trim()).length;
    if (units > 1 && missing > 0) {
      const ok = await confirm(t('common.warning'), t('equipment.confirmMissingSerials', { count: units, missing }), {
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        destructive: false,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
      const common = {
        model: form.model,
        serial_numbers: serials.map((s) => s.trim() || null),
        brand: form.brand || null,
        category: form.category || null,
        article_id: form.article_id || null,
        production_date: form.production_date || null,
        year_manufactured: form.production_date ? Number(form.production_date.slice(0, 4)) : new Date().getFullYear(),
      };
      // From a template: same endpoint as the web Templates page (it also
      // handles component templates, which only add to component stock).
      const res =
        mode === 'template'
          ? await equipmentTemplatesAPI.createEquipment(form.template_id, { ...common, parts_data: template?.parts_data })
          : await equipmentAPI.create({
              ...common,
              template_id: null,
              parts: partRows.map((r) => ({
                part_id: r.id,
                quantity_needed: r.quantity,
                notes: '',
                part_name: byId[r.id]?.name,
                part_color: byId[r.id]?.color,
                part_sku: byId[r.id]?.sku,
              })),
              save_as_template: saveAsTemplate,
              template_name: saveAsTemplate ? form.model : null,
            });
      const erp = res.data?.erp;
      if (erp && erp.ok === false) {
        showError(
          t('common.warning'),
          t('equipment.erpBookingFailed', { error: erp.error || 'unknown error', doc: erp.docId ? ` [ERP doc ${erp.docId}]` : '' }),
        );
      }
      if (mode === 'template' && template?.is_component) showError('✓', t('equipmentTemplates.componentStockAddedSuccess'));
      onDone(res.data?.data);
    } catch (err) {
      showError(t('common.error'), t('equipment.failedToCreateEquipment', { message: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const templateOptions = templates.map((tpl) => ({
    value: tpl.id,
    label: `${tpl.is_component ? '🧩 ' : ''}${tpl.name}`,
    sublabel: [tpl.article_id, tpl.brand, t('equipmentTemplates.partsCount', { count: (tpl.parts_data || []).length })].filter(Boolean).join(' · '),
  }));
  const partOptions = parts
    .filter((p) => !p.is_nla)
    .map((p) => ({ value: p.id, label: `${p.name}${p.color ? ` (${p.color})` : ''}`, sublabel: `${t('equipmentTemplates.stock')}: ${p.quantity}${p.sku ? ` · ${p.sku}` : ''}` }));

  const title = units > 1 ? t('equipment.createMultiple', { count: units }) : t('equipment.createEquipmentModalTitle');

  return (
    <Sheet visible={visible} onClose={onClose} title={title} actionLabel={t('common.create')} onAction={submit} actionLoading={saving}>
      {!templateId ? (
        <Segmented
          options={[
            { value: 'template', label: t('equipment.createFromTemplate') },
            { value: 'manual', label: t('equipment.partsWithCount', { count: partRows.length }) },
          ]}
          value={mode}
          onChange={setMode}
          style={{ marginBottom: 14 }}
        />
      ) : null}

      {mode === 'template' ? (
        <Select
          label={t('equipmentTemplates.templateLabel')}
          value={form.template_id}
          options={templateOptions}
          onChange={(v) => setForm({ ...form, template_id: v })}
          placeholder={t('equipmentTemplates.searchTemplatePlaceholder')}
          disabled={!!templateId}
        />
      ) : null}

      {mode === 'template' && template ? (
        <View style={{ backgroundColor: colors.grayBg, borderRadius: 10, padding: 10, marginBottom: 14 }}>
          <Text style={[styles.label, { marginBottom: 4 }]}>{t('equipmentTemplates.partsToBeConsumed')}</Text>
          {(template.parts_data || []).map((p) => {
            const need = Number(p.quantity) * units;
            const short = Number(p.current_stock) < need;
            return (
              <Row key={p.part_id} style={{ paddingVertical: 2 }}>
                <Text style={{ flex: 1, fontSize: 13, color: colors.text }} numberOfLines={1}>
                  {p.name}
                  {p.color ? ` (${p.color})` : ''}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: short ? colors.red : colors.text }}>
                  {need} / {p.current_stock}
                </Text>
              </Row>
            );
          })}
          {(template.components_data || []).length ? (
            <>
              <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>{t('equipmentTemplates.componentsToBeConsumed')}</Text>
              {template.components_data.map((c) => {
                const need = Number(c.quantity) * units;
                const stock = Number(c.available_stock ?? 0);
                return (
                  <Row key={c.component_template_id} style={{ paddingVertical: 2 }}>
                    <Text style={{ flex: 1, fontSize: 13 }} numberOfLines={1}>
                      🧩 {c.template_name || `#${c.component_template_id}`}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: stock < need ? colors.red : colors.text }}>
                      {need} / {stock}
                    </Text>
                  </Row>
                );
              })}
            </>
          ) : null}
        </View>
      ) : null}

      {mode === 'manual' ? (
        <PartsPicker
          label={t('equipmentTemplates.parts')}
          rows={partRows}
          onChange={setPartRows}
          options={partOptions}
          placeholder={t('equipmentTemplates.searchPartPlaceholder')}
        />
      ) : null}

      <Input label={t('equipment.model')} value={form.model} onChangeText={(v) => setForm({ ...form, model: v })} />
      <Input label={t('equipment.brand')} value={form.brand} onChangeText={(v) => setForm({ ...form, brand: v })} />
      <Input label={t('equipment.category')} value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} />
      <Input label={t('equipment.articleId')} value={form.article_id} onChangeText={(v) => setForm({ ...form, article_id: v })} />
      <DateField label={t('equipment.productionDate')} value={form.production_date} onChange={(v) => setForm({ ...form, production_date: v })} allowClear />

      <Text style={styles.label}>{units > 1 ? t('equipment.serialNumbers') : t('equipment.serialNumber')}</Text>
      {serials.map((s, i) => (
        <Row key={i} style={{ marginBottom: 8 }}>
          <Text style={{ width: 22, color: colors.textMuted }}>{i + 1}.</Text>
          <TextInput
            value={s}
            onChangeText={(v) => setSerial(i, v)}
            placeholder={t('equipment.serialNumberOptional')}
            placeholderTextColor={colors.textLight}
            autoCapitalize='characters'
            autoCorrect={false}
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable onPress={() => setScanIndex(i)} hitSlop={8}>
            <Text style={{ fontSize: 22 }}>📷</Text>
          </Pressable>
          {serials.length > 1 ? (
            <Pressable onPress={() => setSerials((x) => x.filter((_, j) => j !== i))} hitSlop={8}>
              <Text style={{ fontSize: 16, color: colors.red }}>✕</Text>
            </Pressable>
          ) : null}
        </Row>
      ))}
      <Button title={`＋ ${t('equipment.addSerialNumber')}`} small variant='secondary' style={{ alignSelf: 'flex-start', marginBottom: 14 }} onPress={() => setSerials((x) => [...x, ''])} />

      {mode === 'manual' ? <SwitchRow label={t('equipment.saveAsTemplateCheckbox')} value={saveAsTemplate} onValueChange={setSaveAsTemplate} /> : null}

      <ScanModal
        visible={scanIndex !== null}
        onClose={() => setScanIndex(null)}
        onScanned={(code) => {
          setSerial(scanIndex, code);
          setScanIndex(null);
        }}
      />
    </Sheet>
  );
};

export default ProduceSheet;
