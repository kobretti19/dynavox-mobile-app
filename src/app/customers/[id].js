import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { customersAPI, repairsAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate } from '../../utils/format';
import { customerFields } from '../../utils/entityFields';
import { Button, Card, ErrorBox, InfoRow, Loading, SectionTitle, confirm, showError, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';
import ContactActions from '../../components/ContactActions';
import RepairMiniList from '../../components/RepairMiniList';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const customer = useApi(() => customersAPI.getById(id), [id]);
  const repairs = useApi(() => repairsAPI.getAll(), []);
  const [showEdit, setShowEdit] = useState(false);

  const c = customer.data;
  if (customer.loading) return <Loading />;
  if (!c) return <ErrorBox message={customer.error} onRetry={customer.refresh} />;

  const address = [[c.street, c.house_number].filter(Boolean).join(' '), [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const myRepairs = (repairs.data || []).filter((r) => r.customer_id === c.id);

  const remove = async () => {
    if (!(await confirm(t('customers.deleteCustomer'), t('customers.confirmDelete', { name: c.name }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await customersAPI.delete(c.id);
      router.back();
    } catch (err) {
      showError(t('common.error'), t('mobile.deleteFailed', { error: errorMessage(err) }));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: c.name }} />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={customer.refreshing}
            onRefresh={() => {
              customer.refresh();
              repairs.reload();
            }}
          />
        }
      >
        <Card>
          <SectionTitle style={{ marginTop: 0 }} right={<Button title={t('common.edit')} small variant='secondary' onPress={() => setShowEdit(true)} />}>
            {t('customerDetails.sectionTitle')}
          </SectionTitle>
          <Text style={[styles.title, { fontSize: 19, marginBottom: 8 }]} selectable>
            {c.name}
          </Text>
          <ContactActions tel={c.tel} email={c.email} address={address} />
          <InfoRow label={t('customers.email')} value={c.email} />
          <InfoRow label={t('customers.phone')} value={c.tel} />
          <InfoRow label={t('customerDetails.address')} value={address} />
          <InfoRow label={t('customerDetails.created')} value={formatDate(c.created_at)} />
        </Card>
        <RepairMiniList repairs={myRepairs} />
        <Button title={t('customers.deleteCustomer')} variant='dangerOutline' onPress={remove} style={{ marginTop: 16 }} />
      </ScrollView>
      <EntityForm
        visible={showEdit}
        title={t('customers.editCustomer')}
        fields={customerFields(t)}
        initial={c}
        onClose={() => setShowEdit(false)}
        onSubmit={async (values) => {
          await customersAPI.update(c.id, values);
          setShowEdit(false);
          customer.reload();
        }}
      />
    </>
  );
}
