import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { vacationsAPI } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useApi } from '../utils/useApi';
import { getLocale, keyToDate } from '../utils/format';
import { swissHolidays } from '../utils/vacation';
import { Button, Card, Input, Row, confirm, showError, styles } from '../components/ui';
import DateField from '../components/DateField';
import { colors } from '../theme';

// Public holidays of a year: everyone sees them, admins add/remove them
// (or add the common Swiss ones in one go).
export default function Holidays() {
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(Number(params.year) || new Date().getFullYear());
  const { data, refreshing, refresh, reload } = useApi(() => vacationsAPI.getHolidays(`${year}-01-01`, `${year}-12-31`), [year]);
  const [date, setDate] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (err) {
      showError(t('common.error'), t('vacations.failedToSave', { error: errorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} keyboardShouldPersistTaps='handled' refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Stack.Screen options={{ title: `🎉 ${t('vacations.holidaysTitle', { year })}` }} />
      <Row style={{ justifyContent: 'center', marginBottom: 12 }} gap={16}>
        <Button title='‹' small variant='secondary' onPress={() => setYear(year - 1)} />
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{year}</Text>
        <Button title='›' small variant='secondary' onPress={() => setYear(year + 1)} />
      </Row>
      <Card>
        {(data || []).length === 0 ? <Text style={styles.small}>{t('vacations.noHolidays')}</Text> : null}
        {(data || []).map((h) => (
          <Row key={h.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ width: 110, color: colors.textMuted }}>
              {keyToDate(h.date).toLocaleDateString(getLocale(), { weekday: 'short', day: '2-digit', month: '2-digit' })}
            </Text>
            <Text style={{ flex: 1, fontWeight: '600', color: colors.red }}>{h.name}</Text>
            {isAdmin ? (
              <Button
                title='✕'
                small
                variant='dangerOutline'
                disabled={busy}
                onPress={async () => {
                  if (await confirm(t('vacations.delete'), h.name, { confirmText: t('vacations.delete'), cancelText: t('common.cancel') })) {
                    run(() => vacationsAPI.deleteHoliday(h.id));
                  }
                }}
              />
            ) : null}
          </Row>
        ))}
      </Card>
      {isAdmin ? (
        <>
          <Card>
            <DateField label={t('common.date')} value={date} minimumDate={`${year}-01-01`} maximumDate={`${year}-12-31`} onChange={setDate} />
            <Input label={t('common.name')} value={name} onChangeText={setName} placeholder={t('vacations.holidayName')} maxLength={100} />
            <Button
              title={t('vacations.add')}
              disabled={!date || !name.trim() || busy}
              onPress={() =>
                run(async () => {
                  await vacationsAPI.addHolidays([{ date, name: name.trim() }]);
                  setDate(null);
                  setName('');
                })
              }
            />
          </Card>
          <Button title={`🇨🇭 ${t('vacations.addSwissHolidays', { year })}`} variant='secondary' disabled={busy} onPress={() => run(() => vacationsAPI.addHolidays(swissHolidays(year)))} />
          <View style={{ height: 8 }} />
          <Text style={styles.small}>{t('vacations.swissHolidaysHint')}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}
