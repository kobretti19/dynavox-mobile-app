import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { partsAPI, stockAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDateTime, includesQuery } from '../../utils/format';
import { Badge, Card, Empty, Fab, Input, Loading, Row, SearchBar, Segmented, Select, Sheet, StatTile, showError, styles } from '../../components/ui';
import { colors } from '../../theme';

const movementColor = { in: colors.green, out: colors.red, adjustment: colors.blue };

const OpenOrder = ({ row, t }) => {
  if (!row.open_order_number) return <Text style={styles.small}>{t('stockMovements.notOrdered')}</Text>;
  return (
    <Text style={[styles.small, { color: row.open_order_backorder > 0 ? colors.orange : colors.blue }]}>
      🛒 {row.open_order_number} · {t(`stockMovements.orderStatus.${row.open_order_status}`) || row.open_order_status}
      {row.open_order_backorder > 0 ? ` · ${t('stockMovements.backorderQty', { qty: row.open_order_backorder })}` : ''}
    </Text>
  );
};

export default function StockMovements() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('alerts');
  const [q, setQ] = useState('');
  const movements = useApi(() => stockAPI.getMovements());
  const levels = useApi(() => stockAPI.getLevels());
  const alerts = useApi(() => stockAPI.getAlerts());
  const [form, setForm] = useState(null);
  const [parts, setParts] = useState([]);
  const [saving, setSaving] = useState(false);

  const reloadAll = () => {
    movements.reload();
    levels.reload();
    alerts.reload();
  };

  const openForm = (mode, partId = null) => {
    setForm({ mode, part_id: partId, quantity: '', notes: '' });
    partsAPI
      .getAll()
      .then((res) => setParts(res.data.data || []))
      .catch(() => {});
  };

  const save = async () => {
    const qty = parseInt(form.quantity, 10);
    if (!form.part_id || Number.isNaN(qty)) return;
    setSaving(true);
    try {
      if (form.mode === 'add') await stockAPI.addStock({ part_id: form.part_id, quantity: qty, notes: form.notes || undefined });
      else await stockAPI.adjustStock({ part_id: form.part_id, quantity: qty, notes: form.notes || undefined });
      setForm(null);
      reloadAll();
    } catch (err) {
      const key = form.mode === 'add' ? 'stockMovements.failedToAddStock' : 'stockMovements.failedToAdjustStock';
      showError(t('common.error'), t(key, { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const mv = movements.data || [];
  const lv = levels.data || [];
  const al = alerts.data || [];

  const data = useMemo(() => {
    if (tab === 'movements') return mv.filter((m) => includesQuery(q, m.part_name, m.part_color, m.sku, m.supplier, m.notes, m.user_name, m.reference_type));
    if (tab === 'levels') return lv.filter((l) => includesQuery(q, l.part_name, l.color_name, l.sku, l.supplier, l.category));
    return al.filter((a) => includesQuery(q, a.name, a.color, a.sku, a.supplier));
  }, [tab, q, mv, lv, al]);

  const current = tab === 'movements' ? movements : tab === 'levels' ? levels : alerts;
  const selectedPart = form ? parts.find((p) => p.id === form.part_id) : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Segmented
          options={[
            { value: 'alerts', label: `⚠️ ${al.length}` },
            { value: 'levels', label: t('stockMovements.stockLevelsTab', { count: lv.length }) },
            { value: 'movements', label: t('stockMovements.movementsTab', { count: mv.length }) },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('nav.searchStockMovements')} />
      {current.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={current.refreshing} onRefresh={reloadAll} />}
          initialNumToRender={20}
          ListHeaderComponent={
            tab === 'alerts' ? (
              <Row style={{ marginBottom: 10 }}>
                <StatTile label={t('stockMovements.lowStock')} value={al.filter((a) => a.quantity > 0).length} color={colors.yellow} />
                <StatTile label={t('stockMovements.outOfStock')} value={al.filter((a) => a.quantity <= 0).length} color={colors.red} />
              </Row>
            ) : tab === 'movements' ? (
              <Row style={{ marginBottom: 10 }}>
                <StatTile label={t('stockMovements.stockIn')} value={mv.filter((m) => m.movement_type === 'in').length} color={colors.green} />
                <StatTile label={t('stockMovements.stockOut')} value={mv.filter((m) => m.movement_type === 'out').length} color={colors.red} />
              </Row>
            ) : null
          }
          ListEmptyComponent={
            tab === 'alerts' ? (
              <Empty icon='✅' title={t('stockMovements.noAlertsTitle')} subtitle={t('stockMovements.noAlertsMessage')} />
            ) : tab === 'levels' ? (
              <Empty icon='📦' title={t('stockMovements.noStockLevelsTitle')} subtitle={t('stockMovements.noStockLevelsMessage')} />
            ) : (
              <Empty icon='📈' title={t('stockMovements.noMovementsTitle')} subtitle={t('stockMovements.noMovementsMessage')} />
            )
          }
          renderItem={({ item }) => {
            if (tab === 'movements') {
              return (
                <Card onPress={() => router.push(`/parts/${item.part_id}`)} style={{ paddingVertical: 10 }}>
                  <Row style={{ alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', minWidth: 56, color: movementColor[item.movement_type] || colors.text }}>
                      {item.movement_type === 'in' ? '+' : item.movement_type === 'out' ? '−' : '='}
                      {item.quantity}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {item.part_name}
                        {item.part_color ? ` (${item.part_color})` : ''}
                      </Text>
                      <Text style={styles.small} numberOfLines={2}>
                        {item.notes || item.reference_type}
                      </Text>
                      <Text style={styles.small}>
                        {formatDateTime(item.created_at)}
                        {item.user_name ? ` · ${item.user_name}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.small}>{t('stockMovements.currentStock')}</Text>
                      <Text style={{ fontWeight: '700' }}>{item.current_stock}</Text>
                    </View>
                  </Row>
                </Card>
              );
            }
            if (tab === 'levels') {
              const st = item.stock_status;
              return (
                <Card onPress={() => router.push(`/parts/${item.id}`)} style={{ paddingVertical: 10 }}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {item.part_name}
                        {item.color_name ? ` (${item.color_name})` : ''}
                      </Text>
                      <Text style={styles.small}>
                        {[item.sku, item.supplier].filter(Boolean).join(' · ')} · {t('stockMovements.minLevel')}: {item.min_stock_level}
                      </Text>
                      <OpenOrder row={item} t={t} />
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800' }}>{item.total_quantity}</Text>
                      <Badge
                        label={st === 'critical' ? t('stockMovements.outOfStock') : st === 'low' ? t('stockMovements.lowStock') : t('stockMovements.inStock')}
                        color={st === 'critical' ? 'red' : st === 'low' ? 'yellow' : 'green'}
                      />
                    </View>
                  </Row>
                </Card>
              );
            }
            return (
              <Card onPress={() => openForm('add', item.id)} onLongPress={() => router.push(`/parts/${item.id}`)} style={{ paddingVertical: 10 }}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {item.name}
                      {item.color ? ` (${item.color})` : ''}
                    </Text>
                    <Text style={styles.small}>{[item.sku, item.supplier].filter(Boolean).join(' · ') || ' '}</Text>
                    <OpenOrder row={item} t={t} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: item.quantity <= 0 ? colors.red : colors.yellow }}>
                      {item.quantity} / {item.min_stock_level}
                    </Text>
                    <Text style={[styles.small, { color: colors.blue }]}>＋ {t('stockMovements.add')}</Text>
                  </View>
                </Row>
              </Card>
            );
          }}
        />
      )}
      <Fab onPress={() => openForm('add')} />

      <Sheet
        visible={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'add' ? t('stockMovements.addStockModalTitle') : t('stockMovements.adjustStockModalTitle')}
        actionLabel={t('common.save')}
        onAction={save}
        actionLoading={saving}
      >
        {form ? (
          <>
            <Segmented
              options={[
                { value: 'add', label: t('stockMovements.add') },
                { value: 'adjust', label: t('stockMovements.adjust') },
              ]}
              value={form.mode}
              onChange={(mode) => setForm({ ...form, mode })}
              style={{ marginBottom: 14 }}
            />
            <Select
              label={t('stockMovements.part')}
              value={form.part_id}
              options={parts.map((p) => ({ value: p.id, label: `${p.name}${p.color ? ` (${p.color})` : ''}`, sublabel: `${t('stockMovements.currentStock')}: ${p.quantity}${p.sku ? ` · ${p.sku}` : ''}` }))}
              onChange={(v) => setForm({ ...form, part_id: v })}
              placeholder={t('stockMovements.searchPartPlaceholder')}
            />
            {selectedPart ? (
              <Text style={[styles.subtitle, { marginTop: -6, marginBottom: 12 }]}>
                {t('stockMovements.currentStock')}: <Text style={{ fontWeight: '800', color: colors.text }}>{selectedPart.quantity}</Text>
              </Text>
            ) : null}
            <Input
              label={form.mode === 'add' ? t('stockMovements.quantityToAdd') : t('stockMovements.newQuantity')}
              value={form.quantity}
              onChangeText={(v) => setForm({ ...form, quantity: v.replace(/[^0-9-]/g, '') })}
              keyboardType='numbers-and-punctuation'
              placeholder={form.mode === 'add' ? t('stockMovements.enterQuantity') : t('stockMovements.enterNewQuantity')}
            />
            <Input
              label={form.mode === 'add' ? t('common.notes') : t('stockMovements.reason')}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              placeholder={form.mode === 'add' ? t('stockMovements.restockNotesPlaceholder') : t('stockMovements.reasonPlaceholder')}
              multiline
            />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
