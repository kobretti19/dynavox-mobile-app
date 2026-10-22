import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { Button, Row, Select, styles } from './ui';
import { colors } from '../theme';

// Editable list of { id, quantity } rows (parts of a template / equipment,
// components of a template...). `options` = [{ value, label, sublabel }].
const PartsPicker = ({ label, rows, onChange, options, placeholder, unitLabel }) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState('1');
  const byId = Object.fromEntries(options.map((o) => [String(o.value), o]));

  const add = () => {
    if (!selected) return;
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const existing = rows.find((r) => String(r.id) === String(selected));
    if (existing) onChange(rows.map((r) => (String(r.id) === String(selected) ? { ...r, quantity: r.quantity + q } : r)));
    else onChange([...rows, { id: selected, quantity: q }]);
    setSelected(null);
    setQty('1');
  };

  const setRowQty = (id, delta) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, quantity: Math.max(1, r.quantity + delta) } : r)));

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>
        {label} ({rows.length})
      </Text>
      {rows.map((r) => {
        const o = byId[String(r.id)];
        return (
          <Row key={String(r.id)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>
                {o?.label || `#${r.id}`}
              </Text>
              {o?.sublabel ? <Text style={styles.small}>{o.sublabel}</Text> : null}
            </View>
            <Pressable onPress={() => setRowQty(r.id, -1)} hitSlop={8}>
              <Text style={{ fontSize: 20, color: colors.gray, paddingHorizontal: 6 }}>−</Text>
            </Pressable>
            <Text style={{ fontWeight: '800', minWidth: 28, textAlign: 'center' }}>
              {r.quantity}
              {unitLabel || ''}
            </Text>
            <Pressable onPress={() => setRowQty(r.id, 1)} hitSlop={8}>
              <Text style={{ fontSize: 20, color: colors.gray, paddingHorizontal: 6 }}>＋</Text>
            </Pressable>
            <Pressable onPress={() => onChange(rows.filter((x) => x.id !== r.id))} hitSlop={8}>
              <Text style={{ fontSize: 16, color: colors.red, paddingLeft: 6 }}>✕</Text>
            </Pressable>
          </Row>
        );
      })}
      <View style={{ marginTop: 8 }}>
        <Select label='' value={selected} options={options} placeholder={placeholder} onChange={setSelected} />
        {selected ? (
          <Row style={{ marginTop: -6 }}>
            <Button title='−' small variant='secondary' onPress={() => setQty(String(Math.max(1, (parseInt(qty, 10) || 1) - 1)))} />
            <Text style={{ fontWeight: '800', minWidth: 30, textAlign: 'center' }}>{qty}</Text>
            <Button title='＋' small variant='secondary' onPress={() => setQty(String((parseInt(qty, 10) || 1) + 1))} />
            <Button title={t('common.add')} small style={{ flex: 1 }} onPress={add} />
          </Row>
        ) : null}
      </View>
    </View>
  );
};

export default PartsPicker;
