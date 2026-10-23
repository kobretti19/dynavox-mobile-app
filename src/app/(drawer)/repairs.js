import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { customersAPI, dealersAPI, devicesAPI, equipmentAPI, repairsAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate, formatMoney, includesQuery, toKey } from '../../utils/format';
import { REPAIR_STATUSES, REPAIR_TYPES, buildReportId, deviceLabel, repairStatusColor } from '../../utils/status';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Fab,
  Input,
  Loading,
  Row,
  Segmented,
  Select,
  Sheet,
  StatTile,
  showError,
  styles,
} from '../../components/ui';
import DateField from '../../components/DateField';
import ScanModal from '../../components/ScanModal';
import ScanSearchBar from '../../components/ScanSearchBar';
import LookupField from '../../components/LookupField';
import EntityForm from '../../components/EntityForm';
import OwnProductBadge, { ForeignNotice, ownTone } from '../../components/OwnProductBadge';
import { deviceFields } from '../../utils/entityFields';
import { codeMatches } from '../../utils/codes';
import { deviceFromOwnProduct, devicePrefill, findOwnProduct } from '../../utils/ownProducts';
import { colors, tone } from '../../theme';

const emptyFilters = { status: null, type: null, customer: null, dealer: null, device: null, from: null, to: null, min: '', max: '' };
const emptyForm = { type: 'Reparatur', customer_id: null, dealer_id: null, device_ids: [], accessories: '', problem_description: '' };

export default function Repairs() {
  const { t } = useLanguage();
  const repairs = useApi(() => repairsAPI.getAll());
  const stats = useApi(() => repairsAPI.getStats());
  const [lookups, setLookups] = useState({ customers: [], dealers: [], devices: [], equipment: [] });
  const [foreignDevice, setForeignDevice] = useState(null); // device form for a scanned serial that isn't ours
  const [q, setQ] = useState('');
  const [statusTab, setStatusTab] = useState('open');
  const [filters, setFilters] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const params = useLocalSearchParams();

  const loadLookups = async () => {
    try {
      const [c, d, dv, eq] = await Promise.all([
        customersAPI.getAll(),
        dealersAPI.getAll(),
        devicesAPI.getAll(),
        equipmentAPI.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setLookups({ customers: c.data.data || [], dealers: d.data.data || [], devices: dv.data.data || [], equipment: eq.data.data || [] });
    } catch {
      // the pickers just stay empty
    }
  };

  const list = repairs.data || [];
  const filtered = useMemo(
    () =>
      list.filter((r) => {
        const created = r.created_at ? toKey(new Date(r.created_at)) : null;
        const total = Number(r.total_cost) || 0;
        return (
          includesQuery(q, buildReportId(r.id, r.created_at), r.customer_name, r.dealer_name, r.device_summary, r.problem_description, r.type, r.assignee_names) &&
          (statusTab === 'all' || (statusTab === 'open' ? r.status !== 'abgeschlossen' : r.status === statusTab)) &&
          (!filters.status || r.status === filters.status) &&
          (!filters.type || r.type === filters.type) &&
          (!filters.customer || r.customer_id === filters.customer) &&
          (!filters.dealer || r.dealer_id === filters.dealer) &&
          (!filters.device || (r.device_ids || '').split(',').map(Number).includes(filters.device)) &&
          (!filters.from || (created && created >= filters.from)) &&
          (!filters.to || (created && created <= filters.to)) &&
          (!filters.min || total >= parseFloat(filters.min)) &&
          (!filters.max || total <= parseFloat(filters.max))
        );
      }),
    [list, q, statusTab, filters],
  );

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const counts = REPAIR_STATUSES.reduce((acc, s) => ({ ...acc, [s]: list.filter((r) => r.status === s).length }), {});

  const openFilters = () => {
    setShowFilters(true);
    if (!lookups.customers.length) loadLookups();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setShowCreate(true);
    loadLookups();
  };

  // ?new=1&device=5 (from a device page or the scanner) opens the form.
  useEffect(() => {
    if (!params.new) return;
    setForm({ ...emptyForm, device_ids: params.device ? [Number(params.device)] : [] });
    setShowCreate(true);
    loadLookups();
    router.setParams({ new: undefined, device: undefined });
  }, [params.new, params.device]);

  // A ticket can take several devices (customer brings in more than one).
  const addDeviceId = (deviceId) =>
    setForm((f) => (f.device_ids.includes(deviceId) ? f : { ...f, device_ids: [...f.device_ids, deviceId] }));
  const replaceDeviceId = (index, deviceId) =>
    setForm((f) => {
      const ids = [...f.device_ids];
      if (deviceId && !ids.includes(deviceId)) ids[index] = deviceId;
      else if (!deviceId) ids.splice(index, 1);
      return { ...f, device_ids: ids };
    });

  // Scanned serial -> pick the existing device, or create it.
  // Scanned serial: a known device is attached as is; one of our products
  // becomes a device with its brand / model; anything else opens the device
  // form with a red "not our device" notice.
  const useScannedSerial = async (serial) => {
    setScanOpen(false);
    const existing = lookups.devices.find((d) => codeMatches(serial, d.serial_number));
    if (existing) {
      addDeviceId(existing.id);
      return;
    }
    const own = findOwnProduct(lookups.equipment, serial);
    if (!own) {
      setTimeout(() => setForeignDevice({ serial_number: serial }), 350);
      return;
    }
    try {
      const res = await devicesAPI.create(deviceFromOwnProduct(own));
      await loadLookups();
      addDeviceId(res.data.data.id);
    } catch (err) {
      showError(t('common.error'), t('mobile.saveFailed', { error: errorMessage(err) }));
    }
  };

  const create = async () => {
    setSaving(true);
    try {
      const { device_ids, ...rest } = form;
      const res = await repairsAPI.create({ ...rest, customer_id: rest.customer_id || null, dealer_id: rest.dealer_id || null });
      const ticket = res.data.data;
      for (const device_id of device_ids) {
        await repairsAPI.addDevice(ticket.id, { device_id }).catch(() => {});
      }
      setShowCreate(false);
      repairs.reload();
      router.push(`/repairs/${ticket.id}`);
    } catch (err) {
      showError(t('common.error'), t('mobile.saveFailed', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };


  const customerOptions = lookups.customers.map((c) => ({ value: c.id, label: c.name, sublabel: [c.city, c.email].filter(Boolean).join(' · ') }));
  const dealerOptions = lookups.dealers.map((d) => ({ value: d.id, label: d.name, sublabel: d.city || undefined }));
  const deviceOptions = lookups.devices.map((d) => ({ value: d.id, label: deviceLabel(d) }));

  if (repairs.loading) return <Loading />;
  if (repairs.error && !repairs.data) return <ErrorBox message={t('repairs.errorLoading', { error: repairs.error })} onRetry={repairs.refresh} />;

  const s = stats.data || {};
  const statusTabs = [
    { value: 'open', label: `${t('mobile.open')} (${list.filter((r) => r.status !== 'abgeschlossen').length})` },
    ...REPAIR_STATUSES.map((st) => ({ value: st, label: `${st} (${counts[st] || 0})` })),
    { value: 'all', label: `${t('common.all')} (${list.length})` },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScanSearchBar
        value={q}
        onChangeText={setQ}
        scanMode='text'
        placeholder={t('nav.searchRepairs')}
        right={
          <Button
            title={activeFilters ? `⚲ ${activeFilters}` : '⚲'}
            variant={activeFilters ? 'primary' : 'secondary'}
            small
            onPress={openFilters}
            style={{ height: 42 }}
          />
        }
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 6 }}>
          {statusTabs.map((tab) => {
            const active = tab.value === statusTab;
            const c = tone[repairStatusColor[tab.value]] || tone.gray;
            return (
              <Button
                key={tab.value}
                title={tab.label}
                small
                variant={active ? 'primary' : 'secondary'}
                onPress={() => setStatusTab(tab.value)}
                style={active ? null : { backgroundColor: c.bg, borderColor: c.bg }}
              />
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={repairs.refreshing}
            onRefresh={() => {
              repairs.refresh();
              stats.reload();
            }}
          />
        }
        initialNumToRender={15}
        ListHeaderComponent={
          <Row style={{ marginBottom: 10 }}>
            <StatTile label={t('repairs.totalTickets')} value={s.total_tickets || 0} />
            <StatTile label='In Reparatur' value={s.in_reparatur || 0} color={colors.blue} />
            <StatTile label='Zu verrechnen' value={s.zu_verrechnen || 0} color={colors.orange} />
          </Row>
        }
        ListEmptyComponent={<Empty icon='🩹' title={t('repairs.emptyTitle')} subtitle={list.length ? t('parts.tryAdjusting') : t('repairs.emptyMessage')} />}
        renderItem={({ item: r }) => (
          <Card onPress={() => router.push(`/repairs/${r.id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <Text style={[styles.title, { fontSize: 17 }]}>{buildReportId(r.id, r.created_at)}</Text>
                  <Text style={styles.small}>{r.type}</Text>
                  {r.warranty ? <Text style={styles.small}>🛡️</Text> : null}
                </Row>
                <Text style={[styles.subtitle, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                  {r.customer_name || r.dealer_name || '-'}
                  {r.customer_name && r.dealer_name ? <Text style={{ fontWeight: '400', color: colors.textMuted }}>{`  · ${r.dealer_name}`}</Text> : null}
                </Text>
                {r.device_summary ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {r.device_summary}
                  </Text>
                ) : null}
                {r.problem_description ? (
                  <Text style={[styles.small, { marginTop: 2 }]} numberOfLines={2}>
                    {r.problem_description}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6, maxWidth: 140 }}>
                <Badge label={r.status} color={repairStatusColor[r.status]} />
                <Text style={{ fontWeight: '700', color: colors.text }}>{formatMoney(r.total_cost)}</Text>
              </View>
            </Row>
            <Text style={[styles.small, { marginTop: 6 }]}>
              {formatDate(r.created_at)}
              {r.assignee_names ? ` · 👤 ${r.assignee_names}` : ''}
            </Text>
          </Card>
        )}
      />
      <Fab onPress={openCreate} />

      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title={t('mobile.filters')}>
        <Select
          label={t('common.status')}
          value={filters.status}
          placeholder={t('repairs.allStatuses')}
          allowClear
          options={REPAIR_STATUSES.map((v) => ({ value: v, label: v }))}
          onChange={(v) => {
            setFilters({ ...filters, status: v });
            if (v) setStatusTab('all');
          }}
        />
        <Select
          label={t('repairs.fieldType')}
          value={filters.type}
          placeholder={t('repairs.allTypes')}
          allowClear
          options={REPAIR_TYPES.map((v) => ({ value: v, label: v }))}
          onChange={(v) => setFilters({ ...filters, type: v })}
        />
        <Select label={t('repairs.fieldCustomer')} value={filters.customer} placeholder={t('repairs.filterByCustomer')} allowClear options={customerOptions} onChange={(v) => setFilters({ ...filters, customer: v })} />
        <Select label={t('repairs.fieldDealer')} value={filters.dealer} placeholder={t('repairs.filterByDealer')} allowClear options={dealerOptions} onChange={(v) => setFilters({ ...filters, dealer: v })} />
        <Select label={t('repairs.fieldDevice')} value={filters.device} placeholder={t('repairs.filterByDevice')} allowClear options={deviceOptions} onChange={(v) => setFilters({ ...filters, device: v })} />
        <DateField label={t('repairs.createdFrom')} value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} allowClear />
        <DateField label={t('repairs.createdTo')} value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} allowClear />
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Input label={t('common.min')} value={filters.min} onChangeText={(v) => setFilters({ ...filters, min: v })} keyboardType='decimal-pad' placeholder={t('repairs.priceMinPlaceholder')} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('common.max')} value={filters.max} onChangeText={(v) => setFilters({ ...filters, max: v })} keyboardType='decimal-pad' placeholder={t('repairs.priceMaxPlaceholder')} />
          </View>
        </Row>
        <Text style={[styles.small, { marginBottom: 12 }]}>{t('mobile.results', { count: filtered.length })}</Text>
        <Row>
          <Button title={t('mobile.reset')} variant='secondary' style={{ flex: 1 }} onPress={() => setFilters(emptyFilters)} />
          <Button title={t('mobile.apply')} style={{ flex: 1 }} onPress={() => setShowFilters(false)} />
        </Row>
      </Sheet>

      <Sheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('repairs.modalTitle')}
        actionLabel={t('common.create')}
        onAction={create}
        actionLoading={saving}
      >
        <Segmented
          options={REPAIR_TYPES.map((v) => ({ value: v, label: v }))}
          value={form.type}
          onChange={(v) => setForm({ ...form, type: v })}
          style={{ marginBottom: 14 }}
        />
        <LookupField
          kind='customer'
          label={t('repairs.fieldCustomer')}
          value={form.customer_id}
          records={lookups.customers}
          placeholder={t('repairs.searchOrCreateCustomer')}
          onSaved={loadLookups}
          onChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}
        />
        <LookupField
          kind='dealer'
          label={t('repairs.fieldDealer')}
          value={form.dealer_id}
          records={lookups.dealers}
          placeholder={t('repairs.searchOrCreateDealer')}
          onSaved={loadLookups}
          onChange={(v) => setForm((f) => ({ ...f, dealer_id: v }))}
        />
        {form.device_ids.map((deviceId, i) => (
          <LookupField
            key={deviceId}
            kind='device'
            label={i === 0 ? t('repairs.fieldDevice') : undefined}
            value={deviceId}
            records={lookups.devices}
            exclude={new Set(form.device_ids)}
            placeholder={t('repairs.searchSerialOrCreateDevice')}
            onSaved={loadLookups}
            prefill={(text) => devicePrefill(lookups.equipment, text)}
            tone={ownTone(lookups.equipment, lookups.devices.find((d) => d.id === deviceId)?.serial_number)}
            onChange={(v) => replaceDeviceId(i, v)}
          >
            <OwnProductBadge equipment={lookups.equipment} serial={lookups.devices.find((d) => d.id === deviceId)?.serial_number} />
            <Button title='✕' small variant='dangerOutline' onPress={() => replaceDeviceId(i, null)} />
          </LookupField>
        ))}
        <LookupField
          key={`add-${form.device_ids.length}`}
          kind='device'
          label={form.device_ids.length === 0 ? t('repairs.fieldDevice') : undefined}
          value={null}
          records={lookups.devices}
          exclude={new Set(form.device_ids)}
          placeholder={form.device_ids.length ? `＋ ${t('repairs.searchSerialOrCreateDevice')}` : t('repairs.searchSerialOrCreateDevice')}
          hint={form.device_ids.length === 0 ? t('repairs.attachDeviceHint') : undefined}
          onSaved={loadLookups}
          prefill={(text) => devicePrefill(lookups.equipment, text)}
          onChange={(v) => v && addDeviceId(v)}
        >
          <Button title={t('mobile.scanSerial')} icon='📷' small variant='secondary' onPress={() => setScanOpen(true)} />
        </LookupField>
        <ScanModal visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={useScannedSerial} />
        <EntityForm
          visible={!!foreignDevice}
          title={t('devices.addDevice').replace(/^\+\s*/, '')}
          fields={deviceFields(t)}
          initial={foreignDevice}
          notice={<ForeignNotice />}
          onClose={() => setForeignDevice(null)}
          onSubmit={async (values) => {
            const res = await devicesAPI.create(values);
            await loadLookups();
            addDeviceId(res.data.data.id);
            setForeignDevice(null);
          }}
        />
        <Input
          label={t('repairs.fieldAccessories')}
          value={form.accessories}
          onChangeText={(v) => setForm({ ...form, accessories: v })}
          placeholder={t('repairs.accessoriesPlaceholder')}
        />
        <Input
          label={t('repairs.fieldProblemDescription')}
          value={form.problem_description}
          onChangeText={(v) => setForm({ ...form, problem_description: v })}
          multiline
        />
      </Sheet>
    </View>
  );
}
