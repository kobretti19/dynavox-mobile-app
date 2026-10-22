import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { productionTasksAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationsContext';
import { formatDateTime } from '../../utils/format';
import { taskItemLabel } from '../../utils/status';
import { Badge, Loading, showError, styles } from '../../components/ui';
import { colors } from '../../theme';

const POLL_MS = 10000;
const statusColor = { open: 'yellow', in_progress: 'blue', done: 'green' };

// Chat thread of one "To produce" note. Opening it marks the thread seen.
export default function TaskThread() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { refresh: refreshBadge } = useNotifications();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await productionTasksAPI.getComments(id);
      setTask(data.data.task);
      setComments(data.data.comments);
      setError(null);
      refreshBadge();
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id, refreshBadge]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const body = message.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await productionTasksAPI.addComment(id, body);
      setComments((prev) => [...prev, data.data]);
      setMessage('');
    } catch (err) {
      showError(t('common.error'), t('productionTasks.failedToSend', { error: errorMessage(err) }));
    } finally {
      setSending(false);
    }
  };

  if (!task && !error) return <Loading />;
  if (!task) return <Text style={{ padding: 20, color: colors.red }}>{error}</Text>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen options={{ title: `💬 ${t('productionTasks.comments')}` }} />
      <View style={{ backgroundColor: '#FFF', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={[styles.title, { flex: 1 }]}>
            {taskItemLabel(task)}
            {task.quantity ? `  × ${task.quantity}` : ''}
          </Text>
          <Badge label={t(`productionTasks.status_${task.status}`)} color={statusColor[task.status]} />
        </View>
        {task.item_type !== 'text' && task.note ? <Text style={[styles.subtitle, { color: colors.text }]}>{task.note}</Text> : null}
        <Text style={[styles.small, { marginTop: 4 }]}>
          {task.created_by_name} → {task.assigned_to_name} · {formatDateTime(task.created_at)}
        </Text>
      </View>
      <FlatList
        ref={listRef}
        data={comments}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={[styles.small, { textAlign: 'center', marginTop: 30 }]}>{t('productionTasks.noComments')}</Text>}
        renderItem={({ item: c }) => {
          const mine = c.user_id === user?.id;
          return (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <View
                style={{
                  maxWidth: '82%',
                  backgroundColor: mine ? colors.brand : '#FFF',
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 4 : 16,
                  borderBottomLeftRadius: mine ? 16 : 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                {!mine ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand, marginBottom: 2 }}>{c.user_name || c.user_login}</Text>
                ) : null}
                <Text style={{ fontSize: 15, color: mine ? '#FFF' : colors.text }} selectable>
                  {c.body}
                </Text>
                <Text style={{ fontSize: 10, color: mine ? '#E5D5DC' : colors.textLight, marginTop: 3, textAlign: 'right' }}>
                  {formatDateTime(c.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          padding: 10,
          paddingBottom: insets.bottom + 10,
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={t('productionTasks.newComment')}
          placeholderTextColor={colors.textLight}
          multiline
          style={[styles.input, { flex: 1, maxHeight: 120, borderRadius: 20 }]}
        />
        <Pressable
          onPress={send}
          disabled={!message.trim() || sending}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: message.trim() ? colors.brand : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sending ? <ActivityIndicator color='#FFF' /> : <Text style={{ color: '#FFF', fontSize: 18 }}>➤</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
