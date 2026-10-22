import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { dealersAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { includesQuery } from '../../utils/format';
import { dealerFields } from '../../utils/entityFields';
import { Badge, Card, Empty, ErrorBox, Fab, Loading, Row, SearchBar, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';

export default function Dealers() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => dealersAPI.getAll());
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const list = useMemo(
    () => (data || []).filter((d) => includesQuery(q, d.name, d.nickname, d.contact_person, d.email, d.tel, d.city, d.templateID)),
    [data, q],
  );

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('dealers.errorLoading', { error })} onRetry={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('nav.searchDealers')} />
      <FlatList
        data={list}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        initialNumToRender={20}
        ListEmptyComponent={<Empty icon='🏬' title={t('dealers.noDealersTitle')} subtitle={t('dealers.noDealersMessage')} />}
        renderItem={({ item: d }) => (
          <Card onPress={() => router.push(`/dealers/${d.id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{d.name}</Text>
                {d.contact_person ? <Text style={styles.subtitle}>{d.contact_person}</Text> : null}
                <Text style={styles.small} numberOfLines={1}>
                  {[d.tel, d.email, [d.zip, d.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || '-'}
                </Text>
              </View>
              {d.templateID ? <Badge label={`ERP ${d.templateID}`} color={d.sync_status === 'error' ? 'red' : 'purple'} /> : null}
            </Row>
          </Card>
        )}
      />
      <Fab onPress={() => setShowCreate(true)} />
      <EntityForm
        visible={showCreate}
        title={t('dealers.createDealer')}
        fields={dealerFields(t)}
        onClose={() => setShowCreate(false)}
        onSubmit={async (values) => {
          const res = await dealersAPI.create({ ...values, templateID: values.templateID || null });
          setShowCreate(false);
          reload();
          router.push(`/dealers/${res.data.data.id}`);
        }}
      />
    </View>
  );
}
