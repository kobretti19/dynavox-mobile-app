import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { equipmentTemplatesAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatMoney } from '../../utils/format';
import { Badge, Button, Card, ErrorBox, InfoRow, Loading, Row, SectionTitle, confirm, showError, styles } from '../../components/ui';
import TemplateForm from '../../components/TemplateForm';
import ProduceSheet from '../../components/ProduceSheet';
import { colors } from '../../theme';

export default function TemplateDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const { data: tpl, loading, error, refreshing, refresh, reload } = useApi(() => equipmentTemplatesAPI.getById(id), [id]);
  const [edit, setEdit] = useState(null);
  const [produce, setProduce] = useState(false);

  if (loading) return <Loading />;
  if (!tpl) return <ErrorBox message={error} onRetry={refresh} />;

  const cost = (tpl.parts_data || []).reduce((s, p) => s + Number(p.quantity) * Number(p.purchase_price || 0), 0);

  const remove = async () => {
    if (!(await confirm(t('equipmentTemplates.deleteTemplateTitle'), t('equipmentTemplates.deleteTemplateMessage', { name: tpl.name }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await equipmentTemplatesAPI.delete(tpl.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('equipmentTemplates.failedToDelete', { error: errorMessage(err) }));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: tpl.name }} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            <Text style={[styles.title, { fontSize: 19, flex: 1 }]} selectable>
              {tpl.name}
            </Text>
            {tpl.is_component ? <Badge label={t('equipmentTemplates.componentBadge')} color='purple' /> : null}
          </Row>
          {tpl.description ? <Text style={[styles.subtitle, { marginTop: 4 }]}>{tpl.description}</Text> : null}
          <InfoRow label={t('equipmentTemplates.articleId')} value={tpl.article_id} />
          <InfoRow label={t('equipmentTemplates.brand')} value={tpl.brand} />
          <InfoRow label={t('common.category')} value={tpl.category} />
          {tpl.is_component ? <InfoRow label={t('equipmentTemplates.componentsStockTitle')} value={String(tpl.component_stock ?? 0)} /> : null}
          <InfoRow label={t('partDetails.totalValue')} value={formatMoney(cost)} />
          <InfoRow label={t('common.createdBy')} value={tpl.created_by} />
        </Card>

        <Button title={`▶ ${t('equipmentTemplates.use')}`} onPress={() => setProduce(true)} style={{ marginBottom: 10 }} />
        <Row style={{ marginBottom: 6 }}>
          <Button title={t('common.edit')} variant='secondary' style={{ flex: 1 }} onPress={() => setEdit({ duplicate: false })} />
          <Button title={t('equipmentTemplates.duplicate')} variant='secondary' style={{ flex: 1 }} onPress={() => setEdit({ duplicate: true })} />
        </Row>

        <SectionTitle>{t('equipmentTemplates.partsWithCount', { count: (tpl.parts_data || []).length })}</SectionTitle>
        {(tpl.parts_data || []).map((p) => (
          <Card key={p.part_id} onPress={() => router.push(`/parts/${p.part_id}`)} style={{ paddingVertical: 10 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  {p.name}
                  {p.color ? ` (${p.color})` : ''}
                </Text>
                <Text style={styles.small}>
                  {p.sku ? `${p.sku} · ` : ''}
                  {t('equipmentTemplates.stock')}: <Text style={{ color: Number(p.current_stock) < Number(p.quantity) ? colors.red : colors.textMuted }}>{p.current_stock}</Text>
                </Text>
              </View>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>× {p.quantity}</Text>
            </Row>
          </Card>
        ))}

        {(tpl.components_data || []).length ? (
          <>
            <SectionTitle>{t('equipmentTemplates.componentsWithCount', { count: tpl.components_data.length })}</SectionTitle>
            {tpl.components_data.map((c) => (
              <Card key={c.component_template_id} onPress={() => router.push(`/templates/${c.component_template_id}`)} style={{ paddingVertical: 10 }}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>🧩 {c.template_name}</Text>
                    <Text style={styles.small}>
                      {t('equipmentTemplates.currentStock')}: {c.available_stock}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: '800', fontSize: 16 }}>× {c.quantity}</Text>
                </Row>
              </Card>
            ))}
          </>
        ) : null}

        <Button title={t('equipmentTemplates.deleteTemplateTitle')} variant='dangerOutline' onPress={remove} style={{ marginTop: 16 }} />
      </ScrollView>

      <TemplateForm
        visible={!!edit}
        template={tpl}
        duplicate={edit?.duplicate}
        onClose={() => setEdit(null)}
        onSaved={(newId) => {
          const wasDuplicate = edit?.duplicate;
          setEdit(null);
          if (wasDuplicate && newId) router.replace(`/templates/${newId}`);
          else reload();
        }}
      />
      <ProduceSheet
        visible={produce}
        templateId={tpl.id}
        onClose={() => setProduce(false)}
        onDone={() => {
          setProduce(false);
          reload();
        }}
      />
    </>
  );
}
