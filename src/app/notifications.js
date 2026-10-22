import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { productionTasksAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationsContext';
import { timeAgo } from '../utils/format';
import { taskItemLabel } from '../utils/status';
import { Badge, Button, Card, Empty, Row, styles } from '../components/ui';
import { colors } from '../theme';

// Same list as the web bell dropdown: new notes, unread chat messages and
// my still-open notes.
export default function Notifications() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { latest, unread, refresh } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const markAll = async () => {
    await productionTasksAPI.markAllRead().catch(() => {});
    refresh();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `🔔 ${t('mobile.notifications')}` }} />
      <FlatList
        data={latest}
        keyExtractor={(task) => String(task.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Row style={{ marginBottom: 10 }}>
            {unread > 0 ? <Button title={t('mobile.markAllRead')} small variant='secondary' onPress={markAll} /> : null}
            <Button title={t('mobile.openToProduce')} small variant='secondary' onPress={() => router.replace('/production-tasks')} />
          </Row>
        }
        ListEmptyComponent={<Empty icon='🔕' title={t('mobile.noNotifications')} />}
        renderItem={({ item: task }) => {
          const isNew = task.assigned_to === user?.id && !task.read_at;
          return (
            <Card
              onPress={() => {
                if (isNew) productionTasksAPI.markRead(task.id).catch(() => {});
                router.push(`/tasks/${task.id}`);
              }}
              style={isNew || task.unread_comments > 0 ? { borderColor: colors.brand, borderWidth: 1 } : null}
            >
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {taskItemLabel(task)}
                    {task.quantity ? ` × ${task.quantity}` : ''}
                  </Text>
                  <Text style={styles.small}>
                    {task.created_by_name} → {task.assigned_to_name} · {timeAgo(task.last_comment_at || task.created_at)}
                  </Text>
                  {task.unread_comments > 0 ? (
                    <Text style={{ marginTop: 4, color: colors.brand, fontWeight: '600' }} numberOfLines={2}>
                      💬 {t('mobile.newMessages', { count: task.unread_comments })}
                      {task.last_comment_body ? `: ${task.last_comment_body}` : ''}
                    </Text>
                  ) : null}
                </View>
                {isNew ? <Badge label={t('productionTasks.newBadge')} color='red' /> : null}
              </Row>
            </Card>
          );
        }}
      />
    </View>
  );
}
