import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { devicesAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate } from '../../utils/format';
import { deviceFields } from '../../utils/entityFields';
import { Button, Card, ErrorBox, InfoRow, Loading, SectionTitle, confirm, showError, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';
import RepairMiniList from '../../components/RepairMiniList';

export default function DeviceDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const device = useApi(() => devicesAPI.getById(id), [id]);
  const repairs = useApi(() => devicesAPI.getRepairs(id), [id]);
  const [showEdit, setShowEdit] = useState(false);

  const d = device.data;
  if (device.loading) return <Loading />;
  if (!d) return <ErrorBox message={device.error} onRetry={device.refresh} />;

  const remove = async () => {
    if (!(await confirm(t('devices.deleteDevice'), t('devices.confirmDelete', { name: d.serial_number }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await devicesAPI.delete(d.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('mobile.deleteFailed', { error: errorMessage(err) }));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: d.serial_number }} />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={device.refreshing}
            onRefresh={() => {
              device.refresh();
              repairs.reload();
            }}
          />
        }
      >
        <Card>
          <SectionTitle style={{ marginTop: 0 }} right={<Button title={t('common.edit')} small variant='secondary' onPress={() => setShowEdit(true)} />}>
            {t('deviceDetails.sectionTitle')}
          </SectionTitle>
          <Text style={[styles.title, { fontSize: 19, marginBottom: 8 }]} selectable>
            {[d.brand, d.model].filter(Boolean).join(' ') || '-'}
          </Text>
          <InfoRow label={t('devices.serialNumber')} value={d.serial_number} />
          <InfoRow label={t('devices.brand')} value={d.brand} />
          <InfoRow label={t('devices.model')} value={d.model} />
          <InfoRow label={t('customerDetails.created')} value={formatDate(d.created_at)} />
        </Card>
        <Button
          title={t('repairs.newRepairTicket')}
          variant='secondary'
          style={{ marginBottom: 6 }}
          onPress={() => router.navigate(`/repairs?new=1&device=${d.id}`)}
        />
        <RepairMiniList repairs={repairs.data} title={t('deviceDetails.repairHistory')} emptyText={t('deviceDetails.noRepairsYet')} />
        <Button title={t('devices.deleteDevice')} variant='dangerOutline' onPress={remove} style={{ marginTop: 16 }} />
      </ScrollView>
      <EntityForm
        visible={showEdit}
        title={t('devices.editDevice')}
        fields={deviceFields(t)}
        initial={d}
        onClose={() => setShowEdit(false)}
        onSubmit={async (values) => {
          await devicesAPI.update(d.id, values);
          setShowEdit(false);
          device.reload();
        }}
      />
    </>
  );
}
