import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatMoney } from '../utils/format';
import { buildReportId, repairStatusColor } from '../utils/status';
import { Badge, Card, Row, SectionTitle, styles } from './ui';

// Compact list of repair tickets on customer / dealer / device pages.
const RepairMiniList = ({ repairs, title, emptyText }) => {
  const { t } = useLanguage();
  return (
    <View>
      <SectionTitle>
        {title || t('nav.repairs')} ({(repairs || []).length})
      </SectionTitle>
      {(repairs || []).length === 0 ? <Text style={[styles.small, { marginBottom: 12 }]}>{emptyText || '-'}</Text> : null}
      {(repairs || []).map((r) => (
        <Card key={r.id} onPress={() => router.push(`/repairs/${r.id}`)} style={{ paddingVertical: 10 }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {buildReportId(r.id, r.created_at)} <Text style={styles.small}>{r.type}</Text>
              </Text>
              <Text style={styles.small} numberOfLines={1}>
                {formatDate(r.created_at)}
                {r.customer_name || r.dealer_name ? ` · ${r.customer_name || r.dealer_name}` : ''}
              </Text>
              {r.problem_description ? (
                <Text style={styles.small} numberOfLines={2}>
                  {r.problem_description}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={r.status} color={repairStatusColor[r.status]} />
              {r.total_cost !== undefined ? <Text style={styles.small}>{formatMoney(r.total_cost)}</Text> : null}
            </View>
          </Row>
        </Card>
      ))}
    </View>
  );
};

export default RepairMiniList;
