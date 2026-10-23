import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ordersAPI, partsAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime, formatMoney } from '../../utils/format';
import { CLOSED_ITEM_STATUSES, orderStatusColor } from '../../utils/status';
import { Badge, Button, Card, ErrorBox, Input, Loading, Row, SectionTitle, Segmented, Select, Sheet, confirm, showError, styles } from '../../components/ui';
import { colors } from '../../theme';
import PartForm from '../../components/PartForm';
import ScanButton from '../../components/ScanButton';
import ScanModal from '../../components/ScanModal';
import { findPartByCode } from '../../utils/codes';

const ITEM_STATUSES = ['pending', 'partial', 'delivered', 'backorder', 'cancelled', 'nla', 'closed'];

export default function OrderDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [header, setHeader] = useState({ order_number: '', notes: '' });
  const [parts, setParts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [newItem, setNewItem] = useState({ part_id: null, quantity: '1', unit_price: '', notes: '' });
  const [delivery, setDelivery] = useState(null);
  const [itemEdit, setItemEdit] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [newPart, setNewPart] = useState(null); // PartForm prefill for an unknown scanned code
  const [deliveryScan, setDeliveryScan] = useState(false);
  const [received, setReceived] = useState(null); // { idx, value } -- quantity prompt after a scan

  const load = useCallback(async () => {
    try {
      const res = await ordersAPI.getById(id);
      setOrder(res.data.data);
      setHeader({ order_number: res.data.data.order_number || '', notes: res.data.data.notes || '' });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
    partsAPI
      .getAll()
      .then((res) => setParts(res.data.data || []))
      .catch(() => {});
    ordersAPI
      .getAll()
      .then((res) => setAllOrders(res.data.data || []))
      .catch(() => {});
  }, [load]);

  const run = async (fn, failKey = 'orders.alertGenericFailed') => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      showError(t('common.error'), t(failKey, { error: errorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  if (!order && error) return <ErrorBox message={t('orders.alertLoadFailed', { error })} onRetry={load} />;
  if (!order) return <Loading />;

  const items = order.items || [];
  const total = items.reduce((s, i) => s + Number(i.quantity_ordered) * Number(i.unit_price || 0), 0);
  const headerDirty = header.order_number !== (order.order_number || '') || header.notes !== (order.notes || '');
  const finished = ['delivered', 'completed', 'cancelled'].includes(order.status);

  const saveHeader = () => {
    if (!header.order_number.trim()) {
      showError(t('common.error'), t('orders.alertOrderNumberEmpty'));
      return;
    }
    run(() => ordersAPI.update(order.id, { order_number: header.order_number.trim(), notes: header.notes }), 'orders.alertUpdateNotesFailed');
  };

  const setStatus = (status) => run(() => ordersAPI.updateStatus(order.id, { status, notes: '' }), 'orders.alertUpdateStatusFailed');

  const openDelivery = () =>
    setDelivery({
      notes: '',
      items: items.map((i) => {
        const ordered = i.quantity_ordered || 0;
        const already = i.quantity_delivered || 0;
        return {
          id: i.id,
          part_id: i.part_id,
          sku: i.sku,
          part_name: i.part_name,
          ordered,
          already,
          receiving: '',
          status: CLOSED_ITEM_STATUSES.includes(i.status) ? i.status : 'partial',
          notes: i.item_notes || i.notes || '',
        };
      }),
    });

  const submitDelivery = () => {
    const rows = delivery.items;
    const missing = rows.some((r) => !CLOSED_ITEM_STATUSES.includes(r.status) && r.already + (parseInt(r.receiving, 10) || 0) < r.ordered);
    const payload = rows.map((r) => {
      const totalNow = r.already + (parseInt(r.receiving, 10) || 0);
      return {
        id: r.id,
        quantity_delivered: parseInt(r.receiving, 10) || 0,
        item_status: CLOSED_ITEM_STATUSES.includes(r.status) ? r.status : totalNow >= r.ordered ? 'delivered' : 'partial',
        notes: r.notes,
      };
    });
    run(async () => {
      await ordersAPI.updateStatus(order.id, { status: missing ? 'partial' : 'delivered', notes: delivery.notes, items: payload });
      setDelivery(null);
    });
  };

  const setDeliveryRow = (idx, patch) => setDelivery((d) => ({ ...d, items: d.items.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));

  // Scanned article while receiving: ask how many arrived and add that to
  // the row's "receiving" quantity.
  const onDeliveryScanned = (code) => {
    setDeliveryScan(false);
    const rows = delivery.items.map((r, idx) => ({ ...r, idx, article_id: parts.find((p) => p.id === r.part_id)?.article_id }));
    const row = findPartByCode(rows, code);
    setTimeout(() => {
      if (!row) {
        showError(t('common.error'), t('mobile.scanNotInOrder', { code }));
        return;
      }
      const open = Math.max(0, row.ordered - row.already - (parseInt(row.receiving, 10) || 0));
      setReceived({ idx: row.idx, value: String(open || 1) });
    }, 350);
  };

  const applyReceived = (scanNext) => {
    const qty = parseInt(received.value, 10) || 0;
    const row = delivery.items[received.idx];
    setDeliveryRow(received.idx, { receiving: String((parseInt(row.receiving, 10) || 0) + qty), status: 'partial' });
    setReceived(null);
    if (scanNext) setTimeout(() => setDeliveryScan(true), 350);
  };

  const pickNewItemPart = (part) => setNewItem({ part_id: part.id, quantity: '1', unit_price: String(part.purchase_price || ''), notes: '' });

  const scanNewItem = async (code) => {
    const part = findPartByCode(parts, code);
    if (part) {
      pickNewItemPart(part);
      return;
    }
    if (await confirm(t('mobile.scanPartNotFound', { code }), t('mobile.scanCreatePartQuestion'), { confirmText: t('mobile.scanCreatePart'), cancelText: t('common.cancel'), destructive: false })) {
      setNewPart({ sku: code });
    }
  };

  const complete = async () => {
    if (!(await confirm(t('orders.completeOrder'), t('orders.confirmCompleteOrder', { order: order.order_number || `#${order.id}` }), { confirmText: t('common.confirm'), cancelText: t('common.cancel'), destructive: false }))) return;
    run(() => ordersAPI.complete(order.id, {}), 'orders.alertCompleteFailed');
  };

  const cancelOrder = async () => {
    if (!(await confirm(t('orders.cancelOrderTitle'), t('orders.cancelOrderMessage', { order: order.order_number || `#${order.id}` }), { confirmText: t('common.confirm'), cancelText: t('common.back') }))) return;
    try {
      await ordersAPI.delete(order.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('orders.alertCancelOrderFailed', { error: errorMessage(err) }));
    }
  };

  const addItem = () => {
    const qty = parseInt(newItem.quantity, 10);
    if (!newItem.part_id || !qty) {
      showError(t('common.error'), t('orders.alertSelectPartAndEnterQty'));
      return;
    }
    run(async () => {
      await ordersAPI.addItem(order.id, { part_id: newItem.part_id, quantity: qty, unit_price: parseFloat(newItem.unit_price) || 0, notes: newItem.notes || null });
      setNewItem({ part_id: null, quantity: '1', unit_price: '', notes: '' });
    }, 'orders.alertAddItemFailed');
  };

  const submitTransfer = () => {
    const qty = parseInt(transfer.qty, 10);
    const item = transfer.item;
    if (!transfer.target || !qty || qty <= 0) {
      showError(t('common.error'), t('orders.alertSelectTargetOrder'));
      return;
    }
    if (qty > item.quantity_ordered) {
      showError(t('common.error'), t('orders.alertCannotTransferMore'));
      return;
    }
    run(async () => {
      await ordersAPI.addItem(transfer.target, { part_id: item.part_id, quantity: qty, unit_price: item.unit_price || 0, notes: item.notes || null });
      if (qty >= item.quantity_ordered) await ordersAPI.deleteItem(item.id);
      else await ordersAPI.updateItem(item.id, { quantity: item.quantity_ordered - qty });
      setTransfer(null);
    }, 'orders.alertTransferFailed');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: order.order_number || `#${order.id}` }} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 60 }} keyboardShouldPersistTaps='handled' refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card>
          <Row style={{ alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { fontSize: 19 }]}>{order.order_number || `#${order.id}`}</Text>
              <Text style={styles.small}>
                {formatDateTime(order.created_at)}
                {order.created_by_username ? ` · ${order.created_by_username}` : ''}
              </Text>
            </View>
            <Badge label={t(`orders.status.${order.status}`)} color={orderStatusColor[order.status]} />
          </Row>
          <Input label={t('orders.orderNumberPlaceholderShort')} value={header.order_number} onChangeText={(v) => setHeader({ ...header, order_number: v })} />
          <Input label={t('common.notes')} value={header.notes} onChangeText={(v) => setHeader({ ...header, notes: v })} placeholder={t('orders.orderNotesPlaceholder')} multiline />
          {headerDirty ? <Button title={t('common.save')} onPress={saveHeader} loading={busy} /> : null}
        </Card>

        {!finished ? (
          <Row style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {['draft', 'pending'].includes(order.status) ? <Button title={t('orders.moveToOrdered')} small variant='blue' onPress={() => setStatus('ordered')} disabled={busy} /> : null}
            {['ordered', 'partial'].includes(order.status) ? (
              <Button title={order.status === 'partial' ? `📦 ${t('orders.receiveMore')}` : `📦 ${t('orders.receive')}`} small variant='success' onPress={openDelivery} disabled={busy} />
            ) : null}
            {['ordered', 'partial'].includes(order.status) ? <Button title={t('orders.completeOrder')} small variant='secondary' onPress={complete} disabled={busy} /> : null}
            <Button title={t('orders.cancelOrderTitle')} small variant='dangerOutline' onPress={cancelOrder} disabled={busy} />
          </Row>
        ) : null}

        <SectionTitle>
          {t('orders.colItems')} ({items.length})
        </SectionTitle>
        {items.map((i) => {
          const closed = CLOSED_ITEM_STATUSES.includes(i.status);
          return (
            <Card key={i.id} style={closed ? { opacity: 0.6 } : null} onPress={() => setItemEdit({ item: i, status: i.status, notes: i.item_notes || i.notes || '', quantity: String(i.quantity_ordered) })}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => router.push(`/parts/${i.part_id}`)}>
                    <Text style={{ fontWeight: '700', color: colors.blue }}>{i.part_name}</Text>
                  </Pressable>
                  <Text style={styles.small}>
                    {i.sku || t('orders.noSku')} · {formatMoney(i.unit_price)}
                  </Text>
                  {i.item_notes || i.notes ? <Text style={[styles.small, { color: colors.text }]}>📝 {i.item_notes || i.notes}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={t(`orders.status.${i.status}`)} color={orderStatusColor[i.status]} />
                  <Text style={{ fontWeight: '800' }}>
                    {i.quantity_delivered || 0} / {i.quantity_ordered}
                  </Text>
                  {Number(i.quantity_backorder) > 0 ? <Text style={{ fontSize: 12, color: colors.orange }}>{t('stockMovements.backorderQty', { qty: i.quantity_backorder })}</Text> : null}
                </View>
              </Row>
            </Card>
          );
        })}
        <Text style={{ fontWeight: '800', fontSize: 16, textAlign: 'right', marginVertical: 8 }}>
          {t('orders.totalColon')} {formatMoney(total)}
        </Text>

        {!finished ? (
          <Card>
            <SectionTitle style={{ marginTop: 0 }}>{t('orders.addShort')}</SectionTitle>
            <Row style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Select
                  label={t('orders.part')}
                  value={newItem.part_id}
                  options={parts.filter((p) => !p.is_nla).map((p) => ({ value: p.id, label: `${p.name}${p.color ? ` (${p.color})` : ''}`, sublabel: [`${t('orders.stockLabel')} ${p.quantity}`, p.sku, p.supplier].filter(Boolean).join(' · ') }))}
                  onChange={(v) => {
                    const p = parts.find((x) => x.id === v);
                    setNewItem({ ...newItem, part_id: v, unit_price: p ? String(p.purchase_price || '') : '' });
                  }}
                  placeholder={t('orders.addPartPlaceholder')}
                />
              </View>
              <ScanButton style={{ height: 44, marginBottom: 14 }} onScanned={scanNewItem} />
            </Row>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Input label={t('orders.qty')} value={newItem.quantity} onChangeText={(v) => setNewItem({ ...newItem, quantity: v.replace(/[^0-9]/g, '') })} keyboardType='number-pad' />
              </View>
              <View style={{ flex: 1 }}>
                <Input label='CHF' value={newItem.unit_price} onChangeText={(v) => setNewItem({ ...newItem, unit_price: v.replace(',', '.') })} keyboardType='decimal-pad' />
              </View>
            </Row>
            <Input value={newItem.notes} onChangeText={(v) => setNewItem({ ...newItem, notes: v })} placeholder={t('orders.itemNotesPlaceholderShort')} />
            <Button title={t('orders.addItemButton')} variant='secondary' onPress={addItem} disabled={!newItem.part_id || busy} />
          </Card>
        ) : null}
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
              if (part) pickNewItemPart(part);
            } catch {
              // keep the form as it is
            }
          }}
        />
      </ScrollView>

      {/* Receive delivery */}
      <Sheet visible={!!delivery} onClose={() => setDelivery(null)} title={t('orders.receiveDeliveryTitle', { order: order.order_number || `#${order.id}` })} actionLabel={t('common.save')} onAction={submitDelivery} actionLoading={busy}>
        <Button title={t('mobile.scanProduct')} icon='📷' variant='blue' style={{ marginBottom: 12 }} onPress={() => setDeliveryScan(true)} />
        {(delivery?.items || []).map((r, idx) => {
          const closed = CLOSED_ITEM_STATUSES.includes(r.status);
          const remaining = Math.max(0, r.ordered - r.already);
          return (
            <Card key={r.id} style={closed ? { opacity: 0.6 } : null}>
              <Text style={{ fontWeight: '700' }}>{r.part_name}</Text>
              <Text style={styles.small}>
                {t('orders.ordered')}: {r.ordered} · {t('orders.delivered')}: {r.already}
                {remaining === 0 ? ` · ${t('orders.doneCheck')}` : ''}
              </Text>
              {!closed && remaining > 0 ? (
                <Row style={{ marginTop: 8, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Input label={t('orders.receiving')} value={r.receiving} onChangeText={(v) => setDeliveryRow(idx, { receiving: v.replace(/[^0-9]/g, '') })} keyboardType='number-pad' placeholder='0' />
                  </View>
                  <Button title={`= ${remaining}`} small variant='secondary' style={{ marginBottom: 14 }} onPress={() => setDeliveryRow(idx, { receiving: String(remaining) })} />
                </Row>
              ) : null}
              <Segmented
                scroll
                options={[
                  { value: 'partial', label: '✓' },
                  { value: 'cancelled', label: t('orders.status.cancelled') },
                  { value: 'nla', label: t('orders.status.nla') },
                  { value: 'closed', label: t('orders.status.closed') },
                ]}
                value={closed ? r.status : 'partial'}
                onChange={(v) => setDeliveryRow(idx, { status: v, receiving: v === 'cancelled' ? '' : r.receiving })}
              />
              <Input value={r.notes} onChangeText={(v) => setDeliveryRow(idx, { notes: v })} placeholder={t('orders.notesPlaceholderShort')} />
            </Card>
          );
        })}
        <Input label={t('common.notes')} value={delivery?.notes || ''} onChangeText={(v) => setDelivery({ ...delivery, notes: v })} placeholder={t('orders.deliveryNotesPlaceholder')} multiline />
        <ScanModal visible={deliveryScan} initialMode='barcode' onClose={() => setDeliveryScan(false)} onScanned={onDeliveryScanned} />
        <Sheet visible={!!received} onClose={() => setReceived(null)} title={received ? delivery?.items[received.idx]?.part_name : ''} actionLabel='OK' onAction={() => applyReceived(false)}>
          {received && delivery?.items[received.idx] ? (
            <>
              <Text style={[styles.subtitle, { marginBottom: 12 }]}>
                {t('mobile.receiveSummary', {
                  ordered: delivery.items[received.idx].ordered,
                  already: delivery.items[received.idx].already,
                  now: parseInt(delivery.items[received.idx].receiving, 10) || 0,
                })}
              </Text>
              <Input
                label={t('mobile.receivedQty')}
                value={received.value}
                onChangeText={(v) => setReceived({ ...received, value: v.replace(/[^0-9]/g, '') })}
                keyboardType='number-pad'
                autoFocus
                selectTextOnFocus
              />
              <Button title='OK' onPress={() => applyReceived(false)} disabled={!received.value} />
              <Button title={t('mobile.scanNext')} icon='📷' variant='secondary' style={{ marginTop: 10 }} onPress={() => applyReceived(true)} disabled={!received.value} />
            </>
          ) : null}
        </Sheet>
      </Sheet>

      {/* Edit one item */}
      <Sheet visible={!!itemEdit} onClose={() => setItemEdit(null)} title={itemEdit?.item.part_name}>
        {itemEdit ? (
          <>
            <Select
              label={t('common.status')}
              value={itemEdit.status}
              options={ITEM_STATUSES.map((s) => ({ value: s, label: t(`orders.status.${s}`) }))}
              onChange={(v) => setItemEdit({ ...itemEdit, status: v })}
            />
            <Input label={t('orders.qty')} value={itemEdit.quantity} onChangeText={(v) => setItemEdit({ ...itemEdit, quantity: v.replace(/[^0-9]/g, '') })} keyboardType='number-pad' />
            <Input label={t('common.notes')} value={itemEdit.notes} onChangeText={(v) => setItemEdit({ ...itemEdit, notes: v })} placeholder={t('orders.itemNotesPlaceholder')} multiline />
            <Button
              title={t('common.save')}
              loading={busy}
              onPress={() =>
                run(async () => {
                  const patch = {};
                  if (itemEdit.status !== itemEdit.item.status) patch.item_status = itemEdit.status;
                  if (itemEdit.notes !== (itemEdit.item.item_notes || itemEdit.item.notes || '')) patch.notes = itemEdit.notes;
                  if (parseInt(itemEdit.quantity, 10) && parseInt(itemEdit.quantity, 10) !== itemEdit.item.quantity_ordered) patch.quantity = parseInt(itemEdit.quantity, 10);
                  if (Object.keys(patch).length) await ordersAPI.updateItem(itemEdit.item.id, patch);
                  setItemEdit(null);
                }, 'orders.alertUpdateItemStatusFailed')
              }
            />
            <Button
              title={`↗ ${t('orders.moveToAnotherOrder')}`}
              variant='secondary'
              style={{ marginTop: 10 }}
              onPress={() => {
                const item = itemEdit.item;
                setItemEdit(null);
                setTransfer({ item, target: null, qty: String(item.quantity_ordered) });
              }}
            />
            <Button
              title={t('common.remove')}
              variant='dangerOutline'
              style={{ marginTop: 10 }}
              onPress={async () => {
                if (!(await confirm(t('mobile.confirmDeleteTitle'), t('orders.confirmRemoveItem'), { confirmText: t('common.remove'), cancelText: t('common.cancel') }))) return;
                run(async () => {
                  await ordersAPI.deleteItem(itemEdit.item.id);
                  setItemEdit(null);
                }, 'orders.alertDeleteItemFailed');
              }}
            />
          </>
        ) : null}
      </Sheet>

      {/* Move item */}
      <Sheet visible={!!transfer} onClose={() => setTransfer(null)} title={t('orders.moveItemTitle')} actionLabel={t('orders.moveItemButton')} onAction={submitTransfer} actionLoading={busy}>
        {transfer ? (
          <>
            <Text style={[styles.subtitle, { marginBottom: 12 }]}>
              {transfer.item.part_name} · {t('orders.orderedQty', { qty: transfer.item.quantity_ordered })}
            </Text>
            <Input label={t('orders.quantityToMove')} value={transfer.qty} onChangeText={(v) => setTransfer({ ...transfer, qty: v.replace(/[^0-9]/g, '') })} keyboardType='number-pad' placeholder={t('orders.maxPlaceholder', { max: transfer.item.quantity_ordered })} />
            <Select
              label={t('orders.moveToOrderLabel')}
              value={transfer.target}
              options={allOrders
                .filter((o) => o.id !== order.id && !['delivered', 'completed', 'cancelled'].includes(o.status))
                .map((o) => ({ value: o.id, label: o.order_number || `#${o.id}`, sublabel: t(`orders.status.${o.status}`) }))}
              onChange={(v) => setTransfer({ ...transfer, target: v })}
              placeholder={t('orders.selectOrderOption')}
            />
          </>
        ) : null}
      </Sheet>
    </>
  );
}
