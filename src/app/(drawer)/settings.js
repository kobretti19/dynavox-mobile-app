import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, Text } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { authAPI } from '../../api';
import { API_BASE_URL, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card, InfoRow, Input, SectionTitle, Segmented, confirm, showError, styles } from '../../components/ui';
import { colors } from '../../theme';

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { user, updateUser, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [push, setPush] = useState(null);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setPush(p.status === 'granted'))
      .catch(() => setPush(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ full_name: fullName });
      updateUser({ ...user, ...(res.data?.data || res.data?.user || {}), full_name: fullName });
      showError('✓', t('profileSettingsModal.updateSuccess'));
    } catch (err) {
      showError(t('common.error'), `${t('profileSettingsModal.updateFailed')}: ${errorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pw.current) {
      showError(t('common.error'), t('profileSettingsModal.currentPasswordRequired'));
      return;
    }
    if (!pw.next || pw.next !== pw.confirm) {
      showError(t('common.error'), t('profileSettingsModal.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      showError('✓', t('mobile.passwordChanged'));
    } catch (err) {
      showError(t('common.error'), errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} keyboardShouldPersistTaps='handled'>
      <Card>
        <SectionTitle style={{ marginTop: 0 }}>{t('mobile.account')}</SectionTitle>
        <InfoRow label={t('users.loginName')} value={user?.loginName} />
        <InfoRow label={t('users.role')} value={user?.userType === 'admin' ? t('nav.admin') : t('nav.user')} />
        <Input label={t('profileSettingsModal.fullName')} value={fullName} onChangeText={setFullName} style={{ marginTop: 10 }} />
        <Button title={t('profileSettingsModal.saveChanges')} onPress={saveProfile} disabled={saving || fullName === (user?.full_name || '')} />
      </Card>

      <Card>
        <SectionTitle style={{ marginTop: 0 }}>{t('mobile.changePassword')}</SectionTitle>
        <Input label={t('mobile.currentPassword')} value={pw.current} onChangeText={(v) => setPw({ ...pw, current: v })} secureTextEntry autoCapitalize='none' />
        <Input label={t('mobile.newPassword')} value={pw.next} onChangeText={(v) => setPw({ ...pw, next: v })} secureTextEntry autoCapitalize='none' />
        <Input label={t('mobile.confirmPassword')} value={pw.confirm} onChangeText={(v) => setPw({ ...pw, confirm: v })} secureTextEntry autoCapitalize='none' />
        <Button title={t('mobile.changePassword')} variant='secondary' onPress={changePassword} disabled={saving || !pw.next} />
      </Card>

      <Card>
        <SectionTitle style={{ marginTop: 0 }}>{t('mobile.language')}</SectionTitle>
        <Segmented
          options={[
            { value: 'en', label: 'English' },
            { value: 'de', label: 'Deutsch' },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </Card>

      <Card>
        <InfoRow
          label={t('mobile.pushStatus')}
          value={push === null ? '…' : push ? t('mobile.pushOn') : t('mobile.pushOff')}
          valueStyle={{ color: push ? colors.green : colors.orange }}
          onPress={push === false ? () => Linking.openSettings() : undefined}
        />
        <InfoRow label={t('mobile.server')} value={API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '')} />
        <InfoRow label={t('mobile.appVersion')} value={Constants.expoConfig?.version} />
      </Card>

      <Button
        title={t('mobile.logout')}
        variant='dangerOutline'
        onPress={async () => {
          if (await confirm(t('mobile.logout'), t('mobile.confirmLogout'), { confirmText: t('mobile.logout'), cancelText: t('common.cancel') })) logout();
        }}
      />
      <Text style={[styles.small, { textAlign: 'center', marginTop: 16 }]}>DYNAVOX</Text>
    </ScrollView>
  );
}
