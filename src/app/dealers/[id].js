import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { dealersAPI, repairsAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDateTime } from '../../utils/format';
import { dealerFields } from '../../utils/entityFields';
import { Button, Card, ErrorBox, InfoRow, Loading, SectionTitle, confirm, showError, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';
import ContactActions from '../../components/ContactActions';
import RepairMiniList from '../../components/RepairMiniList';
import { colors } from '../../theme';

export default function DealerDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const dealer = useApi(() => dealersAPI.getById(id), [id]);
  const repairs = useApi(() => repairsAPI.getAll(), []);
  const [showEdit, setShowEdit] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const d = dealer.data;
  if (dealer.loading) return <Loading />;
  if (!d) return <ErrorBox message={dealer.error} onRetry={dealer.refresh} />;

  const address = [d.street, [d.zip, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const myRepairs = (repairs.data || []).filter((r) => r.dealer_id === d.id);

  const sync = async () => {
    setSyncing(true);
    try {
      await dealersAPI.sync(d.id);
      dealer.reload();
    } catch (err) {
      showError(t('common.error'), t('dealerDetails.syncFailed', { error: errorMessage(err) }));
    } finally {
      setSyncing(false);
    }
  };

  const remove = async () => {
    if (!(await confirm(t('dealers.deleteDealer'), t('dealers.confirmDelete', { name: d.name }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await dealersAPI.delete(d.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('mobile.deleteFailed', { error: errorMessage(err) }));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: d.name }} />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={dealer.refreshing}
            onRefresh={() => {
              dealer.refresh();
              repairs.reload();
            }}
          />
        }
      >
        <Card>
          <SectionTitle style={{ marginTop: 0 }} right={<Button title={t('common.edit')} small variant='secondary' onPress={() => setShowEdit(true)} />}>
            {t('dealerDetails.sectionTitle')}
          </SectionTitle>
          <Text style={[styles.title, { fontSize: 19, marginBottom: 8 }]} selectable>
            {d.name}
          </Text>
          <ContactActions tel={d.tel} email={d.email} address={address} />
          <InfoRow label={t('dealers.nickname')} value={d.nickname} />
          <InfoRow label={t('dealers.contactPerson')} value={d.contact_person} />
          <InfoRow label={t('dealers.email')} value={d.email} />
          <InfoRow label={t('dealers.phone')} value={d.tel} />
          <InfoRow label={t('dealerDetails.address')} value={address} />
          <InfoRow label={t('dealers.templateId')} value={d.templateID} />
        </Card>

        {d.templateID ? (
          <Card>
            <Text style={[styles.small, { color: d.sync_status === 'error' ? colors.red : colors.textMuted }]}>
              {d.last_synced_at ? t('dealerDetails.lastSynced', { date: formatDateTime(d.last_synced_at) }) : t('dealerDetails.notSyncedYet')}
              {d.sync_status === 'error' && d.sync_error ? `\n${d.sync_error}` : ''}
            </Text>
            <Text style={[styles.small, { marginTop: 4 }]}>{t('dealerDetails.templateSyncNote')}</Text>
            <Button title={syncing ? t('dealerDetails.syncing') : t('dealerDetails.syncNow')} small variant='secondary' onPress={sync} loading={syncing} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
          </Card>
        ) : null}

        <RepairMiniList repairs={myRepairs} />
        <Button title={t('dealers.deleteDealer')} variant='dangerOutline' onPress={remove} style={{ marginTop: 16 }} />
      </ScrollView>
      <EntityForm
        visible={showEdit}
        title={t('dealers.editDealer')}
        fields={dealerFields(t)}
        initial={d}
        onClose={() => setShowEdit(false)}
        onSubmit={async (values) => {
          await dealersAPI.update(d.id, { ...values, templateID: values.templateID || null });
          setShowEdit(false);
          dealer.reload();
        }}
      />
    </>
  );
}
