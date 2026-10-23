import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ordersAPI, partsAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate, formatMoney, includesQuery } from '../../utils/format';
import { orderStatusColor } from '../../utils/status';
import { Badge, Button, Card, Empty, ErrorBox, Fab, Input, Loading, Row, Select, Sheet, StatTile, confirm, showError, styles } from '../../components/ui';
import { colors } from '../../theme';
import PartForm from '../../components/PartForm';
import ScanButton from '../../components/ScanButton';
import ScanSearchBar from '../../components/ScanSearchBar';
import { findPartByCode } from '../../utils/codes';

const STATUSES = ['draft', 'pending', 'ordered', 'partial', 'delivered', 'completed', 'cancelled'];

export default function Orders() {
  const { t } = useLanguage();
  const orders = useApi(() => ordersAPI.getAll());
  const stats = useApi(() => ordersAPI.getStats());
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('open');
  const [showCreate, setShowCreate] = useState(false);
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState({ order_number: '', notes: '', items: [] });
  const [item, setItem] = useState({ part_id: null, quantity: '1', unit_price: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [newPart, setNewPart] = useState(null); // PartForm prefill for an unknown scanned code

  const list = orders.data || [];
  const filtered = useMemo(
    () =>
      list.filter(
        (o) =>
          (status === 'all' || (status === 'open' ? !['delivered', 'completed', 'cancelled'].includes(o.status) : o.status === status)) &&
          includesQuery(q, o.order_number, o.notes, o.created_by_name, o.fullname, o.parts_name),
      ),
    [list, q, status],
  );

  const openCreate = () => {
    setForm({ order_number: '', notes: '', items: [] });
    setItem({ part_id: null, quantity: '1', unit_price: '', notes: '' });
    setShowCreate(true);
    partsAPI
      .getAll()
      .then((res) => setParts(res.data.data || []))
      .catch(() => {});
  };

  const addItem = () => {
    const part = parts.find((p) => p.id === item.part_id);
    const qty = parseInt(item.quantity, 10);
    if (!part || !qty || qty <= 0) {
      showError(t('common.error'), t('orders.alertSelectPartAndQty'));
      return;
    }
    if (form.items.some((i) => i.part_id === part.id)) {
      showError(t('common.error'), t('orders.alertPartAlreadyAdded'));
      return;
    }
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          part_id: part.id,
          quantity: qty,
          unit_price: parseFloat(item.unit_price) || Number(part.purchase_price) || 0,
          notes: item.notes || '',
          part_name: part.name,
          part_color: part.color,
          part_sku: part.sku,
        },
      ],
    });
    setItem({ part_id: null, quantity: '1', unit_price: '', notes: '' });
  };

  const pickPart = (part) => setItem({ part_id: part.id, quantity: '1', unit_price: String(part.purchase_price || ''), notes: '' });

  // Scanned article: select it (or count it up when it's already on the
  // order); unknown codes can be created as a new part right away.
  const scanPart = async (code) => {
    const part = findPartByCode(parts, code);
    if (part) {
      if (form.items.some((i) => i.part_id === part.id)) {
        setForm((f) => ({ ...f, items: f.items.map((i) => (i.part_id === part.id ? { ...i, quantity: i.quantity + 1 } : i)) }));
      } else {
        pickPart(part);
      }
      return;
    }
    if (await confirm(t('mobile.scanPartNotFound', { code }), t('mobile.scanCreatePartQuestion'), { confirmText: t('mobile.scanCreatePart'), cancelText: t('common.cancel'), destructive: false })) {
      setNewPart({ sku: code });
    }
  };

  const create = async () => {
    if (form.items.length === 0) {
      showError(t('common.error'), t('orders.alertAddOneItem'));
      return;
    }
    setSaving(true);
    try {
      const res = await ordersAPI.create(form);
      setShowCreate(false);
      orders.reload();
      stats.reload();
      const id = res.data?.data?.id;
      if (id) router.push(`/orders/${id}`);
    } catch (err) {
      showError(t('common.error'), t('orders.alertCreateFailed', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  if (orders.loading) return <Loading />;
  if (orders.error && !orders.data) return <ErrorBox message={orders.error} onRetry={orders.refresh} />;

  const s = stats.data || {};
  const total = form.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const tabs = [
    { value: 'open', label: t('mobile.open') },
    ...STATUSES.map((st) => ({ value: st, label: t(`orders.status.${st}`) })),
    { value: 'all', label: t('common.all') },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScanSearchBar
        value={q}
        onChangeText={setQ}
        placeholder={t('nav.searchOrders')}
        right={<Button title='📊' small variant='secondary' style={{ height: 42 }} onPress={() => router.push('/orders/report')} />}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 6 }}>
          {tabs.map((tab) => (
            <Button key={tab.value} title={tab.label} small variant={status === tab.value ? 'primary' : 'secondary'} onPress={() => setStatus(tab.value)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={orders.refreshing}
            onRefresh={() => {
              orders.refresh();
              stats.reload();
            }}
          />
        }
        ListHeaderComponent={
          <Row style={{ marginBottom: 10 }}>
            <StatTile label={t('orders.statPending')} value={s.pending ?? '-'} color={colors.yellow} />
            <StatTile label={t('orders.statOrdered')} value={s.ordered ?? '-'} color={colors.blue} />
            <StatTile label={t('orders.statPartial')} value={s.partial ?? '-'} color={colors.orange} />
          </Row>
        }
        ListEmptyComponent={<Empty icon='🛒' title={t('orders.emptyTitle')} subtitle={t('orders.emptyMessage')} />}
        renderItem={({ item: o }) => (
          <Card onPress={() => router.push(`/orders/${o.id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{o.order_number || `#${o.id}`}</Text>
                <Text style={styles.small} numberOfLines={2}>
                  {o.parts_name || '-'}
                </Text>
                <Text style={styles.small}>
                  {formatDate(o.created_at)}
                  {o.fullname || o.created_by_name ? ` · ${o.fullname || o.created_by_name}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={t(`orders.status.${o.status}`)} color={orderStatusColor[o.status]} />
                <Text style={styles.small}>
                  {o.item_count} {t('mobile.items')} · {o.total_delivered}/{o.total_quantity}
                </Text>
                {Number(o.total_backorder) > 0 ? <Text style={{ fontSize: 12, color: colors.orange }}>{t('orders.backorderCount', { count: o.total_backorder })}</Text> : null}
              </View>
            </Row>
          </Card>
        )}
      />
      <Fab onPress={openCreate} />

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title={t('orders.createOrderPlain')} actionLabel={t('common.create')} onAction={create} actionLoading={saving}>
        <Input label={t('orders.orderNumberLabel')} value={form.order_number} onChangeText={(v) => setForm({ ...form, order_number: v })} placeholder={t('orders.orderNumberPlaceholder')} />
        <Input label={t('orders.orderNotesLabel')} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder={t('orders.orderNotesPlaceholderGeneral')} multiline />
        <Text style={styles.label}>{t('orders.addItemsLabel', { count: form.items.length })}</Text>
        {form.items.map((i, idx) => (
          <Row key={i.part_id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>
                {i.part_name}
                {i.part_color ? ` (${i.part_color})` : ''}
              </Text>
              <Text style={styles.small}>
                {i.quantity} × {formatMoney(i.unit_price)}
                {i.notes ? ` · ${i.notes}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => setForm({ ...form, items: form.items.filter((_, j) => j !== idx) })} hitSlop={8}>
              <Text style={{ color: colors.red, fontSize: 16 }}>✕</Text>
            </Pressable>
          </Row>
        ))}
        <View style={{ backgroundColor: colors.grayBg, borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 14 }}>
          <Row style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Select
                label={t('orders.part')}
                value={item.part_id}
                options={parts
                  .filter((p) => !p.is_nla)
                  .map((p) => ({
                    value: p.id,
                    label: `${p.name}${p.color ? ` (${p.color})` : ''}`,
                    sublabel: [`${t('orders.stockLabel')} ${p.quantity}`, p.sku || t('orders.noSku'), p.supplier].filter(Boolean).join(' · '),
                  }))}
                onChange={(v) => {
                  const p = parts.find((x) => x.id === v);
                  setItem({ ...item, part_id: v, unit_price: p ? String(p.purchase_price || '') : '' });
                }}
                placeholder={t('orders.searchPartPlaceholder')}
              />
            </View>
            <ScanButton style={{ height: 44, marginBottom: 14 }} onScanned={scanPart} />
          </Row>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Input label={t('orders.qty')} value={item.quantity} onChangeText={(v) => setItem({ ...item, quantity: v.replace(/[^0-9]/g, '') })} keyboardType='number-pad' />
            </View>
            <View style={{ flex: 1 }}>
              <Input label='CHF' value={item.unit_price} onChangeText={(v) => setItem({ ...item, unit_price: v.replace(',', '.') })} keyboardType='decimal-pad' />
            </View>
          </Row>
          <Input value={item.notes} onChangeText={(v) => setItem({ ...item, notes: v })} placeholder={t('orders.itemNotesPlaceholderShort')} />
          <Button title={t('orders.addItemButton')} variant='secondary' onPress={addItem} disabled={!item.part_id} />
        </View>
        <Text style={{ fontWeight: '800', fontSize: 16, textAlign: 'right' }}>
          {t('orders.totalColon')} {formatMoney(total)}
        </Text>
        <PartForm
          visible={!!newPart}
          parts={parts}
          initial={newPart}
          onClose={() => setNewPart(null)}
          onSaved={async (partId) => {
            setNewPart(null);
            try {
              const res = await partsAPI.getAll();
              const list = res.data.data || [];
              setParts(list);
              const part = list.find((p) => p.id === partId);
              if (part) pickPart(part);
            } catch {
              // keep the form as it is
            }
          }}
        />
      </Sheet>
    </View>
  );
}
