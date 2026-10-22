import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { usersAPI } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../utils/useApi';
import { includesQuery } from '../../utils/format';
import { Badge, Button, Card, Empty, ErrorBox, Fab, Loading, Row, SearchBar, Segmented, confirm, showError, styles } from '../../components/ui';
import EntityForm from '../../components/EntityForm';

// Admin-only: login accounts and roles.
export default function Users() {
  const { t } = useLanguage();
  const { user: me, isAdmin } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => usersAPI.getAll());
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [role, setRole] = useState('user');

  const list = useMemo(() => (data || []).filter((u) => includesQuery(q, u.full_name, u.loginName, u.email, u.userType)), [data, q]);

  if (!isAdmin) return <Empty icon='🔒' title={t('nav.users')} />;
  if (loading) return <Loading />;
  if (error && !data) return <ErrorBox message={t('users.errorLoading', { error })} onRetry={refresh} />;

  const fields = [
    { key: 'full_name', label: t('users.fullName'), required: true },
    { key: 'loginName', label: t('users.loginName'), required: true, autoCapitalize: 'none', autoCorrect: false },
    {
      key: 'password',
      label: t('users.password'),
      secure: true,
      autoCapitalize: 'none',
      placeholder: form?.user ? t('users.passwordPlaceholderEdit') : '',
      required: !form?.user,
    },
  ];

  const open = (u) => {
    setRole(u?.userType || 'user');
    setForm({ user: u || null, initial: u ? { full_name: u.full_name || '', loginName: u.loginName || '', password: '' } : null });
  };

  const remove = async (u) => {
    if (u.id === me?.id) {
      showError(t('common.error'), t('users.cantDeleteSelf'));
      return;
    }
    if (!(await confirm(t('users.deleteUser'), t('users.confirmDeletePermanent', { name: u.full_name || u.loginName }), { confirmText: t('common.delete'), cancelText: t('common.cancel') }))) return;
    try {
      await usersAPI.delete(u.id);
      reload();
    } catch (err) {
      showError(t('common.error'), t('mobile.deleteFailed', { error: errorMessage(err) }));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('nav.searchUsers')} />
      <FlatList
        data={list}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<Empty icon='👤' title={t('users.noUsersTitle')} subtitle={t('users.noUsersMessage')} />}
        renderItem={({ item: u }) => (
          <Card onPress={() => open(u)}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {u.full_name || '-'} {u.id === me?.id ? <Text style={styles.small}>{t('users.you')}</Text> : null}
                </Text>
                <Text style={styles.subtitle}>{u.loginName || '-'}</Text>
              </View>
              <Badge label={u.userType === 'admin' ? t('nav.admin') : t('nav.user')} color={u.userType === 'admin' ? 'purple' : 'gray'} />
              {u.id !== me?.id ? <Button title='✕' small variant='dangerOutline' onPress={() => remove(u)} /> : null}
            </Row>
          </Card>
        )}
      />
      <Fab onPress={() => open(null)} />
      <EntityForm
        visible={!!form}
        title={form?.user ? t('users.editUser') : t('users.createUser')}
        fields={fields}
        initial={form?.initial}
        extraValues={{ userType: role }}
        onClose={() => setForm(null)}
        onSubmit={async (values) => {
          const payload = { ...values };
          if (!payload.password) delete payload.password;
          if (form.user) await usersAPI.update(form.user.id, payload);
          else await usersAPI.create(payload);
          setForm(null);
          reload();
        }}
      >
        <Text style={styles.label}>{t('users.role')}</Text>
        <Segmented
          options={[
            { value: 'user', label: t('nav.user') },
            { value: 'admin', label: t('nav.admin') },
          ]}
          value={role}
          onChange={setRole}
        />
      </EntityForm>
    </View>
  );
}
