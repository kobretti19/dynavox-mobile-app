import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Input, Segmented } from '../components/ui';
import { colors } from '../theme';

export default function Login() {
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!loginName || !password) return;
    setLoading(true);
    setError('');
    const result = await login(loginName.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps='handled'>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Image source={require('../../assets/logo.png')} style={{ width: 80, height: 80, borderRadius: 18 }} />
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 16 }}>{t('login.title')}</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>{t('login.subtitle')}</Text>
        </View>
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
          {error ? (
            <View style={{ backgroundColor: colors.redBg, padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ color: colors.red }}>{error}</Text>
            </View>
          ) : null}
          <Input
            label={t('login.loginName')}
            value={loginName}
            onChangeText={setLoginName}
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='username'
            autoComplete='username'
            returnKeyType='next'
          />
          <Input
            label={t('login.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType='password'
            autoComplete='password'
            returnKeyType='go'
            onSubmitEditing={submit}
          />
          <Button title={loading ? t('login.signingIn') : t('login.signIn')} onPress={submit} loading={loading} style={{ marginTop: 6 }} />
        </View>
        <Segmented
          style={{ marginTop: 24, alignSelf: 'center', width: 180 }}
          options={[
            { value: 'en', label: 'English' },
            { value: 'de', label: 'Deutsch' },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
