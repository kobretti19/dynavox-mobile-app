import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { equipmentTemplatesAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { includesQuery } from '../../utils/format';
import { Badge, Button, Card, Empty, ErrorBox, Fab, Loading, Row, Segmented, styles } from '../../components/ui';
import TemplateForm from '../../components/TemplateForm';
import ProduceSheet from '../../components/ProduceSheet';
import ScanSearchBar from '../../components/ScanSearchBar';

export default function EquipmentTemplates() {
  const { t } = useLanguage();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => equipmentTemplatesAPI.getAll());
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [useTemplate, setUseTemplate] = useState(null);

  const list = useMemo(
    () =>
      (data || []).filter(
        (tpl) =>
          (kind === 'all' || (kind === 'component' ? tpl.is_component : !tpl.is_component)) &&
          includesQuery(q, tpl.name, tpl.article_id, tpl.brand, tpl.category),
      ),
    [data, q, kind],
  );

  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('equipmentTemplates.errorLoadingTemplate', { message: error })} onRetry={refresh} />;

  return (
    <View style={{ flex: 1 }}>
      <ScanSearchBar value={q} onChangeText={setQ} placeholder={t('nav.searchTemplates')} />
      <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
        <Segmented
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'equipment', label: t('nav.equipment') },
            { value: 'component', label: t('equipmentTemplates.componentBadge') },
          ]}
          value={kind}
          onChange={setKind}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(tpl) => String(tpl.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<Empty icon='📋' title={t('equipmentTemplates.noTemplatesFound')} />}
        renderItem={({ item: tpl }) => (
          <Card onPress={() => router.push(`/templates/${tpl.id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{tpl.name}</Text>
                <Text style={styles.subtitle}>{[tpl.article_id || t('equipmentTemplates.noIdFallback'), tpl.brand, tpl.category].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.small}>
                  {t('equipmentTemplates.partsCount', { count: (tpl.parts_data || []).length })}
                  {(tpl.components_data || []).length ? ` · ${t('equipmentTemplates.componentsCount', { count: tpl.components_data.length })}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {tpl.is_component ? <Badge label={`🧩 ${tpl.component_stock ?? 0}`} color='purple' /> : null}
                <Button title={t('equipmentTemplates.use')} small onPress={() => setUseTemplate(tpl.id)} />
              </View>
            </Row>
          </Card>
        )}
      />
      <Fab onPress={() => setShowCreate(true)} />
      <TemplateForm
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(id) => {
          setShowCreate(false);
          reload();
          if (id) router.push(`/templates/${id}`);
        }}
      />
      <ProduceSheet
        visible={!!useTemplate}
        templateId={useTemplate}
        onClose={() => setUseTemplate(null)}
        onDone={() => {
          setUseTemplate(null);
          reload();
        }}
      />
    </View>
  );
}
