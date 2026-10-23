import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { partsAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { includesQuery, formatMoney } from '../../utils/format';
import { Badge, Button, Card, Empty, ErrorBox, Fab, Loading, Row, Select, confirm, Sheet, StatTile, styles } from '../../components/ui';
import PartForm from '../../components/PartForm';
import ScanSearchBar from '../../components/ScanSearchBar';
import { findPartByCode } from '../../utils/codes';
import { colors } from '../../theme';
import { partStatus } from '../../utils/status';

const uniq = (list, key) => [...new Set(list.map((p) => p[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export default function Parts() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => partsAPI.getAll());
  const parts = data || [];
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ category: null, color: null, supplier: null, availability: null });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createInitial, setCreateInitial] = useState(null);

  const filtered = useMemo(
    () =>
      parts.filter(
        (p) =>
          includesQuery(q, p.name, p.description, p.sku, p.color, p.category, p.supplier, p.article_id) &&
          (!filters.category || p.category === filters.category) &&
          (!filters.color || p.color === filters.color) &&
          (!filters.supplier || p.supplier === filters.supplier) &&
          (!filters.availability || (filters.availability === 'nla' ? !!p.is_nla : !p.is_nla)),
      ),
    [parts, q, filters],
  );

  const lowStock = parts.filter((p) => !p.is_nla && Number(p.quantity) <= Number(p.min_stock_level)).length;
  const totalValue = parts.reduce((s, p) => s + Number(p.quantity || 0) * Number(p.purchase_price || 0), 0);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  // Scanned code: open the part, or offer to create one with that number.
  const onScanned = async (code) => {
    const part = findPartByCode(parts, code);
    if (part) {
      router.push(`/parts/${part.id}`);
      return;
    }
    setQ(code);
    if (await confirm(t('mobile.scanPartNotFound', { code }), t('mobile.scanCreatePartQuestion'), { confirmText: t('mobile.scanCreatePart'), cancelText: t('common.cancel'), destructive: false })) {
      setCreateInitial({ sku: code });
      setShowCreate(true);
    }
  };

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('parts.errorLoading', { error })} onRetry={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <ScanSearchBar
        value={q}
        onChangeText={setQ}
        onScanned={onScanned}
        placeholder={t('nav.searchParts')}
        right={
          <Button
            title={activeFilters ? `⚲ ${activeFilters}` : '⚲'}
            variant={activeFilters ? 'primary' : 'secondary'}
            small
            onPress={() => setShowFilters(true)}
            style={{ height: 42 }}
          />
        }
      />
      <FlatList
        data={filtered}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        initialNumToRender={20}
        ListHeaderComponent={
          <Row style={{ marginBottom: 10 }}>
            <StatTile label={t('parts.totalParts')} value={parts.length} />
            <StatTile label={t('parts.lowStock')} value={lowStock} color={colors.red} />
            <StatTile label={t('parts.totalValue')} value={`${Math.round(totalValue).toLocaleString('de-CH')}`} color={colors.green} />
          </Row>
        }
        ListEmptyComponent={
          <Empty
            icon='🔩'
            title={parts.length === 0 ? t('parts.noPartsYet') : t('parts.noResultsFound')}
            subtitle={parts.length === 0 ? t('parts.createFirstPart') : t('parts.tryAdjusting')}
          />
        }
        renderItem={({ item }) => {
          const st = partStatus(item, t);
          return (
            <Card onPress={() => router.push(`/parts/${item.id}`)} style={item.is_nla ? { opacity: 0.6 } : null}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {[item.color, item.category, item.supplier].filter(Boolean).join(' · ') || '-'}
                  </Text>
                  {item.sku ? <Text style={styles.small}># {item.sku}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{item.quantity ?? 0}</Text>
                  <Badge label={st.label} color={st.color} />
                </View>
              </Row>
              <Row style={{ marginTop: 6 }}>
                <Text style={styles.small}>
                  {t('partsTable.colPurchase')}: {formatMoney(item.purchase_price)}
                </Text>
                <Text style={styles.small}>
                  {t('partsTable.colSelling')}: {formatMoney(item.selling_price)}
                </Text>
              </Row>
            </Card>
          );
        }}
      />
      <Fab
        onPress={() => {
          setCreateInitial(null);
          setShowCreate(true);
        }}
      />

      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title={t('mobile.filters')}>
        <Select
          label={t('parts.category')}
          value={filters.category}
          placeholder={t('parts.allCategories')}
          allowClear
          options={uniq(parts, 'category').map((v) => ({ value: v, label: v }))}
          onChange={(v) => setFilters({ ...filters, category: v })}
        />
        <Select
          label={t('parts.color')}
          value={filters.color}
          placeholder={t('parts.allColors')}
          allowClear
          options={uniq(parts, 'color').map((v) => ({ value: v, label: v }))}
          onChange={(v) => setFilters({ ...filters, color: v })}
        />
        <Select
          label={t('parts.supplier')}
          value={filters.supplier}
          placeholder={t('parts.allSuppliers')}
          allowClear
          options={uniq(parts, 'supplier').map((v) => ({ value: v, label: v }))}
          onChange={(v) => setFilters({ ...filters, supplier: v })}
        />
        <Select
          label={t('partsTable.partStatus')}
          value={filters.availability}
          placeholder={t('parts.allAvailability')}
          allowClear
          options={[
            { value: 'available', label: t('parts.onlyAvailable') },
            { value: 'nla', label: t('parts.onlyNla') },
          ]}
          onChange={(v) => setFilters({ ...filters, availability: v })}
        />
        <Text style={[styles.small, { marginBottom: 12 }]}>{t('mobile.results', { count: filtered.length })}</Text>
        <Row>
          <Button
            title={t('mobile.reset')}
            variant='secondary'
            style={{ flex: 1 }}
            onPress={() => setFilters({ category: null, color: null, supplier: null, availability: null })}
          />
          <Button title={t('mobile.apply')} style={{ flex: 1 }} onPress={() => setShowFilters(false)} />
        </Row>
      </Sheet>

      <PartForm
        visible={showCreate}
        parts={parts}
        initial={createInitial}
        onClose={() => setShowCreate(false)}
        onSaved={(id) => {
          setShowCreate(false);
          reload();
          if (id) router.push(`/parts/${id}`);
        }}
      />
    </View>
  );
}
