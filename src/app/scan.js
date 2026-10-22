import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { devicesAPI, partsAPI, repairsAPI } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { buildReportId, partStatus, repairStatusColor } from '../utils/status';
import { Badge, Button, Card, Row, styles } from '../components/ui';
import { colors } from '../theme';

const norm = (v) => String(v || '').trim().toLowerCase();

// Looks a scanned/typed code up in parts (SKU, article id, name), devices
// (serial number) and repair tickets (displayed ticket number).
const lookup = async (code) => {
  const c = norm(code);
  const [partsRes, devicesRes, repairsRes] = await Promise.allSettled([partsAPI.getAll(), devicesAPI.getAll(), repairsAPI.getAll()]);
  const parts = partsRes.status === 'fulfilled' ? partsRes.value.data.data || [] : [];
  const devices = devicesRes.status === 'fulfilled' ? devicesRes.value.data.data || [] : [];
  const repairs = repairsRes.status === 'fulfilled' ? repairsRes.value.data.data || [] : [];

  const exactParts = parts.filter((p) => norm(p.sku) === c || norm(p.article_id) === c);
  const fuzzyParts = exactParts.length
    ? []
    : parts.filter((p) => c.length >= 3 && [p.sku, p.article_id, p.name].some((f) => norm(f).includes(c))).slice(0, 10);
  const exactDevices = devices.filter((d) => norm(d.serial_number) === c);
  const fuzzyDevices = exactDevices.length
    ? []
    : devices.filter((d) => c.length >= 4 && norm(d.serial_number).includes(c)).slice(0, 10);
  const matchRepairs = repairs.filter((r) => buildReportId(r.id, r.created_at) === String(code).trim() || String(r.id) === String(code).trim());

  return {
    parts: [...exactParts, ...fuzzyParts],
    devices: [...exactDevices, ...fuzzyDevices],
    repairs: matchRepairs,
    exactDevice: exactDevices.length > 0,
  };
};

export default function Scan() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState(null);
  const [manual, setManual] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const locked = useRef(false);

  const search = async (value) => {
    const v = String(value || '').trim();
    if (!v) return;
    locked.current = true;
    setCode(v);
    setSearching(true);
    setResults(null);
    try {
      const r = await lookup(v);
      setResults(r);
      // Exactly one hit -> go straight there.
      const total = r.parts.length + r.devices.length + r.repairs.length;
      if (total === 1) {
        if (r.parts.length) router.replace(`/parts/${r.parts[0].id}`);
        else if (r.devices.length) router.replace(`/devices/${r.devices[0].id}`);
        else router.replace(`/repairs/${r.repairs[0].id}`);
      }
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setCode(null);
    setResults(null);
    setManual('');
    locked.current = false;
  };

  const onScanned = ({ data }) => {
    if (locked.current || !data) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    search(data);
  };

  const cameraAvailable = Platform.OS !== 'web';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {!code && cameraAvailable && permission?.granted ? (
        <CameraView
          style={{ flex: 1 }}
          facing='back'
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_a', 'upc_e', 'datamatrix', 'itf14', 'pdf417'],
          }}
          onBarcodeScanned={onScanned}
        />
      ) : null}

      {!code && cameraAvailable && permission && !permission.granted ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Text style={{ color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>{t('mobile.scanNoPermission')}</Text>
          <Button title={t('mobile.grantPermission')} onPress={requestPermission} />
        </View>
      ) : null}

      {!code ? (
        <>
          {/* Viewfinder frame + hint */}
          {cameraAvailable && permission?.granted ? (
            <View pointerEvents='none' style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 260, height: 180, borderWidth: 3, borderColor: '#FFF', borderRadius: 16, opacity: 0.85 }} />
              <Text style={{ color: '#FFF', marginTop: 16, fontSize: 15, textShadowColor: '#000', textShadowRadius: 4 }}>{t('mobile.scanHint')}</Text>
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <Row>
              <TextInput
                value={manual}
                onChangeText={setManual}
                placeholder={t('mobile.scanTypeManually')}
                placeholderTextColor='#AAA'
                autoCapitalize='characters'
                autoCorrect={false}
                returnKeyType='search'
                onSubmitEditing={() => search(manual)}
                style={[styles.input, { flex: 1 }]}
              />
              <Button title={t('mobile.searchCode')} onPress={() => search(manual)} disabled={!manual.trim()} />
            </Row>
          </View>
        </>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 60, paddingBottom: 40 }}>
          <Text style={[styles.title, { fontSize: 18, marginBottom: 12 }]}>{t('mobile.scanResults', { code })}</Text>
          {searching ? <ActivityIndicator size='large' color={colors.brand} style={{ marginTop: 30 }} /> : null}
          {results && !searching ? (
            <>
              {results.repairs.map((r) => (
                <Card key={`r${r.id}`} onPress={() => router.replace(`/repairs/${r.id}`)}>
                  <Text style={styles.small}>🩹 {t('mobile.scanRepair')}</Text>
                  <Row>
                    <Text style={[styles.title, { flex: 1 }]}>
                      {buildReportId(r.id, r.created_at)} · {r.customer_name || r.dealer_name || ''}
                    </Text>
                    <Badge label={r.status} color={repairStatusColor[r.status]} />
                  </Row>
                </Card>
              ))}
              {results.parts.map((p) => {
                const st = partStatus(p, t);
                return (
                  <Card key={`p${p.id}`} onPress={() => router.replace(`/parts/${p.id}`)}>
                    <Text style={styles.small}>⚙️ {t('mobile.scanPart')}</Text>
                    <Row>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{p.name}</Text>
                        <Text style={styles.small}>{[p.sku, p.color, p.supplier].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800' }}>{p.quantity}</Text>
                        <Badge label={st.label} color={st.color} />
                      </View>
                    </Row>
                  </Card>
                );
              })}
              {results.devices.map((d) => (
                <Card key={`d${d.id}`} onPress={() => router.replace(`/devices/${d.id}`)}>
                  <Text style={styles.small}>🔩 {t('mobile.scanDevice')}</Text>
                  <Text style={styles.title}>{[d.brand, d.model].filter(Boolean).join(' ') || '-'}</Text>
                  <Text style={styles.small}>SN: {d.serial_number}</Text>
                </Card>
              ))}
              {results.parts.length + results.devices.length + results.repairs.length === 0 ? (
                <Text style={[styles.subtitle, { marginBottom: 16 }]}>{t('mobile.scanNothingFound')}</Text>
              ) : null}
              {!results.exactDevice ? (
                <Button
                  title={t('mobile.createDeviceWithSerial')}
                  variant='secondary'
                  style={{ marginTop: 8 }}
                  onPress={async () => {
                    try {
                      const res = await devicesAPI.create({ serial_number: code });
                      router.replace(`/devices/${res.data.data.id}`);
                    } catch {
                      // e.g. duplicate -- stay on the results
                    }
                  }}
                />
              ) : null}
              <Button title={t('mobile.scanAgain')} icon='📷' onPress={reset} style={{ marginTop: 10 }} />
            </>
          ) : null}
        </ScrollView>
      )}

      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: code ? colors.grayBg : 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: code ? colors.text : '#FFF', fontSize: 20 }}>✕</Text>
      </Pressable>
    </View>
  );
}
