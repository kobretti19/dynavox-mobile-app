import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { equipmentAPI, partsAPI, repairsAPI, vacationsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationsContext';
import { todayKey } from '../../utils/format';
import { buildReportId, repairStatusColor, taskItemLabel } from '../../utils/status';
import { Badge, Button, Card, Row, SectionTitle, StatTile, styles } from '../../components/ui';
import { colors } from '../../theme';

const typeIcon = { vacation: '🏖️', sick: '🤒', other: '📌' };

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { latest, refresh: refreshBadge } = useNotifications();
  const [data, setData] = useState({ parts: [], equipment: [], repairs: [], away: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const today = todayKey();
    const [p, e, r, v] = await Promise.allSettled([
      partsAPI.getAll(),
      equipmentAPI.getAll(),
      repairsAPI.getAll(),
      vacationsAPI.getAll(today, today),
    ]);
    setData({
      parts: p.status === 'fulfilled' ? p.value.data.data || [] : [],
      equipment: e.status === 'fulfilled' ? e.value.data.data || [] : [],
      repairs: r.status === 'fulfilled' ? r.value.data.data || [] : [],
      away: v.status === 'fulfilled' ? v.value.data.data || [] : [],
    });
    refreshBadge();
  }, [refreshBadge]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const myName = user?.full_name || '';
  const lowStock = data.parts.filter((p) => !p.is_nla && Number(p.quantity) <= Number(p.min_stock_level));
  const openRepairs = data.repairs.filter((r) => r.status !== 'abgeschlossen');
  const myRepairs = openRepairs.filter((r) => myName && (r.assignee_names || '').split(', ').includes(myName));
  const myTasks = latest.filter((task) => task.assigned_to === user?.id && task.status !== 'done');

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 }}>{t('mobile.welcome', { name: myName.split(' ')[0] || '' })} 👋</Text>
      <Text style={[styles.subtitle, { marginBottom: 14 }]}>{t('dashboard.welcome')}</Text>

      <Row style={{ marginBottom: 12 }}>
        <Button title={t('mobile.quickScan')} icon='📷' onPress={() => router.push('/scan')} style={{ flex: 1, paddingVertical: 16 }} />
        <Button
          title={t('repairs.newRepairTicket')}
          variant='secondary'
          onPress={() => router.navigate({ pathname: '/repairs', params: { new: '1' } })}
          style={{ flex: 1, paddingVertical: 16 }}
        />
      </Row>

      <Row style={{ marginBottom: 10 }}>
        <StatTile label={t('dashboard.totalEquipment')} value={data.equipment.length} icon='🔧' onPress={() => router.navigate('/equipment')} />
        <StatTile label={t('dashboard.totalParts')} value={data.parts.length} icon='⚙️' onPress={() => router.navigate('/parts')} />
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <StatTile label={t('mobile.openRepairs')} value={openRepairs.length} icon='🩹' color={colors.blue} onPress={() => router.navigate('/repairs')} />
        <StatTile label={t('mobile.lowStockParts')} value={lowStock.length} icon='⚠️' color={colors.red} onPress={() => router.navigate('/stock-movements')} />
      </Row>

      <SectionTitle right={<Button title={t('mobile.seeAll')} small variant='secondary' onPress={() => router.navigate('/production-tasks')} />}>
        📝 {t('mobile.openTasks')} ({myTasks.length})
      </SectionTitle>
      {myTasks.length === 0 ? <Text style={[styles.small, { marginBottom: 10 }]}>{t('productionTasks.emptyTitle')}</Text> : null}
      {myTasks.slice(0, 5).map((task) => (
        <Card key={task.id} onPress={() => router.push(`/tasks/${task.id}`)} style={{ paddingVertical: 10 }}>
          <Row>
            <Text style={[styles.title, { flex: 1, fontSize: 15 }]} numberOfLines={2}>
              {taskItemLabel(task)}
              {task.quantity ? ` × ${task.quantity}` : ''}
            </Text>
            {!task.read_at ? <Badge label={t('productionTasks.newBadge')} color='red' /> : null}
            {task.unread_comments > 0 ? <Text>💬</Text> : null}
          </Row>
          <Text style={styles.small}>{task.created_by_name}</Text>
        </Card>
      ))}

      <SectionTitle right={<Button title={t('mobile.seeAll')} small variant='secondary' onPress={() => router.navigate('/repairs')} />}>
        🩹 {t('nav.repairs')} – {t('repairReport.assignedTo')} ({myRepairs.length})
      </SectionTitle>
      {myRepairs.length === 0 ? <Text style={[styles.small, { marginBottom: 10 }]}>{t('repairReport.noOneAssigned')}</Text> : null}
      {myRepairs.slice(0, 5).map((r) => (
        <Card key={r.id} onPress={() => router.push(`/repairs/${r.id}`)} style={{ paddingVertical: 10 }}>
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { fontSize: 15 }]}>
                {buildReportId(r.id, r.created_at)} · {r.customer_name || r.dealer_name || ''}
              </Text>
              {r.device_summary ? (
                <Text style={styles.small} numberOfLines={1}>
                  {r.device_summary}
                </Text>
              ) : null}
            </View>
            <Badge label={r.status} color={repairStatusColor[r.status]} />
          </Row>
        </Card>
      ))}

      <SectionTitle right={<Button title={t('mobile.seeAll')} small variant='secondary' onPress={() => router.navigate('/vacations')} />}>
        🏖️ {t('mobile.awayToday')}
      </SectionTitle>
      <Card>
        {data.away.length === 0 ? (
          <Text style={styles.small}>{t('mobile.nobodyAway')}</Text>
        ) : (
          data.away.map((v) => (
            <Text key={v.id} style={{ fontSize: 15, color: colors.text, paddingVertical: 3 }}>
              {typeIcon[v.type] || '📌'} {v.user_name}
              {v.half_day ? ' (½)' : ''}
            </Text>
          ))
        )}
      </Card>

      {lowStock.length ? (
        <>
          <SectionTitle right={<Button title={t('mobile.seeAll')} small variant='secondary' onPress={() => router.navigate('/stock-movements')} />}>
            ⚠️ {t('mobile.lowStockParts')}
          </SectionTitle>
          {lowStock
            .sort((a, b) => a.quantity - b.quantity)
            .slice(0, 5)
            .map((p) => (
              <Card key={p.id} onPress={() => router.push(`/parts/${p.id}`)} style={{ paddingVertical: 10 }}>
                <Row>
                  <Text style={[styles.title, { flex: 1, fontSize: 15 }]} numberOfLines={1}>
                    {p.name}
                    {p.color ? ` (${p.color})` : ''}
                  </Text>
                  <Text style={{ fontWeight: '800', color: Number(p.quantity) <= 0 ? colors.red : colors.yellow }}>
                    {p.quantity} / {p.min_stock_level}
                  </Text>
                </Row>
              </Card>
            ))}
        </>
      ) : null}
    </ScrollView>
  );
}
