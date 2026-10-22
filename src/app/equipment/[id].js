import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { equipmentAPI, equipmentTemplatesAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate, formatDateTime } from '../../utils/format';
import { Button, Card, ErrorBox, InfoRow, Input, Loading, Row, SectionTitle, Sheet, confirm, showError, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';
import { colors } from '../../theme';

export default function EquipmentDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const { data: e, loading, error, refreshing, refresh, reload } = useApi(() => equipmentAPI.getById(id), [id]);
  const [showEdit, setShowEdit] = useState(false);
  const [templateName, setTemplateName] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading />;
  if (!e) return <ErrorBox message={error} onRetry={refresh} />;

  const fields = [
    { key: 'model', label: t('equipmentTable.modelName'), required: true },
    { key: 'serial_number', label: t('equipmentTable.serialNumber'), autoCapitalize: 'characters' },
    { key: 'brand', label: t('equipmentTable.brand') },
    { key: 'category', label: t('equipmentTable.category') },
    { key: 'article_id', label: t('equipmentTable.articleId') },
  ];

  const remove = async () => {
    if (!(await confirm(t('equipmentTable.deleteEquipmentTitle'), t('equipmentTable.confirmDeleteMessage', { model: e.model }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await equipmentAPI.delete(e.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('equipment.failedToDelete', { message: errorMessage(err) }));
    }
  };

  const saveTemplate = async () => {
    if (!templateName?.trim()) return;
    setSaving(true);
    try {
      await equipmentTemplatesAPI.createFromEquipment({ equipment_id: e.id, name: templateName.trim() });
      setTemplateName(null);
      showError('✓', t('equipment.templateSaved', { name: templateName.trim() }));
    } catch (err) {
      showError(t('common.error'), t('equipment.failedToSaveTemplate', { message: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: e.model }} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <Card>
          <SectionTitle style={{ marginTop: 0 }} right={<Button title={t('common.edit')} small variant='secondary' onPress={() => setShowEdit(true)} />}>
            {t('equipmentDetails.equipmentInformation')}
          </SectionTitle>
          <Text style={[styles.title, { fontSize: 19, marginBottom: 8 }]} selectable>
            {e.model}
          </Text>
          <InfoRow label={t('equipmentDetails.serialNumber')} value={e.serial_number} />
          <InfoRow label={t('equipmentDetails.brand')} value={e.brand} />
          <InfoRow label={t('equipmentDetails.category')} value={e.category || e.template_category} />
          <InfoRow label={t('equipmentDetails.articleId')} value={e.article_id} />
          <InfoRow
            label={t('equipmentDetails.createdFromTemplate')}
            value={e.template_name}
            onPress={e.template_id ? () => router.push(`/templates/${e.template_id}`) : undefined}
          />
          <InfoRow label={t('equipmentDetails.productionDate')} value={e.production_date ? formatDate(e.production_date) : null} />
          <InfoRow label={t('equipmentDetails.createdBy')} value={e.created_by_name} />
          <InfoRow label={t('equipmentDetails.createdAt')} value={formatDateTime(e.created_at)} />
          {e.consumed_by ? (
            <InfoRow
              label='↪'
              value={`${e.consumed_by.model}${e.consumed_by.serial_number ? ` (${e.consumed_by.serial_number})` : ''}`}
              onPress={() => router.push(`/equipment/${e.consumed_by.id}`)}
            />
          ) : null}
        </Card>

        <SectionTitle>{t('equipmentDetails.partsUsedCount', { count: (e.parts || []).length })}</SectionTitle>
        {(e.parts || []).length === 0 ? <Text style={styles.small}>{t('equipmentDetails.noPartsRecorded')}</Text> : null}
        {(e.parts || []).map((p) => (
          <Card key={p.equipment_part_id} onPress={() => router.push(`/parts/${p.part_id}`)} style={{ paddingVertical: 10 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  {p.name}
                  {p.color ? ` (${p.color})` : ''}
                </Text>
                <Text style={styles.small}>
                  {[p.sku, p.part_notes].filter(Boolean).join(' · ') || ' '}
                </Text>
              </View>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>× {p.quantity_needed}</Text>
            </Row>
          </Card>
        ))}

        {(e.components || []).length ? (
          <>
            <SectionTitle>{t('equipmentTemplates.componentsConfiguration')}</SectionTitle>
            {e.components.map((c) => (
              <Card key={c.id} onPress={() => router.push(`/equipment/${c.id}`)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontWeight: '600' }}>🧩 {c.model}</Text>
                {c.serial_number ? <Text style={styles.small}>SN: {c.serial_number}</Text> : null}
              </Card>
            ))}
          </>
        ) : null}

        <Button title={t('equipment.saveAsTemplate')} variant='secondary' style={{ marginTop: 12 }} onPress={() => setTemplateName(e.model || '')} />
        <Button title={t('equipmentTable.deleteEquipmentTitle')} variant='dangerOutline' onPress={remove} style={{ marginTop: 10 }} />
      </ScrollView>

      <EntityForm
        visible={showEdit}
        title={t('equipmentTable.editEquipmentTitle')}
        fields={fields}
        initial={e}
        onClose={() => setShowEdit(false)}
        onSubmit={async (values) => {
          await equipmentAPI.update(e.id, values);
          setShowEdit(false);
          reload();
        }}
      />

      <Sheet visible={templateName !== null} onClose={() => setTemplateName(null)} title={t('equipment.saveAsTemplateTitle')} actionLabel={t('common.save')} onAction={saveTemplate} actionLoading={saving}>
        <Input label={t('equipment.templateNamePlaceholder')} value={templateName || ''} onChangeText={setTemplateName} autoFocus />
      </Sheet>
    </>
  );
}
