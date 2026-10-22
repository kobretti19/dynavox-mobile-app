import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { customersAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { includesQuery } from '../../utils/format';
import { customerFields } from '../../utils/entityFields';
import { Card, Empty, ErrorBox, Fab, Loading, SearchBar, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';

export default function Customers() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => customersAPI.getAll());
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const list = useMemo(
    () => (data || []).filter((c) => includesQuery(q, c.name, c.email, c.tel, c.city, c.street, c.zip)),
    [data, q],
  );

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('customers.errorLoading', { error })} onRetry={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('nav.searchCustomers')} />
      <FlatList
        data={list}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        initialNumToRender={20}
        ListEmptyComponent={<Empty icon='🧑' title={t('customers.noCustomersTitle')} subtitle={t('customers.noCustomersMessage')} />}
        renderItem={({ item: c }) => (
          <Card onPress={() => router.push(`/customers/${c.id}`)}>
            <Text style={styles.title}>{c.name}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {[c.email, c.tel].filter(Boolean).join(' · ') || '-'}
            </Text>
            {c.city || c.street ? (
              <Text style={styles.small} numberOfLines={1}>
                {[[c.street, c.house_number].filter(Boolean).join(' '), [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </Card>
        )}
      />
      <Fab onPress={() => setShowCreate(true)} />
      <EntityForm
        visible={showCreate}
        title={t('customers.createCustomer')}
        fields={customerFields(t)}
        onClose={() => setShowCreate(false)}
        onSubmit={async (values) => {
          const res = await customersAPI.create(values);
          setShowCreate(false);
          reload();
          router.push(`/customers/${res.data.data.id}`);
        }}
      />
    </View>
  );
}
