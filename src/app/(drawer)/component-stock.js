import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { equipmentTemplatesAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDateTime, includesQuery } from '../../utils/format';
import { Button, Card, Empty, ErrorBox, Input, Loading, Row, Sheet, showError, styles } from '../../components/ui';
import ProduceSheet from '../../components/ProduceSheet';
import { colors } from '../../theme';
import ScanSearchBar from '../../components/ScanSearchBar';

const typeColor = { produced: colors.green, consumed: colors.red, returned: colors.blue, manual: colors.orange };

export default function ComponentStock() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => equipmentTemplatesAPI.getComponentsStock());
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);
  const [produce, setProduce] = useState(null);

  const list = useMemo(() => (data || []).filter((c) => includesQuery(q, c.name, c.article_id, c.brand, c.category)), [data, q]);

  const saveStock = async () => {
    const qty = parseInt(edit.value, 10);
    if (Number.isNaN(qty)) return;
    setSaving(true);
    try {
      await equipmentTemplatesAPI.setComponentReadyStock(edit.template_id, qty);
      setEdit(null);
      reload();
    } catch (err) {
      showError(t('common.error'), t('componentStock.failedToUpdate', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (c) => {
    setHistory({ name: c.name, rows: null });
    try {
      const res = await equipmentTemplatesAPI.getComponentStockMovements(c.template_id);
      setHistory({ name: c.name, rows: res.data.data || [] });
    } catch (err) {
      setHistory(null);
      showError(t('common.error'), t('componentStock.failedToLoadHistory', { error: errorMessage(err) }));
    }
  };

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('componentStock.failedToLoad', { error })} onRetry={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <ScanSearchBar value={q} onChangeText={setQ} placeholder={t('nav.searchComponentStock')} />
      <FlatList
        data={list}
        keyExtractor={(c) => String(c.template_id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<Empty icon='🧩' title={t('componentStock.emptyTitle')} subtitle={t('componentStock.emptyMessage')} />}
        renderItem={({ item: c }) => (
          <Card onPress={() => router.push(`/templates/${c.template_id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{c.name}</Text>
                <Text style={styles.small}>{[c.article_id, c.brand, c.category].filter(Boolean).join(' · ') || ' '}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.small}>{t('componentStock.ready')}</Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: c.component_stock < 0 ? colors.red : colors.text }}>{c.component_stock}</Text>
              </View>
            </Row>
            <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <Button title={`▶ ${t('equipmentTemplates.use')}`} small onPress={() => setProduce(c.template_id)} />
              <Button title='✎' small variant='secondary' onPress={() => setEdit({ template_id: c.template_id, name: c.name, value: String(c.component_stock) })} />
              <Button title={t('componentStock.history')} small variant='secondary' onPress={() => openHistory(c)} />
              <Button
                title={`📝 ${t('productionTasks.sendToProduce')}`}
                small
                variant='secondary'
                onPress={() => router.navigate(`/production-tasks?new=component&id=${c.template_id}`)}
              />
            </Row>
          </Card>
        )}
      />

      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.name} actionLabel={t('common.save')} onAction={saveStock} actionLoading={saving}>
        {edit ? (
          <>
            <Input
              label={t('componentStock.ready')}
              value={edit.value}
              onChangeText={(v) => setEdit({ ...edit, value: v.replace(/[^0-9-]/g, '') })}
              keyboardType='numbers-and-punctuation'
              autoFocus
            />
            <Row style={{ flexWrap: 'wrap' }}>
              {[-10, -1, 1, 10].map((n) => (
                <Button key={n} title={n > 0 ? `+${n}` : String(n)} small variant='secondary' onPress={() => setEdit({ ...edit, value: String((parseInt(edit.value, 10) || 0) + n) })} />
              ))}
            </Row>
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!history} onClose={() => setHistory(null)} title={t('componentStock.historyTitle', { name: history?.name || '' })}>
        {history && !history.rows ? <Loading /> : null}
        {history?.rows?.length === 0 ? <Text style={styles.small}>{t('componentStock.historyEmpty')}</Text> : null}
        {(history?.rows || []).map((m) => (
          <Card key={m.id} style={{ paddingVertical: 10 }}>
            <Row>
              <Text style={{ fontWeight: '800', fontSize: 16, minWidth: 50, color: typeColor[m.movement_type] }}>
                {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>
                  {t(`componentStock.type_${m.movement_type}`)} · {m.stock_before} → {m.stock_after}
                </Text>
                <Text style={styles.small}>
                  {formatDateTime(m.created_at)}
                  {m.user_name ? ` · ${m.user_name}` : ''}
                </Text>
                {m.notes ? <Text style={styles.small}>{m.notes}</Text> : null}
              </View>
            </Row>
          </Card>
        ))}
      </Sheet>

      <ProduceSheet
        visible={!!produce}
        templateId={produce}
        onClose={() => setProduce(null)}
        onDone={() => {
          setProduce(null);
          reload();
        }}
      />
    </View>
  );
}
