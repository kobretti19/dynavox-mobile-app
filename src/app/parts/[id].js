import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { partsAPI, stockAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDateTime, formatMoney } from '../../utils/format';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  InfoRow,
  Input,
  Loading,
  Row,
  SectionTitle,
  Segmented,
  Sheet,
  StatTile,
  confirm,
  showError,
  styles,
} from '../../components/ui';
import PartForm from '../../components/PartForm';
import { partStatus } from '../../utils/status';
import { colors } from '../../theme';

export default function PartDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const part = useApi(() => partsAPI.getById(id), [id]);
  const movements = useApi(() => stockAPI.getMovementsByPart(id), [id]);
  const allParts = useApi(() => partsAPI.getAll(), []);
  const [showEdit, setShowEdit] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [stockMode, setStockMode] = useState('add');
  const [stockQty, setStockQty] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [saving, setSaving] = useState(false);

  const p = part.data;
  if (part.loading) return <Loading />;
  if (!p) return <ErrorBox message={part.error} onRetry={part.refresh} />;

  const st = partStatus(p, t);
  const reloadAll = () => {
    part.reload();
    movements.reload();
  };

  const saveStock = async () => {
    const qty = parseInt(stockQty, 10);
    if (Number.isNaN(qty) || (stockMode === 'add' && qty === 0) || (stockMode === 'set' && qty < 0)) {
      showError(t('common.error'), t('stockMovements.enterQuantity'));
      return;
    }
    setSaving(true);
    try {
      if (stockMode === 'add') await stockAPI.addStock({ part_id: p.id, quantity: qty, notes: stockNote || undefined });
      else await stockAPI.adjustStock({ part_id: p.id, quantity: qty, notes: stockNote || undefined });
      setShowStock(false);
      setStockQty('');
      setStockNote('');
      reloadAll();
    } catch (err) {
      showError(t('common.error'), t('stockMovements.failedToAddStock', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm(t('partsTable.deletePart'), t('partsTable.confirmDeleteMessage', { name: p.name }), {
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await partsAPI.delete(p.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('mobile.deleteFailed', { error: errorMessage(err) }));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: p.name }} />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={part.refreshing} onRefresh={reloadAll} />}
      >
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { fontSize: 19 }]} selectable>
                {p.name}
              </Text>
              {p.description ? <Text style={[styles.subtitle, { marginTop: 4 }]}>{p.description}</Text> : null}
            </View>
            <Badge label={st.label} color={st.color} />
          </Row>
        </Card>

        <Row style={{ marginBottom: 10 }}>
          <StatTile label={t('partDetails.totalStock')} value={p.quantity ?? 0} color={colors.green} />
          <StatTile label={t('parts.minStockLevel')} value={p.min_stock_level ?? 0} />
          <StatTile
            label={t('partDetails.totalValue')}
            value={(Number(p.quantity || 0) * Number(p.purchase_price || 0)).toFixed(0)}
            color={colors.purple}
          />
        </Row>

        <Row style={{ marginBottom: 10 }}>
          <Button title={t('mobile.stockAdjust')} icon='±' style={{ flex: 1 }} onPress={() => setShowStock(true)} />
          {!p.is_nla ? (
            <Button
              title={t('productionTasks.sendToProduce')}
              icon='📝'
              variant='secondary'
              style={{ flex: 1 }}
              onPress={() => router.push(`/production-tasks?new=part&id=${p.id}`)}
            />
          ) : null}
        </Row>

        <Card>
          <SectionTitle
            right={<Button title={t('common.edit')} small variant='secondary' onPress={() => setShowEdit(true)} />}
            style={{ marginTop: 0 }}
          >
            {t('partDetails.partInformation')}
          </SectionTitle>
          <InfoRow label={t('parts.skuOrderNumber')} value={p.sku} />
          <InfoRow label={t('partDetails.articleId')} value={p.article_id} />
          <InfoRow label={t('parts.color')} value={p.color} />
          <InfoRow label={t('parts.category')} value={p.category} />
          <InfoRow label={t('parts.supplier')} value={p.supplier} />
          <InfoRow label={t('partsTable.colPurchase')} value={formatMoney(p.purchase_price)} />
          <InfoRow label={t('partsTable.colSelling')} value={formatMoney(p.selling_price)} />
          <InfoRow label={t('partDetails.createdLabel')} value={formatDateTime(p.created_at)} />
        </Card>

        <SectionTitle>{t('mobile.movements')}</SectionTitle>
        {(movements.data || []).length === 0 ? (
          <Text style={[styles.small, { marginBottom: 12 }]}>{t('mobile.noMovements')}</Text>
        ) : (
          (movements.data || []).slice(0, 50).map((m) => (
            <Card key={m.id} style={{ paddingVertical: 10 }}>
              <Row>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: m.movement_type === 'in' ? colors.green : m.movement_type === 'out' ? colors.red : colors.blue,
                    minWidth: 54,
                  }}
                >
                  {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '−' : '='}
                  {m.quantity}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>
                    {m.notes || m.reference_type || '-'}
                  </Text>
                  <Text style={styles.small}>
                    {formatDateTime(m.created_at)}
                    {m.user_name ? ` · ${m.user_name}` : ''}
                  </Text>
                </View>
              </Row>
            </Card>
          ))
        )}

        <Button title={t('partsTable.deletePart')} variant='dangerOutline' onPress={remove} style={{ marginTop: 20 }} />
      </ScrollView>

      <PartForm
        visible={showEdit}
        part={p}
        parts={allParts.data}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false);
          reloadAll();
        }}
      />

      <Sheet
        visible={showStock}
        onClose={() => setShowStock(false)}
        title={`${t('mobile.stockAdjust')}: ${p.name}`}
        actionLabel={t('common.save')}
        onAction={saveStock}
        actionLoading={saving}
      >
        <Segmented
          options={[
            { value: 'add', label: t('mobile.addStock') },
            { value: 'set', label: t('mobile.setStock') },
          ]}
          value={stockMode}
          onChange={setStockMode}
          style={{ marginBottom: 16 }}
        />
        <Text style={[styles.subtitle, { marginBottom: 12 }]}>
          {t('stockMovements.currentStock')}: <Text style={{ fontWeight: '800', color: colors.text }}>{p.quantity}</Text>
        </Text>
        <Input
          label={stockMode === 'add' ? t('stockMovements.quantityToAdd') : t('stockMovements.newQuantity')}
          value={stockQty}
          onChangeText={(v) => setStockQty(v.replace(/[^0-9-]/g, ''))}
          keyboardType='numbers-and-punctuation'
          placeholder={t('stockMovements.enterQuantity')}
          autoFocus
        />
        {stockMode === 'add' ? (
          <Row style={{ flexWrap: 'wrap', marginBottom: 14 }}>
            {[-10, -5, -1, 1, 5, 10].map((n) => (
              <Button
                key={n}
                title={n > 0 ? `+${n}` : String(n)}
                small
                variant='secondary'
                onPress={() => setStockQty(String((parseInt(stockQty, 10) || 0) + n))}
              />
            ))}
          </Row>
        ) : null}
        <Input
          label={stockMode === 'add' ? t('common.notes') : t('stockMovements.reason')}
          value={stockNote}
          onChangeText={setStockNote}
          placeholder={stockMode === 'add' ? t('stockMovements.restockNotesPlaceholder') : t('stockMovements.reasonPlaceholder')}
          multiline
        />
      </Sheet>
    </>
  );
}
