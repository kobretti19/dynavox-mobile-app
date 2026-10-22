import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { productionTasksAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useApi } from '../../utils/useApi';
import { formatDateTime, includesQuery } from '../../utils/format';
import { Badge, Button, Card, Empty, Fab, Loading, Row, SearchBar, Segmented, SwitchRow, confirm, showError, styles } from '../../components/ui';
import NewTaskSheet from '../../components/NewTaskSheet';
import { colors } from '../../theme';
import { taskItemLabel } from '../../utils/status';

const statusColor = { open: 'yellow', in_progress: 'blue', done: 'green' };
const typeIcon = { part: '⚙️', component: '🧩', text: '📝' };

export default function ProductionTasks() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { refresh: refreshBadge } = useNotifications();
  const params = useLocalSearchParams();
  const [scope, setScope] = useState('received');
  const [showDone, setShowDone] = useState(false);
  const [q, setQ] = useState('');
  const [prefill, setPrefill] = useState(null);
  const [flash, setFlash] = useState('');

  const { data, setData, loading, refreshing, refresh, reload } = useApi(async () => {
    const res = await productionTasksAPI.getAll(scope);
    // Opening the Received tab counts as having seen the new notes.
    if (scope === 'received') {
      const unseen = res.data.data.filter((task) => !task.read_at);
      if (unseen.length) {
        await Promise.all(unseen.map((task) => productionTasksAPI.markRead(task.id)));
        refreshBadge();
      }
    }
    return res;
  }, [scope]);

  // ?new=part&id=5 / ?new=component&id=3 / ?new=text opens the form prefilled.
  useEffect(() => {
    if (!params.new) return;
    const id = Number(params.id) || null;
    if (params.new === 'part') setPrefill({ item_type: 'part', part_id: id });
    else if (params.new === 'component') setPrefill({ item_type: 'component', template_id: id });
    else setPrefill({ item_type: 'text' });
    router.setParams({ new: undefined, id: undefined });
  }, [params.new, params.id]);

  const tasks = useMemo(
    () =>
      (data || []).filter(
        (task) =>
          (showDone || task.status !== 'done') &&
          includesQuery(q, taskItemLabel(task), task.note, task.created_by_name, task.assigned_to_name, task.part_article_id, task.component_article_id),
      ),
    [data, showDone, q],
  );

  const changeStatus = async (task, status) => {
    try {
      const res = await productionTasksAPI.updateStatus(task.id, status);
      setData((prev) => prev.map((x) => (x.id === task.id ? res.data.data : x)));
      refreshBadge();
    } catch (err) {
      showError(t('common.error'), t('productionTasks.failedToUpdate', { error: errorMessage(err) }));
    }
  };

  const remove = async (task) => {
    if (!(await confirm(t('mobile.confirmDeleteTitle'), t('productionTasks.confirmDelete'), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await productionTasksAPI.delete(task.id);
      setData((prev) => prev.filter((x) => x.id !== task.id));
      refreshBadge();
    } catch (err) {
      showError(t('common.error'), t('productionTasks.failedToUpdate', { error: errorMessage(err) }));
    }
  };

  const scopes = [
    { value: 'received', label: t('productionTasks.tabReceived') },
    { value: 'sent', label: t('productionTasks.tabSent') },
    ...(isAdmin ? [{ value: 'all', label: t('productionTasks.tabAll') }] : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Segmented options={scopes} value={scope} onChange={setScope} />
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('common.search')} />
      {flash ? (
        <View style={{ marginHorizontal: 12, padding: 10, backgroundColor: colors.greenBg, borderRadius: 10 }}>
          <Text style={{ color: colors.green, fontWeight: '600' }}>✓ {flash}</Text>
        </View>
      ) : null}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => String(task.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={<SwitchRow label={t('productionTasks.showDone')} value={showDone} onValueChange={setShowDone} />}
          ListEmptyComponent={<Empty icon='📝' title={t('productionTasks.emptyTitle')} subtitle={t('productionTasks.emptyMessage')} />}
          renderItem={({ item: task }) => {
            const canDelete = isAdmin || task.created_by === user?.id;
            return (
              <Card style={task.status === 'done' ? { opacity: 0.65 } : null} onPress={() => router.push(`/tasks/${task.id}`)}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22 }}>{typeIcon[task.item_type]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={3}>
                      {taskItemLabel(task)}
                      {task.quantity ? <Text style={{ color: colors.brand }}>{`  × ${task.quantity}`}</Text> : null}
                    </Text>
                    {task.item_type !== 'text' && task.note ? (
                      <Text style={[styles.subtitle, { color: colors.text }]} numberOfLines={3}>
                        {task.note}
                      </Text>
                    ) : null}
                    <Text style={[styles.small, { marginTop: 4 }]}>
                      {task.created_by_name} → {task.assigned_to_name} · {formatDateTime(task.created_at)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Badge label={t(`productionTasks.status_${task.status}`)} color={statusColor[task.status]} />
                    <Pressable onPress={() => router.push(`/tasks/${task.id}`)} hitSlop={8}>
                      <Text style={{ fontSize: 14, color: colors.gray }}>
                        💬 {task.comment_count || 0}
                        {task.unread_comments > 0 ? <Text style={{ color: colors.red }}> ●</Text> : null}
                      </Text>
                    </Pressable>
                  </View>
                </Row>
                {task.status === 'done' && task.done_by_name ? (
                  <Text style={[styles.small, { marginTop: 4 }]}>{t('productionTasks.doneBy', { name: task.done_by_name })}</Text>
                ) : null}
                <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
                  {task.status === 'open' ? (
                    <Button title={t('productionTasks.start')} small variant='blue' onPress={() => changeStatus(task, 'in_progress')} />
                  ) : null}
                  {task.status !== 'done' ? (
                    <Button title={`✓ ${t('productionTasks.markDone')}`} small variant='success' onPress={() => changeStatus(task, 'done')} />
                  ) : (
                    <Button title={t('productionTasks.reopen')} small variant='secondary' onPress={() => changeStatus(task, 'open')} />
                  )}
                  {canDelete ? <Button title={t('common.delete')} small variant='dangerOutline' onPress={() => remove(task)} /> : null}
                </Row>
              </Card>
            );
          }}
        />
      )}
      <Fab onPress={() => setPrefill({ item_type: 'part' })} />
      <NewTaskSheet
        visible={!!prefill}
        prefill={prefill}
        onClose={() => setPrefill(null)}
        onSent={(msg) => {
          setPrefill(null);
          setFlash(msg);
          setTimeout(() => setFlash(''), 4000);
          reload();
          refreshBadge();
        }}
      />
    </View>
  );
}
