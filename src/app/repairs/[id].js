import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { customersAPI, dealersAPI, devicesAPI, equipmentAPI, partsAPI, repairsAPI, usersAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime, formatMoney } from '../../utils/format';
import { REPAIR_STATUSES, REPAIR_TYPES, buildReportId, deviceLabel, repairStatusColor } from '../../utils/status';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  InfoRow,
  Input,
  Loading,
  NumberInput,
  Row,
  SectionTitle,
  Segmented,
  Select,
  SwitchRow,
  confirm,
  showError,
  styles,
} from '../../components/ui';
import { colors, tone } from '../../theme';
import ScanModal from '../../components/ScanModal';
import LookupField from '../../components/LookupField';
import { deviceFields } from '../../utils/entityFields';
import EntityForm from '../../components/EntityForm';
import OwnProductBadge, { ForeignNotice } from '../../components/OwnProductBadge';
import { codeMatches } from '../../utils/codes';
import { deviceFromOwnProduct, devicePrefill, findOwnProduct } from '../../utils/ownProducts';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const detailsFromTicket = (ticket) => ({
  type: ticket.type,
  dealer_id: ticket.dealer_id || null,
  customer_id: ticket.customer_id || null,
  accessories: ticket.accessories || '',
  problem_description: ticket.problem_description || '',
  internal_notes: ticket.internal_notes || '',
  external_reference: ticket.external_reference || '',
  dealer_reference: ticket.dealer_reference || '',
  warranty: !!ticket.warranty,
  cost_estimate_requested: !!ticket.cost_estimate_requested,
  hide_price_for_customer: !!ticket.hide_price_for_customer,
  shipping: ticket.shipping,
  invoicing: ticket.invoicing,
  carrier: ticket.carrier || '',
  labor_cost: ticket.labor_cost ?? 0,
  small_material_cost: ticket.small_material_cost ?? 0,
  shipping_cost: ticket.shipping_cost ?? 0,
  discount_percent: ticket.discount_percent ?? 0,
});

export default function RepairDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [details, setDetails] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [deviceForm, setDeviceForm] = useState(null); // { mode: 'new' | 'edit', initial }
  const [lookups, setLookups] = useState({ customers: [], dealers: [], devices: [], parts: [], users: [], equipment: [] });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [partForm, setPartForm] = useState({ part_id: null, quantity: '1' });
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const skipAutosave = useRef(true);
  const saveTimer = useRef(null);

  const loadTicket = useCallback(async () => {
    try {
      const res = await repairsAPI.getById(id);
      const data = res.data.data;
      skipAutosave.current = true;
      setTicket(data);
      setDetails(detailsFromTicket(data));
      setNewStatus(data.status);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  const loadAttachments = useCallback(() => {
    repairsAPI
      .getAttachments(id)
      .then((res) => setAttachments(res.data.data || []))
      .catch(() => {});
  }, [id]);

  const loadLookups = useCallback(async () => {
    try {
      const [c, d, dv, p, u, eq] = await Promise.all([
        customersAPI.getAll(),
        dealersAPI.getAll(),
        devicesAPI.getAll(),
        partsAPI.getAll(),
        usersAPI.getAll(),
        equipmentAPI.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setLookups({
        customers: c.data.data || [],
        dealers: d.data.data || [],
        devices: dv.data.data || [],
        parts: p.data.data || [],
        users: u.data.data || [],
        equipment: eq.data.data || [],
      });
    } catch {
      // pickers stay empty
    }
  }, []);

  useEffect(() => {
    loadTicket();
    loadAttachments();
    loadLookups();
    return () => clearTimeout(saveTimer.current);
  }, [loadTicket, loadAttachments, loadLookups]);

  const saveDetails = useCallback(
    async (toSave) => {
      setSaveStatus('saving');
      try {
        const res = await repairsAPI.update(id, {
          ...toSave,
          dealer_id: toSave.dealer_id || null,
          customer_id: toSave.customer_id || null,
          carrier: toSave.carrier || null,
          labor_cost: Number(toSave.labor_cost) || 0,
          small_material_cost: Number(toSave.small_material_cost) || 0,
          shipping_cost: Number(toSave.shipping_cost) || 0,
          discount_percent: Number(toSave.discount_percent) || 0,
        });
        if (res.data?.data) setTicket((prev) => ({ ...prev, ...res.data.data }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? '' : s)), 2000);
      } catch (err) {
        setSaveStatus('error');
        showError(t('common.error'), t('repairReport.failedToSave', { error: errorMessage(err) }));
      }
    },
    [id, t],
  );

  // Auto-save ~1s after the last change, like the web page.
  useEffect(() => {
    if (!details) return undefined;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return undefined;
    }
    setSaveStatus('pending');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDetails(details), 1000);
    return () => clearTimeout(saveTimer.current);
  }, [details, saveDetails]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
    loadAttachments();
    setRefreshing(false);
  };

  const run = async (fn, failKey = 'mobile.saveFailed') => {
    setBusy(true);
    try {
      await fn();
      await loadTicket();
    } catch (err) {
      showError(t('common.error'), t(failKey, { error: errorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  if (!ticket && error) return <ErrorBox message={t('repairReport.errorLoadingTicket', { error })} onRetry={loadTicket} />;
  if (!ticket || !details) return <Loading />;

  const set = (key) => (value) => setDetails((d) => ({ ...d, [key]: value }));
  const reportId = buildReportId(ticket.id, ticket.created_at);

  const partsTotal = (ticket.parts_used || []).reduce((sum, p) => sum + p.quantity * Number(p.unit_price), 0);
  const subtotal = partsTotal + Number(ticket.labor_cost) + Number(ticket.small_material_cost) + Number(ticket.shipping_cost);
  const discountPercent = Number(ticket.discount_percent) || 0;
  const discountAmount = Math.round(subtotal * discountPercent) / 100;
  const grandTotal = subtotal - discountAmount;

  const attachedDeviceIds = new Set((ticket.devices || []).map((d) => d.id));
  const assignedIds = new Set((ticket.assignees || []).map((a) => a.id));

  const updateStatus = () =>
    run(async () => {
      const res = await repairsAPI.updateStatus(id, { status: newStatus, notes: statusNotes || null });
      setStatusNotes('');
      if (res.data?.needsManualCompletion) showError(t('common.warning'), t('repairs.invoiceDraftedAlert'));
    }, 'mobile.saveFailed');

  const addPart = () => {
    if (!partForm.part_id) return;
    run(async () => {
      await repairsAPI.addPart(id, { part_id: partForm.part_id, quantity: parseInt(partForm.quantity, 10) || 1 });
      setPartForm({ part_id: null, quantity: '1' });
      loadLookups();
    });
  };

  const pickAndUpload = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 10 });
      }
      if (result.canceled || !result.assets?.length) return;
      setUploading(true);
      const formData = new FormData();
      for (const [i, asset] of result.assets.entries()) {
        const name = asset.fileName || `photo-${Date.now()}-${i}.jpg`;
        const type = asset.mimeType || 'image/jpeg';
        if (asset.file) formData.append('files', asset.file, name);
        else formData.append('files', { uri: asset.uri, name, type });
      }
      await repairsAPI.uploadAttachments(id, formData);
      loadAttachments();
    } catch (err) {
      showError(t('common.error'), `${t('repairReport.uploadFailed')}: ${errorMessage(err)}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (a) => {
    if (!(await confirm(t('mobile.confirmDeleteTitle'), `${t('mobile.deleteAttachment')}\n${a.original_name}`, { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    repairsAPI
      .deleteAttachment(id, a.id)
      .then(loadAttachments)
      .catch((err) => showError(t('common.error'), errorMessage(err)));
  };

  const deleteTicket = async () => {
    if (!(await confirm(t('repairReport.deleteTicketTitle'), t('repairReport.deleteTicketMessage', { ticketId: reportId }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await repairsAPI.delete(id);
      router.back();
    } catch (err) {
      showError(t('common.error'), errorMessage(err) || t('repairReport.failedToDeleteTicket'));
    }
  };

  const shiplabel = async () => {
    try {
      const res = await repairsAPI.getShiplabel(id);
      await WebBrowser.openBrowserAsync(res.data.data.url);
    } catch (err) {
      showError(t('common.error'), errorMessage(err) || t('repairReport.failedToGenerateShiplabel'));
    }
  };

  const deviceOptions = lookups.devices.filter((d) => !attachedDeviceIds.has(d.id)).map((d) => ({ value: d.id, label: deviceLabel(d) }));
  const partOptions = lookups.parts.map((p) => ({
    value: p.id,
    label: `${p.name}${p.color ? ` (${p.color})` : ''}`,
    sublabel: [`Stock: ${p.quantity}`, p.supplier, p.sku].filter(Boolean).join(' · '),
  }));
  const userOptions = lookups.users.filter((u) => !assignedIds.has(u.id)).map((u) => ({ value: u.id, label: u.full_name || u.loginName }));

  const saveLabel =
    saveStatus === 'pending'
      ? t('repairReport.unsavedChanges')
      : saveStatus === 'saving'
        ? t('common.saving')
        : saveStatus === 'saved'
          ? t('repairReport.savedCheck')
          : saveStatus === 'error'
            ? '⚠️'
            : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: reportId,
          headerRight: () => (saveLabel ? <Text style={{ fontSize: 12, color: saveStatus === 'error' ? colors.red : colors.textMuted, marginRight: 12 }}>{saveLabel}</Text> : null),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
        keyboardShouldPersistTaps='handled'
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { fontSize: 22 }]}>{reportId}</Text>
              <Text style={styles.small}>
                {ticket.type} · {formatDateTime(ticket.created_at)}
                {ticket.created_by_name ? ` · ${ticket.created_by_name}` : ''}
              </Text>
              {ticket.invoice_doc_id ? (
                <Text style={styles.small}>
                  {t('repairReport.erpDocIdLabel')}: {ticket.invoice_doc_id}
                </Text>
              ) : null}
            </View>
            <Badge label={ticket.status} color={repairStatusColor[ticket.status]} />
          </Row>
          <Row style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <Button title={t('repairReport.printCustomer')} small variant='secondary' onPress={() => WebBrowser.openBrowserAsync(repairsAPI.getDocumentUrl(id, 'customer'))} />
            <Button title={t('repairReport.printDealer')} small variant='secondary' onPress={() => WebBrowser.openBrowserAsync(repairsAPI.getDocumentUrl(id, 'dealer'))} />
            <Button title={t('repairReport.shiplabel')} small variant='secondary' onPress={shiplabel} />
          </Row>
        </Card>

        {/* Status */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }}>{t('repairReport.newStatusLabel')}</SectionTitle>
          <Select label='' value={newStatus} options={REPAIR_STATUSES.map((s) => ({ value: s, label: s }))} onChange={setNewStatus} />
          <Input label={t('repairReport.notesOptional')} value={statusNotes} onChangeText={setStatusNotes} />
          <Button title={t('repairReport.updateStatus')} onPress={updateStatus} disabled={busy || (newStatus === ticket.status && !statusNotes)} loading={busy} />
        </Card>

        {/* Devices */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }}>{t('repairReport.devicesHeading')}</SectionTitle>
          {(ticket.devices || []).length === 0 ? <Text style={[styles.small, { marginBottom: 8 }]}>{t('repairReport.noDevicesAttached')}</Text> : null}
          {(ticket.devices || []).map((d) => {
            const tint = tone[findOwnProduct(lookups.equipment, d.serial_number) ? 'green' : 'red'];
            return (
              <Row key={d.id} style={{ padding: 8, marginBottom: 6, borderRadius: 10, borderWidth: 1, borderColor: tint.color, backgroundColor: tint.bg }}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push(`/devices/${d.id}`)}>
                  <Text style={{ color: colors.blue, fontWeight: '600' }}>
                    {[d.brand, d.model].filter(Boolean).join(' ') || '-'}
                  </Text>
                  <Text style={styles.small}>SN: {d.serial_number}</Text>
                  <OwnProductBadge equipment={lookups.equipment} serial={d.serial_number} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                </Pressable>
                <Button title='✏️' small variant='secondary' onPress={() => setDeviceForm({ mode: 'edit', initial: d })} />
                <Button title='✕' small variant='dangerOutline' onPress={() => run(() => repairsAPI.removeDevice(id, d.id))} />
              </Row>
            );
          })}
          <View style={{ marginTop: 10 }}>
            <Select
              label=''
              value={null}
              options={deviceOptions}
              placeholder={t('repairReport.searchSerialOrCreate')}
              createLabel={t('common.create')}
              onCreate={(serial) => {
                // Open the full device form so brand / model can be filled in right away.
                setTimeout(() => setDeviceForm({ mode: 'new', initial: devicePrefill(lookups.equipment, serial), foreign: !findOwnProduct(lookups.equipment, serial) }), 350);
                return null;
              }}
              onChange={(deviceId) =>
                deviceId &&
                run(async () => {
                  await repairsAPI.addDevice(id, { device_id: deviceId });
                  loadLookups();
                })
              }
            />
            <Button title={t('mobile.scanSerial')} icon='📷' small variant='secondary' style={{ alignSelf: 'flex-start', marginTop: -6 }} onPress={() => setScanOpen(true)} />
          </View>
        </Card>

        <EntityForm
          visible={!!deviceForm}
          title={deviceForm?.mode === 'edit' ? t('devices.editDevice') : t('devices.addDevice').replace(/^\+\s*/, '')}
          fields={deviceFields(t)}
          initial={deviceForm?.initial}
          notice={deviceForm?.foreign ? <ForeignNotice /> : null}
          onClose={() => setDeviceForm(null)}
          onSubmit={async (values) => {
            if (deviceForm.mode === 'edit') {
              await devicesAPI.update(deviceForm.initial.id, values);
            } else {
              const res = await devicesAPI.create(values);
              await repairsAPI.addDevice(id, { device_id: res.data.data.id });
            }
            setDeviceForm(null);
            await loadTicket();
            loadLookups();
          }}
        />

        <ScanModal
          visible={scanOpen}
          onClose={() => setScanOpen(false)}
          onScanned={(serial) => {
            // Known device -> attach; our product -> new device with its brand /
            // model; anything else -> device form with a red "not ours" notice.
            setScanOpen(false);
            const existing = lookups.devices.find((d) => codeMatches(serial, d.serial_number));
            const own = existing ? null : findOwnProduct(lookups.equipment, serial);
            if (!existing && !own) {
              setTimeout(() => setDeviceForm({ mode: 'new', initial: { serial_number: serial }, foreign: true }), 350);
              return;
            }
            run(async () => {
              const deviceId = existing ? existing.id : (await devicesAPI.create(deviceFromOwnProduct(own))).data.data.id;
              await repairsAPI.addDevice(id, { device_id: deviceId });
              loadLookups();
            });
          }}
        />

        {/* Photos & files */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }} right={uploading ? <ActivityIndicator color={colors.brand} /> : null}>
            {t('mobile.photos')}
          </SectionTitle>
          <Row style={{ marginBottom: 10 }}>
            <Button title={t('mobile.takePhoto')} icon='📷' small style={{ flex: 1 }} onPress={() => pickAndUpload('camera')} disabled={uploading} />
            <Button title={t('mobile.choosePhoto')} icon='🖼️' small variant='secondary' style={{ flex: 1 }} onPress={() => pickAndUpload('library')} disabled={uploading} />
          </Row>
          {attachments.length === 0 ? <Text style={styles.small}>{t('mobile.noAttachments')}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {attachments.map((a) => {
              const url = repairsAPI.getAttachmentUrl(id, a.id);
              const isImage = (a.mime_type || '').startsWith('image/');
              return (
                <Pressable
                  key={a.id}
                  onPress={() => WebBrowser.openBrowserAsync(url)}
                  onLongPress={() => deleteAttachment(a)}
                  style={{ width: '31.5%', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.grayBg }}
                >
                  {isImage ? (
                    <Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 1 }} resizeMode='cover' />
                  ) : (
                    <View style={{ width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 30 }}>📄</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 10, padding: 4, color: colors.gray }} numberOfLines={1}>
                    {a.original_name} · {formatFileSize(a.size_bytes)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {attachments.length ? <Text style={[styles.small, { marginTop: 6 }]}>{t('repairReport.imagesCompressedHint')} ⌫ = long press</Text> : null}
        </Card>

        {/* Ticket details (auto-saved) */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }}>{t('repairReport.ticketDetails')}</SectionTitle>
          <Segmented options={REPAIR_TYPES.map((v) => ({ value: v, label: v }))} value={details.type} onChange={set('type')} style={{ marginBottom: 14 }} />
          <LookupField
            kind='customer'
            label={t('repairs.fieldCustomer')}
            value={details.customer_id}
            records={lookups.customers}
            placeholder={t('repairs.searchOrCreateCustomer')}
            onSaved={loadLookups}
            onChange={set('customer_id')}
          >
            {details.customer_id ? <Button title='↗' small variant='secondary' onPress={() => router.push(`/customers/${details.customer_id}`)} /> : null}
          </LookupField>
          <LookupField
            kind='dealer'
            label={t('repairs.fieldDealer')}
            value={details.dealer_id}
            records={lookups.dealers}
            placeholder={t('repairs.searchOrCreateDealer')}
            onSaved={loadLookups}
            onChange={set('dealer_id')}
          >
            {details.dealer_id ? <Button title='↗' small variant='secondary' onPress={() => router.push(`/dealers/${details.dealer_id}`)} /> : null}
          </LookupField>

          <Text style={styles.label}>{t('repairReport.shippingLabel')}</Text>
          <Segmented
            options={['Abholung', 'Kunde', 'Händler'].map((v) => ({ value: v, label: v }))}
            value={details.shipping}
            onChange={(shipping) => {
              // Same rules as the web: pick-up has no carrier/shipping cost,
              // dealer/customer get a default carrier that can be changed.
              if (shipping === 'Abholung') setDetails({ ...details, shipping, carrier: '', shipping_cost: 0 });
              else setDetails({ ...details, shipping, carrier: shipping === 'Händler' ? 'DHL' : 'POST' });
            }}
            style={{ marginBottom: 14 }}
          />
          <Text style={styles.label}>{t('repairReport.invoicingLabel')}</Text>
          <Segmented options={['Kunde', 'Händler'].map((v) => ({ value: v, label: v }))} value={details.invoicing} onChange={set('invoicing')} style={{ marginBottom: 14 }} />
          {details.shipping !== 'Abholung' ? (
            <>
              <Text style={styles.label}>{t('repairReport.carrierLabel')}</Text>
              <Segmented
                options={[
                  { value: '', label: '-' },
                  { value: 'POST', label: 'POST' },
                  { value: 'DHL', label: 'DHL' },
                ]}
                value={details.carrier}
                onChange={set('carrier')}
                style={{ marginBottom: 14 }}
              />
            </>
          ) : null}
          <SwitchRow label={t('repairReport.warranty')} value={details.warranty} onValueChange={set('warranty')} />
          <SwitchRow label={t('repairReport.costEstimateRequested')} value={details.cost_estimate_requested} onValueChange={set('cost_estimate_requested')} />
          <SwitchRow label={t('repairReport.hidePriceForCustomer')} value={details.hide_price_for_customer} onValueChange={set('hide_price_for_customer')} />
          <Input label={t('repairs.fieldAccessories')} value={details.accessories} onChangeText={set('accessories')} placeholder={t('repairs.accessoriesPlaceholder')} />
          <Input label={t('repairs.fieldProblemDescription')} value={details.problem_description} onChangeText={set('problem_description')} multiline />
          <Input label={t('common.notes')} value={details.internal_notes} onChangeText={set('internal_notes')} multiline />
          <Input label={t('repairReport.externalReference')} value={details.external_reference} onChangeText={set('external_reference')} />
          <Input label={t('repairReport.dealerReference')} value={details.dealer_reference} onChangeText={set('dealer_reference')} hint={t('repairReport.dealerReferenceHint')} />
          <NumberInput label={t('repairReport.laborCost')} value={details.labor_cost} onChange={set('labor_cost')} />
          <NumberInput label={t('repairReport.smallMaterialCost')} value={details.small_material_cost} onChange={set('small_material_cost')} />
          {details.shipping !== 'Abholung' ? <NumberInput label={t('repairReport.shippingCost')} value={details.shipping_cost} onChange={set('shipping_cost')} /> : null}
          <NumberInput label={t('repairReport.discountPercent')} value={details.discount_percent} onChange={set('discount_percent')} />
          {saveStatus === 'pending' ? (
            <Button
              title={t('repairReport.saveDetails')}
              variant='secondary'
              onPress={() => {
                clearTimeout(saveTimer.current);
                saveDetails(details);
              }}
            />
          ) : null}
        </Card>

        {/* Parts used */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }}>{t('repairReport.partsUsed')}</SectionTitle>
          {(ticket.parts_used || []).length === 0 ? <Text style={[styles.small, { marginBottom: 8 }]}>{t('repairReport.noPartsRecorded')}</Text> : null}
          {(ticket.parts_used || []).map((p) => (
            <Row key={p.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start' }}>
              <Pressable style={{ flex: 1 }} disabled={!p.part_id} onPress={() => router.push(`/parts/${p.part_id}`)}>
                <Text style={{ color: p.part_id ? colors.blue : colors.text, fontWeight: '600', fontStyle: p.part_id ? 'normal' : 'italic' }}>
                  {p.part_name}
                  {p.part_color ? ` (${p.part_color})` : ''}
                </Text>
                <Text style={styles.small}>
                  {p.quantity} × {formatMoney(p.unit_price)} = {formatMoney(p.quantity * Number(p.unit_price))}
                </Text>
              </Pressable>
              <Button
                title='✕'
                small
                variant='dangerOutline'
                onPress={async () => {
                  if (await confirm(t('mobile.confirmDeleteTitle'), p.part_name, { confirmText: t('common.remove'), cancelText: t('common.cancel') })) {
                    run(async () => {
                      await repairsAPI.removePart(id, p.id);
                      loadLookups();
                    });
                  }
                }}
              />
            </Row>
          ))}
          <View style={{ marginTop: 10 }}>
            <Select
              label={t('repairReport.partCol')}
              value={partForm.part_id}
              options={partOptions}
              placeholder={t('repairReport.searchOrCreatePart')}
              createLabel={t('common.create')}
              onCreate={async (name) => {
                const res = await partsAPI.create({ name });
                await loadLookups();
                return res.data.data.id;
              }}
              onChange={(v) => setPartForm({ ...partForm, part_id: v })}
            />
            <Row style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input label={t('repairReport.qtyCol')} value={partForm.quantity} onChangeText={(v) => setPartForm({ ...partForm, quantity: v.replace(/[^0-9]/g, '') })} keyboardType='number-pad' />
              </View>
              <Button title={t('common.add')} onPress={addPart} disabled={!partForm.part_id || busy} style={{ marginBottom: 14, flex: 1 }} />
            </Row>
          </View>
        </Card>

        {/* Totals */}
        <Card>
          <InfoRow label={t('repairReport.partsLabel')} value={formatMoney(partsTotal)} />
          <InfoRow label={t('repairReport.laborLabel')} value={formatMoney(ticket.labor_cost)} />
          <InfoRow label={t('repairReport.smallMaterialLabel')} value={formatMoney(ticket.small_material_cost)} />
          <InfoRow label={t('repairReport.shippingLabel')} value={formatMoney(ticket.shipping_cost)} />
          {discountPercent ? <InfoRow label={t('repairReport.discountLabel', { percent: discountPercent })} value={`− ${formatMoney(discountAmount)}`} /> : null}
          <Row style={{ justifyContent: 'space-between', paddingTop: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '800' }}>{t('common.total')}</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.brand }}>{formatMoney(grandTotal)}</Text>
          </Row>
        </Card>

        {/* Assignees */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }}>{t('repairReport.assignedTo')}</SectionTitle>
          {(ticket.assignees || []).length === 0 ? <Text style={[styles.small, { marginBottom: 8 }]}>{t('repairReport.noOneAssigned')}</Text> : null}
          <Row style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {(ticket.assignees || []).map((a) => (
              <Pressable key={a.id} onPress={() => run(() => repairsAPI.removeAssignee(id, a.id))}>
                <Badge label={`👤 ${a.full_name}  ✕`} color='blue' />
              </Pressable>
            ))}
          </Row>
          <Select
            label=''
            value={null}
            options={userOptions}
            placeholder={t('repairReport.selectEmployee')}
            onChange={(userId) => userId && run(() => repairsAPI.addAssignee(id, { userId, user_id: userId }))}
          />
          {!assignedIds.has(user?.id) ? (
            <Button title={`+ ${user?.full_name || ''}`} small variant='secondary' style={{ alignSelf: 'flex-start' }} onPress={() => run(() => repairsAPI.addAssignee(id, { userId: user.id, user_id: user.id }))} />
          ) : null}
        </Card>

        {/* History */}
        <Card>
          <SectionTitle style={{ marginTop: 0 }}>{t('repairReport.statusHistory')}</SectionTitle>
          {(ticket.status_history || []).length === 0 ? <Text style={styles.small}>{t('repairReport.noHistoryYet')}</Text> : null}
          {(ticket.status_history || []).map((h) => (
            <View key={h.id} style={{ borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 10, marginBottom: 10 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}</Text>
              <Text style={styles.small}>
                {formatDateTime(h.created_at)}
                {h.changed_by_name ? ` · ${h.changed_by_name}` : ''}
              </Text>
              {h.notes ? <Text style={{ color: colors.gray, marginTop: 2 }}>{h.notes}</Text> : null}
            </View>
          ))}
        </Card>

        <Button title={t('repairReport.deleteTicketTitle')} variant='dangerOutline' onPress={deleteTicket} style={{ marginTop: 10 }} />
      </ScrollView>
    </>
  );
}
