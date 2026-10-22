import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Field, Sheet, styles } from './ui';
import { colors } from '../theme';
import { formatDate, keyToDate, toKey } from '../utils/format';

// Date picker bound to a 'YYYY-MM-DD' string.
const DateField = ({ label, value, onChange, minimumDate, maximumDate, allowClear, placeholder = '-' }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const current = value ? keyToDate(value) : new Date();

  const picker = (
    <DateTimePicker
      value={draft || current}
      mode='date'
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      minimumDate={minimumDate ? keyToDate(minimumDate) : undefined}
      maximumDate={maximumDate ? keyToDate(maximumDate) : undefined}
      onChange={(event, date) => {
        if (Platform.OS === 'android') {
          setOpen(false);
          if (event.type === 'set' && date) onChange(toKey(date));
        } else if (date) {
          setDraft(date);
        }
      }}
    />
  );

  return (
    <Field label={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => {
            setDraft(null);
            setOpen(true);
          }}
          style={[styles.input, styles.selectBox, { flex: 1 }]}
        >
          <Text style={{ flex: 1, fontSize: 15, color: value ? colors.text : colors.textLight }}>
            {value ? formatDate(value) : placeholder}
          </Text>
          <Text>📅</Text>
        </Pressable>
        {allowClear && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10}>
            <Text style={{ fontSize: 18, color: colors.textLight }}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {open && Platform.OS === 'android' ? picker : null}
      {Platform.OS === 'ios' ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
          {picker}
          <Button
            title='OK'
            onPress={() => {
              onChange(toKey(draft || current));
              setOpen(false);
            }}
            style={{ marginTop: 12 }}
          />
        </Sheet>
      ) : null}
    </Field>
  );
};

export default DateField;
