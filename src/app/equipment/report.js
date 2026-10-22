import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { equipmentAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate } from '../../utils/format';
import { Card, Loading, Row, Segmented, Select, StatTile, styles } from '../../components/ui';
import { colors } from '../../theme';

// ISO week number + the Monday it starts on.
const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
};

// Production report: equipment created, grouped by week / month / year and
// then by model (same idea as the web Equipment Report).
export default function EquipmentReport() {
  const { t } = useLanguage();
  const { data, loading, refreshing, refresh } = useApi(() => equipmentAPI.getAll());
  const [groupBy, setGroupBy] = useState('month');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const items = data || [];
  const years = [...new Set(items.map((e) => new Date(e.created_at).getFullYear()))].sort((a, b) => b - a);

  const groups = useMemo(() => {
    const filtered = items.filter((e) => year === 'all' || new Date(e.created_at).getFullYear() === Number(year));
    const map = new Map();
    for (const e of filtered) {
      const d = new Date(e.created_at);
      let key;
      let label;
      if (groupBy === 'year') {
        key = String(d.getFullYear());
        label = key;
      } else if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = `${t(`equipment.months.${d.getMonth() + 1}`)} ${d.getFullYear()}`;
      } else {
        const w = isoWeek(d);
        key = `${w.year}-W${String(w.week).padStart(2, '0')}`;
        label = `${t('equipmentReport.week')} ${w.week}, ${w.year}`;
      }
      if (!map.has(key)) map.set(key, { key, label, models: new Map(), total: 0, parts: 0 });
      const g = map.get(key);
      g.total += 1;
      g.parts += Number(e.parts_count || 0);
      const mKey = `${e.model}|${e.brand || ''}`;
      if (!g.models.has(mKey)) g.models.set(mKey, { model: e.model, brand: e.brand, category: e.category, serials: [], count: 0 });
      const m = g.models.get(mKey);
      m.count += 1;
      if (e.serial_number) m.serials.push(e.serial_number);
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [items, groupBy, year, t]);

  if (loading) return <Loading />;

  const total = groups.reduce((s, g) => s + g.total, 0);
  const totalParts = groups.reduce((s, g) => s + g.parts, 0);
  const models = new Set(groups.flatMap((g) => [...g.models.keys()])).size;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Stack.Screen options={{ title: t('equipmentReport.title') }} />
      <Segmented
        options={[
          { value: 'week', label: t('equipmentReport.week') },
          { value: 'month', label: t('equipmentReport.month') },
          { value: 'year', label: t('equipmentReport.year') },
        ]}
        value={groupBy}
        onChange={setGroupBy}
        style={{ marginBottom: 10 }}
      />
      <Select
        label={t('equipmentReport.year')}
        value={year}
        options={[{ value: 'all', label: t('equipmentReport.allYears') }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
        onChange={(v) => setYear(v || 'all')}
      />
      <Row style={{ marginBottom: 12 }}>
        <StatTile label={t('equipmentReport.totalEquipment')} value={total} />
        <StatTile label={t('equipmentReport.totalPartsUsed')} value={totalParts} color={colors.blue} />
        <StatTile label={t('equipmentReport.uniqueModels')} value={models} color={colors.purple} />
      </Row>
      {groups.length === 0 ? <Text style={styles.small}>{t('equipmentReport.noEquipmentFound')}</Text> : null}
      {groups.map((g) => (
        <Card key={g.key}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.title, { textTransform: 'capitalize' }]}>{g.label}</Text>
            <Text style={{ fontWeight: '800', color: colors.brand }}>{t('equipmentReport.units', { count: g.total })}</Text>
          </Row>
          {[...g.models.values()]
            .sort((a, b) => b.count - a.count)
            .map((m) => (
              <View key={`${m.model}|${m.brand}`} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Row>
                  <Text style={{ flex: 1, fontWeight: '600' }}>
                    {m.model}
                    {m.brand ? <Text style={styles.small}>{`  ${m.brand}`}</Text> : null}
                  </Text>
                  <Text style={{ fontWeight: '800' }}>× {m.count}</Text>
                </Row>
                {m.serials.length ? (
                  <Text style={styles.small} numberOfLines={3}>
                    {m.serials.join(', ')}
                  </Text>
                ) : null}
              </View>
            ))}
        </Card>
      ))}
      <Text style={[styles.small, { textAlign: 'center' }]}>{t('equipmentReport.generated', { date: formatDate(new Date()) })}</Text>
    </ScrollView>
  );
}
