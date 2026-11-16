import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { aiAPI } from '../api';
import { errorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme';

const ACTIONS = [
  { key: 'improve', action: 'improve', label: '✨', text: 'ai.improve' },
  { key: 'de', action: 'translate', language: 'de', label: '🇩🇪 DE' },
  { key: 'fr', action: 'translate', language: 'fr', label: '🇫🇷 FR' },
  { key: 'en', action: 'translate', language: 'en', label: '🇬🇧 EN' },
  { key: 'it', action: 'translate', language: 'it', label: '🇮🇹 IT' },
];

const Chip = ({ children, onPress, active, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={4}
    style={{
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: active ? colors.brand : colors.border,
      backgroundColor: active ? colors.brandLight : colors.card,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <Text style={{ fontSize: 13, color: colors.text }}>{children}</Text>
  </Pressable>
);

// AI writing help under a multiline Input: improve the text, or translate it
// to DE/FR/EN/IT. The result replaces the text and can be undone.
const AiTextActions = ({ value, onChangeText }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previous, setPrevious] = useState(null);

  if (!onChangeText) return null;

  const run = async ({ action, language }) => {
    const text = String(value ?? '');
    if (!text.trim()) {
      Alert.alert(t('ai.button'), t('ai.emptyText'));
      return;
    }
    setBusy(true);
    try {
      const res = await aiAPI.text(text, action, language);
      setPrevious(text);
      onChangeText(res.data.data.text);
      setOpen(false);
    } catch (err) {
      Alert.alert(t('common.error'), t('ai.failed', { error: errorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
      <Chip active={open} onPress={() => setOpen((o) => !o)} disabled={busy}>
        ✨ {t('ai.button')}
      </Chip>
      {busy ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ActivityIndicator size='small' color={colors.brand} />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t('ai.working')}</Text>
        </View>
      ) : open ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps='handled' contentContainerStyle={{ gap: 6 }}>
          {ACTIONS.map((a) => (
            <Chip key={a.key} onPress={() => run(a)}>
              {a.text ? `${a.label} ${t(a.text)}` : a.label}
            </Chip>
          ))}
        </ScrollView>
      ) : previous !== null ? (
        <Chip
          onPress={() => {
            onChangeText(previous);
            setPrevious(null);
          }}
        >
          ↶ {t('ai.undo')}
        </Chip>
      ) : null}
    </View>
  );
};

export default AiTextActions;
