import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { equipmentAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate, includesQuery } from '../../utils/format';
import { Badge, Button, Card, Empty, ErrorBox, Fab, Loading, Row, SearchBar, StatTile, styles } from '../../components/ui';
import ProduceSheet from '../../components/ProduceSheet';
import { colors } from '../../theme';

// Monday 00:00 of the week containing d.
const weekStart = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export default function Equipment() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => equipmentAPI.getAll());
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const items = data || [];

  const now = new Date();
  const ranges = {
    week: weekStart(now),
    lastWeek: new Date(weekStart(now).getTime() - 7 * 86400000),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    year: new Date(now.getFullYear(), 0, 1),
  };
  const inPeriod = (e, p) => {
    if (p === 'all') return true;
    const d = new Date(e.created_at);
    if (p === 'lastWeek') return d >= ranges.lastWeek && d < ranges.week;
    return d >= ranges[p];
  };

  const filtered = useMemo(
    () =>
      items.filter(
        (e) => inPeriod(e, period) && includesQuery(q, e.model, e.serial_number, e.brand, e.category, e.article_id, e.created_by_name),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, q, period],
  );

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;

  const periods = [
    { value: 'all', label: t('common.all') },
    { value: 'week', label: t('equipment.thisWeek') },
    { value: 'lastWeek', label: t('equipment.lastWeek') },
    { value: 'month', label: t('equipment.createdThisMonth') },
    { value: 'year', label: t('equipment.createdThisYear') },
  ];

  return (
    <View style={{ flex: 1 }}>
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder={t('nav.searchEquipment')}
        right={<Button title='📊' small variant='secondary' style={{ height: 42 }} onPress={() => router.push('/equipment/report')} />}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 6 }}>
          {periods.map((p) => (
            <Button key={p.value} title={p.label} small variant={period === p.value ? 'primary' : 'secondary'} onPress={() => setPeriod(p.value)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        initialNumToRender={20}
        ListHeaderComponent={
          <Row style={{ marginBottom: 10 }}>
            <StatTile label={t('equipment.totalEquipment')} value={items.length} />
            <StatTile label={t('equipment.createdThisWeek')} value={items.filter((e) => inPeriod(e, 'week')).length} color={colors.blue} />
            <StatTile label={t('equipment.createdThisMonth')} value={items.filter((e) => inPeriod(e, 'month')).length} color={colors.green} />
          </Row>
        }
        ListEmptyComponent={<Empty icon='🔧' title={t('equipment.noEquipmentYet')} subtitle={t('equipment.createFirstEquipment')} />}
        renderItem={({ item: e }) => (
          <Card onPress={() => router.push(`/equipment/${e.id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{e.model}</Text>
                <Text style={styles.subtitle}>
                  {e.serial_number ? `SN: ${e.serial_number}` : t('equipmentTable.unknown')}
                  {e.brand ? ` · ${e.brand}` : ''}
                </Text>
                <Text style={styles.small}>
                  {formatDate(e.created_at)}
                  {e.created_by_name ? ` · ${e.created_by_name}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {e.category ? <Badge label={e.category} color='purple' /> : null}
                {e.consumed_by_equipment_id ? <Badge label='🧩 ↪' color='gray' /> : null}
              </View>
            </Row>
          </Card>
        )}
      />
      <Fab onPress={() => setShowCreate(true)} />
      <ProduceSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onDone={() => {
          setShowCreate(false);
          reload();
        }}
      />
    </View>
  );
}
