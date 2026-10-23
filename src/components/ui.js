import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, tone } from '../theme';
import { useLanguage } from '../context/LanguageContext';

export const Card = ({ children, style, onPress, onLongPress }) => {
  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

export const Button = ({ title, onPress, variant = 'primary', small, disabled, loading, style, icon }) => {
  const v = buttonVariants[variant] || buttonVariants.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.color} size='small' />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.color }]} numberOfLines={1}>
          {icon ? `${icon} ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const buttonVariants = {
  primary: { bg: colors.brand, border: colors.brand, color: '#FFF' },
  secondary: { bg: '#FFF', border: colors.border, color: colors.text },
  danger: { bg: colors.red, border: colors.red, color: '#FFF' },
  dangerOutline: { bg: '#FFF', border: colors.redBg, color: colors.red },
  success: { bg: colors.green, border: colors.green, color: '#FFF' },
  blue: { bg: colors.blue, border: colors.blue, color: '#FFF' },
};

export const Badge = ({ label, color = 'gray', style }) => {
  const c = tone[color] || tone.gray;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.badgeText, { color: c.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export const Loading = ({ style }) => (
  <View style={[styles.center, style]}>
    <ActivityIndicator size='large' color={colors.brand} />
  </View>
);

export const Empty = ({ icon = '📭', title, subtitle }) => (
  <View style={styles.empty}>
    <Text style={{ fontSize: 40 }}>{icon}</Text>
    {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
    {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
  </View>
);

export const ErrorBox = ({ message, onRetry }) => (
  <View style={styles.empty}>
    <Text style={{ fontSize: 36 }}>⚠️</Text>
    <Text style={[styles.emptySub, { color: colors.red }]}>{message}</Text>
    {onRetry ? <Button title='↻' onPress={onRetry} variant='secondary' small style={{ marginTop: 12 }} /> : null}
  </View>
);

export const SearchBar = ({ value, onChangeText, placeholder, right }) => (
  <View style={styles.searchWrap}>
    <View style={styles.searchBox}>
      <Text style={{ color: colors.textLight, marginRight: 6 }}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize='none'
        clearButtonMode='while-editing'
        returnKeyType='search'
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Text style={{ color: colors.textLight, fontSize: 16 }}>✕</Text>
        </Pressable>
      ) : null}
    </View>
    {right}
  </View>
);

export const Field = ({ label, children, hint, style }) => (
  <View style={[{ marginBottom: 14 }, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    {children}
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

export const Input = ({ label, hint, style, multiline, ...props }) => (
  <Field label={label} hint={hint}>
    <TextInput
      placeholderTextColor={colors.textLight}
      style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }, style]}
      multiline={multiline}
      {...props}
    />
  </Field>
);

export const NumberInput = ({ value, onChange, ...props }) => (
  <Input
    keyboardType='decimal-pad'
    value={value === null || value === undefined ? '' : String(value)}
    onChangeText={(txt) => onChange(txt.replace(',', '.'))}
    {...props}
  />
);

export const SwitchRow = ({ label, value, onValueChange }) => (
  <View style={styles.switchRow}>
    <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>{label}</Text>
    <Switch value={!!value} onValueChange={onValueChange} trackColor={{ true: colors.brand }} />
  </View>
);

// Segmented control, e.g. tabs or a status picker.
export const Segmented = ({ options, value, onChange, style, scroll }) => {
  const content = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        onPress={() => onChange(o.value)}
        style={[styles.segment, active && styles.segmentActive, !scroll && { flex: 1 }]}
      >
        <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.segmented, style]}>
        {content}
      </ScrollView>
    );
  }
  return <View style={[styles.segmented, style]}>{content}</View>;
};

// Label / value line inside detail cards.
export const InfoRow = ({ label, value, onPress, valueStyle }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {typeof value === 'string' || typeof value === 'number' || value === null || value === undefined ? (
      <Text style={[styles.infoValue, onPress && { color: colors.blue }, valueStyle]} selectable>
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </Text>
    ) : (
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{value}</View>
    )}
  </Pressable>
);

export const SectionTitle = ({ children, right, style }) => (
  <View style={[styles.sectionTitleRow, style]}>
    <Text style={styles.sectionTitle}>{children}</Text>
    {right}
  </View>
);

export const Row = ({ children, style, gap = 8 }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

// Full-screen form/sheet with a header (close, title, optional action).
// On Android the app is edge-to-edge, so the window doesn't shrink for the
// keyboard: the top-most open sheet pads itself by the part the keyboard
// covers and scrolls the focused input into view. Only window coordinates
// are used, since sheets stacked on top of each other live in separate
// native windows.
const openSheets = [];
const useAndroidKeyboard = (visible, rootRef, scrollRef, scrollY) => {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return undefined;
    const id = {};
    openSheets.push(id);
    const isTop = () => openSheets[openSheets.length - 1] === id;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!isTop() || typeof rootRef.current?.measureInWindow !== 'function') return;
      const kbTop = e.endCoordinates.screenY;
      rootRef.current.measureInWindow((x, y, w, h) => {
        setOverlap(Math.max(0, y + h - kbTop));
        setTimeout(() => {
          try {
            const input = TextInput.State.currentlyFocusedInput?.();
            if (!input?.measureInWindow || !scrollRef.current) return;
            input.measureInWindow((ix, iy, iw, ih) => {
              // Input bottom should end up a bit above the keyboard.
              const hidden = iy + Math.min(ih, 160) + 24 - kbTop;
              if (hidden > 0) scrollRef.current?.scrollTo({ y: scrollY.current + hidden, animated: true });
            });
          } catch {
            // best effort only
          }
        }, 150);
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
      const i = openSheets.indexOf(id);
      if (i >= 0) openSheets.splice(i, 1);
      setOverlap(0);
    };
  }, [visible, rootRef, scrollRef, scrollY]);
  return overlap;
};

export const Sheet = ({ visible, onClose, title, children, actionLabel, onAction, actionLoading, scroll = true }) => {
  const insets = useSafeAreaInsets();
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  const kb = useAndroidKeyboard(visible, rootRef, scrollRef, scrollY);
  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View ref={rootRef} collapsable={false} style={{ flex: 1, paddingBottom: kb }}>
          <View style={[styles.sheetHeader, Platform.OS === 'android' && { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onClose} hitSlop={12} style={{ minWidth: 60 }}>
              <Text style={{ fontSize: 22, color: colors.textMuted }}>✕</Text>
            </Pressable>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={{ minWidth: 60, alignItems: 'flex-end' }}>
              {onAction ? (
                actionLoading ? (
                  <ActivityIndicator color={colors.brand} />
                ) : (
                  <Pressable onPress={onAction} hitSlop={12}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand }}>{actionLabel}</Text>
                  </Pressable>
                )
              ) : null}
            </View>
          </View>
          {scroll ? (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
              keyboardShouldPersistTaps='handled'
              onScroll={(e) => {
                scrollY.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={32}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Tap-to-open picker with search. options: [{ value, label, sublabel? }]
export const Select = ({
  label,
  value,
  options,
  onChange,
  placeholder = '-',
  searchPlaceholder,
  allowClear,
  allowCustom,
  onCreate,
  createLabel,
  hint,
  disabled,
}) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) setQ('');
  }, [open]);
  const selected = options.find((o) => String(o.value) === String(value));
  const query = q.trim().toLowerCase();
  const filtered = query
    ? options.filter((o) => `${o.label} ${o.sublabel || ''}`.toLowerCase().includes(query))
    : options;
  const shownLabel = selected ? selected.label : value && allowCustom ? String(value) : null;

  return (
    <Field label={label} hint={hint}>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.input, styles.selectBox, disabled && { opacity: 0.5 }]}
      >
        <Text style={{ flex: 1, color: shownLabel ? colors.text : colors.textLight, fontSize: 15 }} numberOfLines={1}>
          {shownLabel || placeholder}
        </Text>
        <Text style={{ color: colors.textLight }}>▾</Text>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label || placeholder} scroll={false}>
        <View style={{ padding: 12 }}>
          <View style={styles.pickerSearchBox}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={searchPlaceholder || `🔍 ${t('common.search')}…`}
              placeholderTextColor={colors.textLight}
              style={styles.searchInput}
              autoFocus={options.length > 8}
              autoCorrect={false}
              autoCapitalize='none'
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.value)}
          keyboardShouldPersistTaps='handled'
          ListHeaderComponent={
            <>
              {allowClear && value !== null && value !== undefined && value !== '' ? (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(null, null);
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: colors.red }}>✕ {placeholder}</Text>
                </Pressable>
              ) : null}
              {(allowCustom || onCreate) && q.trim() && !options.some((o) => o.label.toLowerCase() === query) ? (
                <Pressable
                  style={styles.option}
                  onPress={async () => {
                    const text = q.trim();
                    setOpen(false);
                    if (onCreate) {
                      try {
                        const created = await onCreate(text);
                        if (created !== undefined && created !== null) onChange(created, null);
                      } catch (err) {
                        Alert.alert('Error', err?.response?.data?.error || err?.message || 'Error');
                      }
                    } else {
                      onChange(text, null);
                    }
                  }}
                >
                  <Text style={{ color: colors.blue }}>
                    ＋ {createLabel ? `${createLabel}: ` : ''}„{q.trim()}“
                  </Text>
                </Pressable>
              ) : null}
            </>
          }
          renderItem={({ item }) => {
            const active = String(item.value) === String(value);
            return (
              <Pressable
                style={[styles.option, active && { backgroundColor: colors.brandLight }]}
                onPress={() => {
                  onChange(item.value, item);
                  setOpen(false);
                }}
              >
                <Text style={{ fontSize: 15, color: colors.text, fontWeight: active ? '700' : '400' }}>{item.label}</Text>
                {item.sublabel ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{item.sublabel}</Text> : null}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </Field>
  );
};

// Pick several options (chips). value: array of option values.
export const MultiSelect = ({ label, value = [], options, onChange, placeholder = '-', hint }) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const selected = options.filter((o) => value.includes(o.value));
  const query = q.trim().toLowerCase();
  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query)) : options;
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Field label={label} hint={hint}>
      <Pressable onPress={() => setOpen(true)} style={[styles.input, styles.selectBox, { flexWrap: 'wrap', gap: 6 }]}>
        {selected.length === 0 ? (
          <Text style={{ flex: 1, color: colors.textLight, fontSize: 15 }}>{placeholder}</Text>
        ) : (
          selected.map((o) => <Badge key={String(o.value)} label={o.label} color='blue' />)
        )}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} actionLabel='OK' onAction={() => setOpen(false)} scroll={false}>
        <View style={{ padding: 12 }}>
          <View style={styles.pickerSearchBox}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={`🔍 ${t('common.search')}…`}
              placeholderTextColor={colors.textLight}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize='none'
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.value)}
          keyboardShouldPersistTaps='handled'
          renderItem={({ item }) => {
            const active = value.includes(item.value);
            return (
              <Pressable style={[styles.option, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => toggle(item.value)}>
                <Text style={{ fontSize: 18, marginRight: 10, color: active ? colors.brand : colors.textLight }}>{active ? '☑' : '☐'}</Text>
                <Text style={{ fontSize: 15, color: colors.text, fontWeight: active ? '700' : '400' }}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </Sheet>
    </Field>
  );
};

export const confirm = (title, message, { confirmText = 'OK', cancelText = 'Cancel', destructive = true } = {}) =>
  new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });

export const showError = (title, message) => Alert.alert(title, message);

// Floating action button ("+") bottom right.
export const Fab = ({ onPress, icon = '＋', style }) => {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20 }, pressed && { opacity: 0.85 }, style]}
    >
      <Text style={{ color: '#FFF', fontSize: 28, lineHeight: 30 }}>{icon}</Text>
    </Pressable>
  );
};

export const StatTile = ({ label, value, color = colors.text, icon, onPress, style }) => (
  <Card onPress={onPress} style={[{ flex: 1, padding: 12, marginBottom: 0 }, style]}>
    <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
      {icon ? `${icon} ` : ''}
      {label}
    </Text>
    <Text style={{ fontSize: 22, fontWeight: '700', color, marginTop: 2 }}>{value}</Text>
  </Card>
);

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
  },
  // Search box stacked in a column (picker sheets). No flex here at all:
  // flex: 1 in a column collapses it to zero height on Android/iOS.
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15,
    color: colors.text,
  },
  selectBox: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingVertical: 4 },
  segmented: { flexDirection: 'row', backgroundColor: colors.grayBg, borderRadius: 10, padding: 3, gap: 3 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  segmentText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  segmentTextActive: { color: colors.brand, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  infoLabel: { fontSize: 14, color: colors.textMuted, flexShrink: 0, maxWidth: '45%' },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: '#FFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  listContent: { padding: 12, paddingBottom: 110 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  small: { fontSize: 12, color: colors.textMuted },
});
