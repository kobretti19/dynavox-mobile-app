import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { vacationsAPI } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { formatDate, getLocale, todayKey } from '../../utils/format';
import { fmtDays, typeIcon } from '../../utils/vacation';
import { Badge, Button, Card, ErrorBox, Loading, Row, SectionTitle, StatTile, styles } from '../../components/ui';
import { colors } from '../../theme';

const barColor = { vacation: colors.brand, sick: '#F87171', other: '#9CA3AF' };

// One person's vacation statistics for a year (same data as the web modal).
export default function VacationStats() {
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const [year, setYear] = useState(Number(params.year) || new Date().getFullYear());
  const { data, loading, error, refresh } = useApi(() => vacationsAPI.getUserStats(params.userId, year), [params.userId, year]);

  if (loading) return <Loading />;
  if (!data) return <ErrorBox message={error} onRetry={refresh} />;

  const s = data.summary;
  const usedPct = s.allowance > 0 ? Math.min(100, (s.taken / s.allowance) * 100) : 0;
  const plannedPct = s.allowance > 0 ? Math.min(100 - usedPct, (s.planned / s.allowance) * 100) : 0;
  const maxMonth = Math.max(1, ...data.months.map((m) => m.vacation + m.sick + m.other));
  const today = todayKey();
  const state = (e) => (e.end_date < today ? t('vacations.statePast') : e.start_date > today ? t('vacations.stateUpcoming') : t('vacations.stateNow'));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: `📊 ${s.user_name}` }} />
      <Row style={{ justifyContent: 'center', marginBottom: 12 }} gap={16}>
        <Button title='‹' small variant='secondary' onPress={() => setYear(year - 1)} />
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{year}</Text>
        <Button title='›' small variant='secondary' onPress={() => setYear(year + 1)} />
      </Row>

      <Row style={{ marginBottom: 8 }}>
        <StatTile label={t('vacations.colAllowance')} value={fmtDays(s.allowance)} />
        <StatTile label={t('vacations.colTaken')} value={fmtDays(s.taken)} color={colors.brand} />
        <StatTile label={t('vacations.colPlanned')} value={fmtDays(s.planned)} color={colors.blue} />
      </Row>
      <Row style={{ marginBottom: 12 }}>
        <StatTile label={t('vacations.colRemaining')} value={fmtDays(s.remaining)} color={s.remaining < 0 ? colors.red : colors.green} />
        <StatTile label={t('vacations.colSick')} value={fmtDays(s.sick)} color={colors.red} />
        <StatTile label={t('vacations.colOther')} value={fmtDays(s.other)} color={colors.gray} />
      </Row>

      <Card>
        <Text style={[styles.small, { marginBottom: 6 }]}>{t('vacations.allowanceUsed', { used: fmtDays(s.taken + s.planned), total: fmtDays(s.allowance) })}</Text>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.grayBg, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: `${usedPct}%`, backgroundColor: colors.brand }} />
          <View style={{ width: `${plannedPct}%`, backgroundColor: '#60A5FA' }} />
        </View>
      </Card>

      <Card>
        <SectionTitle style={{ marginTop: 0 }}>{t('vacations.perMonth')}</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3 }}>
          {data.months.map((m) => {
            const total = m.vacation + m.sick + m.other;
            return (
              <View key={m.month} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                {total > 0 ? <Text style={{ fontSize: 9, color: colors.gray }}>{fmtDays(total)}</Text> : null}
                <View style={{ width: '80%', height: `${(total / maxMonth) * 85}%`, borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden', flexDirection: 'column-reverse' }}>
                  {['vacation', 'sick', 'other'].map((type) => (m[type] > 0 ? <View key={type} style={{ flex: m[type], backgroundColor: barColor[type] }} /> : null))}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
          {data.months.map((m) => (
            <Text key={m.month} style={{ flex: 1, fontSize: 9, textAlign: 'center', color: colors.textMuted }}>
              {new Date(year, m.month - 1, 1).toLocaleDateString(getLocale(), { month: 'narrow' })}
            </Text>
          ))}
        </View>
        <Row style={{ marginTop: 8 }} gap={12}>
          {['vacation', 'sick', 'other'].map((type) => (
            <Row key={type} gap={4}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: barColor[type] }} />
              <Text style={styles.small}>{t(`vacations.type_${type}`)}</Text>
            </Row>
          ))}
        </Row>
      </Card>

      <SectionTitle>{t('vacations.entriesTitle')}</SectionTitle>
      {data.entries.length === 0 ? <Text style={styles.small}>{t('vacations.noEntries')}</Text> : null}
      {data.entries.map((e) => (
        <Card key={e.id} style={{ paddingVertical: 10 }}>
          <Row>
            <Text style={{ fontSize: 20 }}>{typeIcon[e.type]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {formatDate(e.start_date)} – {formatDate(e.end_date)}
              </Text>
              <Text style={styles.small}>
                {t(`vacations.type_${e.type}`)}
                {e.half_day ? ` (${t('vacations.halfDay')})` : ''}
                {e.note ? ` · ${e.note}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800' }}>
                {fmtDays(e.days)} {t('vacations.days')}
              </Text>
              <Badge label={state(e)} color={e.end_date < today ? 'gray' : e.start_date > today ? 'blue' : 'green'} />
            </View>
          </Row>
        </Card>
      ))}
    </ScrollView>
  );
}
