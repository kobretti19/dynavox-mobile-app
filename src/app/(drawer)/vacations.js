import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { vacationsAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate, getLocale, todayKey } from '../../utils/format';
import { entriesOn, fmtDays, monthGrid, typeIcon, userColor, workingDays } from '../../utils/vacation';
import { Button, Card, Fab, Input, Row, SectionTitle, Segmented, Select, Sheet, SwitchRow, confirm, showError, styles } from '../../components/ui';
import DateField from '../../components/DateField';
import { colors } from '../../theme';

const WEEKDAYS = { en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] };

const emptyForm = (userId, date) => ({ id: null, user_id: userId, type: 'vacation', start_date: date, end_date: date, half_day: false, note: '' });

export default function Vacations() {
  const { t, language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState('month');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [allowanceEdit, setAllowanceEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const [e, s, h] = await Promise.all([
        vacationsAPI.getAll(`${year - 1}-12-01`, `${year + 1}-01-31`),
        vacationsAPI.getSummary(year),
        vacationsAPI.getHolidays(`${year - 1}-01-01`, `${year + 1}-12-31`),
      ]);
      setEntries(e.data.data || []);
      setSummary(s.data.data.users || []);
      setHolidays(h.data.data || []);
    } catch (err) {
      showError(t('common.error'), t('vacations.failedToLoad', { error: errorMessage(err) }));
    }
  }, [year, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const holidayMap = useMemo(() => Object.fromEntries(holidays.map((h) => [h.date, h.name])), [holidays]);
  const today = todayKey();

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openNew = (date) => setForm(emptyForm(user?.id, date || selectedDay || today));
  const openEdit = (e) => setForm({ ...e, half_day: !!e.half_day, note: e.note || '' });
  const canEdit = form && (isAdmin || form.user_id === user?.id);

  const save = async () => {
    if (!form.start_date || !form.end_date || form.end_date < form.start_date) {
      showError(t('common.error'), `${t('vacations.from')} / ${t('vacations.to')}`);
      return;
    }
    setSaving(true);
    const payload = {
      user_id: form.user_id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date,
      half_day: form.half_day && form.start_date === form.end_date,
      note: form.note,
    };
    try {
      if (form.id) await vacationsAPI.update(form.id, payload);
      else await vacationsAPI.create(payload);
      setForm(null);
      load();
    } catch (err) {
      showError(t('common.error'), t('vacations.failedToSave', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm(t('vacations.delete'), t('vacations.confirmDelete'), { confirmText: t('vacations.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await vacationsAPI.delete(form.id);
      setForm(null);
      load();
    } catch (err) {
      showError(t('common.error'), t('vacations.failedToSave', { error: errorMessage(err) }));
    }
  };

  const saveAllowance = async () => {
    const days = Number(String(allowanceEdit.value).replace(',', '.'));
    if (!Number.isFinite(days)) return;
    try {
      await vacationsAPI.setAllowance(allowanceEdit.user_id, days);
      setAllowanceEdit(null);
      load();
    } catch (err) {
      showError(t('common.error'), t('vacations.failedToSave', { error: errorMessage(err) }));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const weekdays = WEEKDAYS[language] || WEEKDAYS.en;
  const dayEntries = entriesOn(entries, selectedDay);
  const awayToday = entriesOn(entries, today);
  const monthTitle = new Date(year, month, 1).toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' });

  const renderMonth = (y, m, mini) => {
    const cells = monthGrid(y, m);
    return (
      <View>
        {!mini ? (
          <Row gap={0} style={{ marginBottom: 4 }}>
            {weekdays.map((w) => (
              <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                {w}
              </Text>
            ))}
          </Row>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((cell) => {
            const es = cell.inMonth ? entriesOn(entries, cell.key) : [];
            const holiday = holidayMap[cell.key];
            const selected = !mini && cell.key === selectedDay;
            const isToday = cell.key === today;
            if (mini) {
              return (
                <View
                  key={cell.key}
                  style={{
                    width: `${100 / 7}%`,
                    aspectRatio: 1,
                    padding: 1,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: !cell.inMonth
                        ? 'transparent'
                        : holiday
                          ? colors.redBg
                          : es.length > 1
                            ? colors.blueBg
                            : es.length === 1
                              ? userColor(es[0].user_id).background
                              : cell.weekend
                                ? colors.grayBg
                                : '#FFF',
                      borderWidth: isToday && cell.inMonth ? 1.5 : 0,
                      borderColor: colors.brand,
                    }}
                  >
                    <Text style={{ fontSize: 8, color: cell.inMonth ? (holiday ? colors.red : colors.gray) : 'transparent' }}>{cell.day}</Text>
                  </View>
                </View>
              );
            }
            return (
              <Pressable
                key={cell.key}
                onPress={() => setSelectedDay(cell.key)}
                onLongPress={() => openNew(cell.key)}
                style={{ width: `${100 / 7}%`, height: 58, padding: 1.5 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    padding: 3,
                    opacity: cell.inMonth ? 1 : 0.35,
                    backgroundColor: selected ? colors.brandLight : holiday ? colors.redBg : cell.weekend ? colors.grayBg : '#FFF',
                    borderWidth: selected ? 2 : isToday ? 1.5 : StyleSheetHair,
                    borderColor: selected || isToday ? colors.brand : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: isToday ? '800' : '500', color: holiday ? colors.red : colors.text }}>{cell.day}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                    {es.slice(0, 6).map((e) => (
                      <View
                        key={e.id}
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: userColor(e.user_id).dot,
                          borderWidth: e.type === 'sick' ? 1.5 : 0,
                          borderColor: colors.red,
                          opacity: e.half_day ? 0.5 : 1,
                        }}
                      />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 110 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Row style={{ marginBottom: 10 }}>
          <Segmented
            style={{ flex: 1 }}
            options={[
              { value: 'month', label: t('vacations.viewMonth') },
              { value: 'year', label: t('vacations.viewYear') },
            ]}
            value={view}
            onChange={setView}
          />
          <Button title={`🎉 ${t('vacations.holidays')}`} small variant='secondary' onPress={() => router.push(`/holidays?year=${year}`)} />
        </Row>

        <Card>
          <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <Button title='‹' small variant='secondary' onPress={() => (view === 'month' ? shiftMonth(-1) : setYear(year - 1))} />
            <Pressable
              onPress={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
                setSelectedDay(today);
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>{view === 'month' ? monthTitle : year}</Text>
            </Pressable>
            <Button title='›' small variant='secondary' onPress={() => (view === 'month' ? shiftMonth(1) : setYear(year + 1))} />
          </Row>
          {view === 'month' ? (
            renderMonth(year, month, false)
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {Array.from({ length: 12 }, (_, m) => (
                <Pressable
                  key={m}
                  style={{ width: '31.5%', marginBottom: 10 }}
                  onPress={() => {
                    setMonth(m);
                    setView('month');
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'capitalize', marginBottom: 2 }}>
                    {new Date(year, m, 1).toLocaleDateString(getLocale(), { month: 'short' })}
                  </Text>
                  {renderMonth(year, m, true)}
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {view === 'month' ? (
          <Card>
            <SectionTitle style={{ marginTop: 0 }} right={<Button title={t('common.add')} small onPress={() => openNew(selectedDay)} />}>
              {formatDate(selectedDay)}
            </SectionTitle>
            {holidayMap[selectedDay] ? <Text style={{ color: colors.red, fontWeight: '600', marginBottom: 6 }}>🎉 {holidayMap[selectedDay]}</Text> : null}
            {dayEntries.length === 0 && !holidayMap[selectedDay] ? <Text style={styles.small}>{t('vacations.nobodyAway')}</Text> : null}
            {dayEntries.map((e) => (
              <Pressable key={e.id} onPress={() => openEdit(e)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: userColor(e.user_id).dot }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>
                    {typeIcon[e.type]} {e.user_name}
                    {e.half_day ? ' (½)' : ''}
                  </Text>
                  <Text style={styles.small}>
                    {t(`vacations.type_${e.type}`)} · {formatDate(e.start_date)} – {formatDate(e.end_date)}
                    {e.note ? ` · ${e.note}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <SectionTitle style={{ marginTop: 0 }}>{t('vacations.awayToday')}</SectionTitle>
            {awayToday.length === 0 ? <Text style={styles.small}>{t('vacations.nobodyAway')}</Text> : null}
            {awayToday.map((e) => (
              <Text key={e.id} style={{ paddingVertical: 3 }}>
                {typeIcon[e.type]} {e.user_name}
              </Text>
            ))}
          </Card>
        )}

        <SectionTitle>{t('vacations.summaryTitle', { year })}</SectionTitle>
        {summary.map((row) => (
          <Card key={row.user_id} onPress={() => router.push(`/vacation-stats/${row.user_id}?year=${year}`)}>
            <Row>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: userColor(row.user_id).dot }} />
              <Text style={[styles.title, { flex: 1 }]}>{row.user_name} 📊</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: row.remaining < 0 ? colors.red : colors.green }}>{fmtDays(row.remaining)}</Text>
            </Row>
            <Row style={{ marginTop: 6, flexWrap: 'wrap' }} gap={12}>
              <Pressable disabled={!isAdmin} onPress={() => setAllowanceEdit({ user_id: row.user_id, name: row.user_name, value: String(row.allowance) })}>
                <Text style={[styles.small, isAdmin && { color: colors.blue }]}>
                  {t('vacations.colAllowance')}: {fmtDays(row.allowance)}
                  {isAdmin ? ' ✎' : ''}
                </Text>
              </Pressable>
              {row.carryover ? (
                <Text style={[styles.small, { color: row.carryover < 0 ? colors.red : colors.green }]}>
                  {t('vacations.colCarryover')}: {row.carryover > 0 ? '+' : ''}
                  {fmtDays(row.carryover)}
                </Text>
              ) : null}
              <Text style={styles.small}>
                {t('vacations.colTaken')}: {fmtDays(row.taken)}
              </Text>
              <Text style={styles.small}>
                {t('vacations.colPlanned')}: {fmtDays(row.planned)}
              </Text>
              <Text style={styles.small}>
                {t('vacations.colSick')}: {fmtDays(row.sick)}
              </Text>
            </Row>
          </Card>
        ))}
        <Text style={[styles.small, { marginTop: 4 }]}>{t('vacations.countingNote')}</Text>
      </ScrollView>
      <Fab onPress={() => openNew(selectedDay)} />

      <Sheet
        visible={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? t('vacations.editAbsence') : t('vacations.newAbsence')}
        actionLabel={canEdit ? t('vacations.save') : undefined}
        onAction={canEdit ? save : undefined}
        actionLoading={saving}
      >
        {form ? (
          <>
            {!canEdit ? <Text style={{ color: colors.orange, marginBottom: 12 }}>{t('vacations.readOnly', { name: form.user_name })}</Text> : null}
            {isAdmin ? (
              <Select
                label={t('vacations.person')}
                value={form.user_id}
                options={summary.map((u) => ({ value: u.user_id, label: u.user_name }))}
                onChange={(v) => setForm({ ...form, user_id: v })}
              />
            ) : null}
            <Text style={styles.label}>{t('vacations.type')}</Text>
            <Segmented
              options={['vacation', 'sick', 'other'].map((v) => ({ value: v, label: `${typeIcon[v]} ${t(`vacations.type_${v}`)}` }))}
              value={form.type}
              onChange={(v) => canEdit && setForm({ ...form, type: v })}
              style={{ marginBottom: 14 }}
            />
            <DateField
              label={t('vacations.from')}
              value={form.start_date}
              onChange={(v) => canEdit && setForm({ ...form, start_date: v, end_date: form.end_date < v ? v : form.end_date })}
            />
            <DateField label={t('vacations.to')} value={form.end_date} minimumDate={form.start_date} onChange={(v) => canEdit && setForm({ ...form, end_date: v })} />
            {form.start_date === form.end_date ? (
              <SwitchRow label={t('vacations.halfDay')} value={form.half_day} onValueChange={(v) => canEdit && setForm({ ...form, half_day: v })} />
            ) : null}
            <Input label={t('vacations.note')} value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} placeholder={t('vacations.notePlaceholder')} editable={!!canEdit} />
            <Text style={[styles.subtitle, { marginBottom: 14 }]}>
              {t('vacations.workingDays', {
                count: fmtDays(workingDays(form.start_date, form.end_date, form.half_day && form.start_date === form.end_date, holidayMap)),
              })}
            </Text>
            {form.id && canEdit ? <Button title={t('vacations.delete')} variant='dangerOutline' onPress={remove} /> : null}
          </>
        ) : null}
      </Sheet>

      <Sheet
        visible={!!allowanceEdit}
        onClose={() => setAllowanceEdit(null)}
        title={`${t('vacations.colAllowance')} ${year}: ${allowanceEdit?.name || ''}`}
        actionLabel={t('common.save')}
        onAction={saveAllowance}
      >
        {allowanceEdit ? (
          <Input
            label={t('vacations.allowanceHint')}
            value={allowanceEdit.value}
            onChangeText={(v) => setAllowanceEdit({ ...allowanceEdit, value: v })}
            keyboardType='decimal-pad'
            autoFocus
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const StyleSheetHair = 0.5;
