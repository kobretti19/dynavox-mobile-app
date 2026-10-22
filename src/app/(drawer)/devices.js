import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { devicesAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { includesQuery } from '../../utils/format';
import { deviceFields } from '../../utils/entityFields';
import { Badge, Button, Card, Empty, ErrorBox, Fab, Loading, Row, SearchBar, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';

export default function Devices() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => devicesAPI.getAll());
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const list = useMemo(() => (data || []).filter((d) => includesQuery(q, d.serial_number, d.brand, d.model)), [data, q]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('devices.errorLoading', { error })} onRetry={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder={t('nav.searchDevices')}
        right={<Button title='📷' small variant='secondary' style={{ height: 42 }} onPress={() => router.push('/scan')} />}
      />
      <FlatList
        data={list}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        initialNumToRender={20}
        ListEmptyComponent={<Empty icon='🔩' title={t('devices.noDevicesTitle')} subtitle={t('devices.noDevicesMessage')} />}
        renderItem={({ item: d }) => (
          <Card onPress={() => router.push(`/devices/${d.id}`)}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{[d.brand, d.model].filter(Boolean).join(' ') || '-'}</Text>
                <Text style={styles.subtitle}>SN: {d.serial_number}</Text>
              </View>
              {d.repair_count ? <Badge label={`🩹 ${d.repair_count}`} color='blue' /> : null}
            </Row>
          </Card>
        )}
      />
      <Fab onPress={() => setShowCreate(true)} />
      <EntityForm
        visible={showCreate}
        title={t('devices.createDevice')}
        fields={deviceFields(t)}
        initial={q ? { serial_number: q } : null}
        onClose={() => setShowCreate(false)}
        onSubmit={async (values) => {
          const res = await devicesAPI.create(values);
          setShowCreate(false);
          reload();
          router.push(`/devices/${res.data.data.id}`);
        }}
      />
    </View>
  );
}
