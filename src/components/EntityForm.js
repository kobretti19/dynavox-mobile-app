import React, { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Button, Input, Sheet, showError } from './ui';
import ScanModal from './ScanModal';

// Simple create/edit sheet for flat records (customers, dealers, devices,
// users...). fields: [{ key, label, required?, keyboardType?, multiline?,
// autoCapitalize?, secure?, hint? }]
const EntityForm = ({ visible, title, fields, initial, onClose, onSubmit, children, extraValues }) => {
  const { t } = useLanguage();
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [scanKey, setScanKey] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const v = {};
    fields.forEach((f) => {
      v[f.key] = initial?.[f.key] ?? '';
    });
    setValues(v);
    // fields is rebuilt on every render by callers -- only reset on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial]);

  const save = async () => {
    const missing = fields.find((f) => f.required && !String(values[f.key] || '').trim());
    if (missing) {
      showError(t('common.error'), `${missing.label}: ${t('common.requiredField')}`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...values, ...(extraValues || {}) });
    } catch (err) {
      showError(t('common.error'), t('mobile.saveFailed', { error: errorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title} actionLabel={t('common.save')} onAction={save} actionLoading={saving}>
      {fields.map((f) => (
        <Input
          key={f.key}
          label={`${f.label}${f.required ? ' *' : ''}`}
          value={String(values[f.key] ?? '')}
          onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
          keyboardType={f.keyboardType}
          multiline={f.multiline}
          autoCapitalize={f.autoCapitalize}
          secureTextEntry={f.secure}
          autoCorrect={f.autoCorrect ?? !f.keyboardType}
          hint={f.hint}
          placeholder={f.placeholder}
        />
      )).reduce((acc, input, i) => {
        acc.push(input);
        // Fields marked scannable get a camera button (serial numbers...).
        if (fields[i].scannable) {
          acc.push(
            <Button
              key={`${fields[i].key}-scan`}
              title={t('mobile.scanSerial')}
              icon='📷'
              small
              variant='secondary'
              style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 14 }}
              onPress={() => setScanKey(fields[i].key)}
            />,
          );
        }
        return acc;
      }, [])}
      <ScanModal
        visible={!!scanKey}
        onClose={() => setScanKey(null)}
        onScanned={(code) => {
          setValues((prev) => ({ ...prev, [scanKey]: code }));
          setScanKey(null);
        }}
      />
      {children}
    </Sheet>
  );
};

export default EntityForm;
