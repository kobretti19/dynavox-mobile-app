import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { ordersAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate, includesQuery } from '../../utils/format';
import { orderStatusColor } from '../../utils/status';
import { Badge, Card, Empty, Loading, MultiSelect, Row, SearchBar, Segmented, StatTile, styles } from '../../components/ui';
import { colors } from '../../theme';

const ITEM_STATUSES = ['pending', 'partial', 'delivered', 'cancelled', 'nla', 'closed'];

// Mobile version of the web "Order Parts Report": every order line, a
// per-part summary and what is still on backorder.
export default function OrderPartsReport() {
  const { t } = useLanguage();
  const { data, loading, refreshing, refresh } = useApi(
    async () => {
      const [summary, backorder] = await Promise.all([ordersAPI.getPartsSummary(), ordersAPI.getBackorderParts()]);
      return {
        items: summary.data.data?.items || [],
        parts: summary.data.data?.parts || [],
        totals: summary.data.data?.totals || {},
        backorder: backorder.data.data || [],
        suppliers: [...new Set([...(summary.data.data?.suppliers || []), ...(backorder.data.suppliers || [])])].filter(Boolean).sort(),
      };
    },
    [],
    { select: (r) => r },
  );
  const [tab, setTab] = useState('backorder');
  const [q, setQ] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const d = data || { items: [], parts: [], totals: {}, backorder: [], suppliers: [] };
  const supplierOk = (s) => suppliers.length === 0 || suppliers.includes(s);

  const rows = useMemo(() => {
    if (tab === 'items')
      return d.items.filter(
        (i) => supplierOk(i.supplier) && (statuses.length === 0 || statuses.includes(i.item_status)) && includesQuery(q, i.part_name, i.part_color, i.sku, i.order_number, i.supplier, i.item_notes),
      );
    if (tab === 'parts') return d.parts.filter((p) => supplierOk(p.supplier) && includesQuery(q, p.part_name, p.part_color, p.sku, p.supplier));
    return d.backorder.filter((b) => supplierOk(b.supplier) && includesQuery(q, b.part_name, b.part_color, b.sku, b.order_number, b.supplier));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, statuses, suppliers, data]);

  if (loading) return <Loading />;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t('orderPartsReport.title') }} />
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Segmented
          options={[
            { value: 'backorder', label: t('orderPartsReport.tabBackorder') },
            { value: 'parts', label: t('orderPartsReport.colPart') },
            { value: 'items', label: t('mobile.items') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('common.search')} />
      <FlatList
        data={rows}
        keyExtractor={(r, i) => String(r.order_item_id || r.part_id || r.id || i)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        initialNumToRender={20}
        ListHeaderComponent={
          <View>
            <Row style={{ marginBottom: 10 }}>
              <StatTile label={t('orderPartsReport.totalOrdered')} value={d.totals.total_ordered ?? '-'} />
              <StatTile label={t('orderPartsReport.delivered')} value={d.totals.total_delivered ?? '-'} color={colors.green} />
              <StatTile label={t('orderPartsReport.backorder')} value={d.totals.total_backorder ?? '-'} color={colors.orange} />
            </Row>
            <MultiSelect
              label={t('orderPartsReport.suppliers')}
              value={suppliers}
              options={d.suppliers.map((s) => ({ value: s, label: s }))}
              onChange={setSuppliers}
              placeholder={t('orders.allSuppliers')}
            />
            {tab === 'items' ? (
              <MultiSelect
                label={t('orderPartsReport.colItemStatus')}
                value={statuses}
                options={ITEM_STATUSES.map((s) => ({ value: s, label: t(`orders.status.${s}`) }))}
                onChange={setStatuses}
                placeholder={t('orders.allStatus')}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Empty
            icon={tab === 'backorder' ? '✅' : '📭'}
            title={tab === 'backorder' ? t('orderPartsReport.noBackorders') : tab === 'parts' ? t('orderPartsReport.noParts') : t('orderPartsReport.noItems')}
            subtitle={tab === 'backorder' ? t('orderPartsReport.allItemsDelivered') : undefined}
          />
        }
        renderItem={({ item: r }) => {
          if (tab === 'parts') {
            return (
              <Card onPress={r.part_id ? () => router.push(`/parts/${r.part_id}`) : undefined} style={{ paddingVertical: 10 }}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>
                      {r.part_name}
                      {r.part_color ? ` (${r.part_color})` : ''}
                    </Text>
                    <Text style={styles.small}>
                      {[r.sku, r.supplier].filter(Boolean).join(' · ')} · {t('orderPartsReport.colOrders')}: {r.order_count}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '800' }}>
                      {r.total_delivered}/{r.total_ordered}
                    </Text>
                    {Number(r.total_backorder) > 0 ? <Text style={{ fontSize: 12, color: colors.orange }}>⏳ {r.total_backorder}</Text> : null}
                    <Text style={styles.small}>
                      {t('orderPartsReport.colStock')}: {r.current_stock}
                    </Text>
                  </View>
                </Row>
              </Card>
            );
          }
          const status = r.item_status || r.status;
          return (
            <Card onPress={r.order_id ? () => router.push(`/orders/${r.order_id}`) : undefined} style={{ paddingVertical: 10 }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700' }}>
                    {r.part_name}
                    {r.part_color ? ` (${r.part_color})` : ''}
                  </Text>
                  <Text style={styles.small}>
                    🛒 {r.order_number}
                    {r.order_date ? ` · ${formatDate(r.order_date)}` : ''}
                    {r.supplier ? ` · ${r.supplier}` : ''}
                  </Text>
                  {r.item_notes || r.notes ? <Text style={styles.small}>📝 {r.item_notes || r.notes}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  {status ? <Badge label={t(`orders.status.${status}`)} color={orderStatusColor[status]} /> : null}
                  <Text style={{ fontWeight: '800' }}>
                    {r.quantity_delivered ?? 0}/{r.quantity_ordered}
                  </Text>
                  {Number(r.quantity_backorder) > 0 ? <Text style={{ fontSize: 12, color: colors.orange }}>⏳ {r.quantity_backorder}</Text> : null}
                </View>
              </Row>
            </Card>
          );
        }}
      />
    </View>
  );
}
