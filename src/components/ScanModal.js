import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { serialCandidates } from '../utils/serial';
import { Button, Row, Segmented, styles } from './ui';
import { colors } from '../theme';

// expo-text-extractor is native-only (ML Kit / Apple Vision).
let extractTextFromImage = null;
if (Platform.OS !== 'web') {
  try {
    ({ extractTextFromImage } = require('expo-text-extractor'));
  } catch {
    extractTextFromImage = null;
  }
}

// Full-screen camera that returns a code: either a scanned barcode/QR, or
// text read from a photo (e.g. the serial number printed on a type plate --
// the user picks the right line from what was recognised).
const ScanModal = ({ visible, onClose, onScanned, initialMode = 'text' }) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState(initialMode);
  const [photo, setPhoto] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [reading, setReading] = useState(false);
  const [manual, setManual] = useState('');
  const camera = useRef(null);
  const done = useRef(false);

  const reset = () => {
    done.current = false;
    setPhoto(null);
    setCandidates(null);
    setManual('');
    setReading(false);
  };

  const finish = (value) => {
    const v = String(value || '').trim();
    if (!v) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onScanned(v);
  };

  const capture = async () => {
    if (!camera.current || reading) return;
    setReading(true);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      setPhoto(pic.uri);
      const lines = extractTextFromImage ? await extractTextFromImage(pic.uri) : [];
      setCandidates(serialCandidates(lines));
    } catch {
      setCandidates([]);
    } finally {
      setReading(false);
    }
  };

  const showCamera = Platform.OS !== 'web' && permission?.granted && !photo;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      onRequestClose={onClose}
      onShow={() => {
        reset();
        setMode(initialMode);
      }}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {showCamera ? (
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing='back'
            barcodeScannerSettings={
              mode === 'barcode'
                ? { barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_a', 'upc_e', 'datamatrix', 'itf14', 'pdf417'] }
                : undefined
            }
            onBarcodeScanned={
              mode === 'barcode'
                ? ({ data }) => {
                    if (done.current || !data) return;
                    done.current = true;
                    finish(data);
                  }
                : undefined
            }
          />
        ) : null}

        {Platform.OS !== 'web' && permission && !permission.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <Text style={{ color: '#FFF', textAlign: 'center', marginBottom: 16 }}>{t('mobile.scanNoPermission')}</Text>
            <Button title={t('mobile.grantPermission')} onPress={requestPermission} />
          </View>
        ) : null}

        {/* Viewfinder */}
        {showCamera ? (
          <View pointerEvents='none' style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 280, height: mode === 'barcode' ? 150 : 110, borderWidth: 3, borderColor: '#FFF', borderRadius: 14, opacity: 0.85 }} />
            <Text style={{ color: '#FFF', marginTop: 14, textAlign: 'center', paddingHorizontal: 30, textShadowColor: '#000', textShadowRadius: 4 }}>
              {mode === 'barcode' ? t('mobile.scanHint') : t('mobile.ocrHint')}
            </Text>
          </View>
        ) : null}

        {/* Photo taken -> pick the recognised serial */}
        {photo ? (
          <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 64, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps='handled'>
            <Image source={{ uri: photo }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 14 }} resizeMode='cover' />
            {reading || candidates === null ? (
              <ActivityIndicator size='large' color={colors.brand} />
            ) : (
              <>
                <Text style={[styles.title, { marginBottom: 8 }]}>{candidates.length ? t('mobile.ocrPick') : t('mobile.ocrNothing')}</Text>
                {candidates.slice(0, 12).map((c, i) => (
                  <Pressable
                    key={c}
                    onPress={() => finish(c)}
                    onLongPress={() => setManual(c)}
                    style={({ pressed }) => ({
                      padding: 14,
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: i === 0 ? colors.brand : '#FFF',
                      borderWidth: 1,
                      borderColor: i === 0 ? colors.brand : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: 0.5, color: i === 0 ? '#FFF' : colors.text }} selectable>
                      {c}
                    </Text>
                  </Pressable>
                ))}
                {candidates.length ? <Text style={[styles.small, { marginBottom: 12 }]}>{t('mobile.ocrEditHint')}</Text> : null}
                <Row style={{ marginBottom: 12 }}>
                  <TextInput
                    value={manual}
                    onChangeText={setManual}
                    placeholder={t('mobile.scanTypeManually')}
                    placeholderTextColor={colors.textLight}
                    autoCapitalize='characters'
                    autoCorrect={false}
                    style={[styles.input, { flex: 1 }]}
                    onSubmitEditing={() => finish(manual)}
                  />
                  <Button title='OK' onPress={() => finish(manual)} disabled={!manual.trim()} />
                </Row>
                <Button title={t('mobile.ocrRetake')} icon='📷' variant='secondary' onPress={reset} />
              </>
            )}
          </ScrollView>
        ) : null}

        {/* Bottom bar: mode switch + shutter */}
        {!photo ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: 'rgba(0,0,0,0.55)', gap: 14 }}>
            {mode === 'text' && showCamera ? (
              <Pressable
                onPress={capture}
                disabled={reading}
                style={{ alignSelf: 'center', width: 74, height: 74, borderRadius: 37, borderWidth: 5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}
              >
                {reading ? <ActivityIndicator color='#FFF' /> : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' }} />}
              </Pressable>
            ) : null}
            <Row>
              <TextInput
                value={manual}
                onChangeText={setManual}
                placeholder={t('mobile.scanTypeManually')}
                placeholderTextColor='#AAA'
                autoCapitalize='characters'
                autoCorrect={false}
                returnKeyType='done'
                onSubmitEditing={() => finish(manual)}
                style={[styles.input, { flex: 1 }]}
              />
              <Button title='OK' onPress={() => finish(manual)} disabled={!manual.trim()} />
            </Row>
            <Segmented
              options={[
                { value: 'text', label: `🔤 ${t('mobile.modeText')}` },
                { value: 'barcode', label: `▦ ${t('mobile.modeBarcode')}` },
              ]}
              value={mode}
              onChange={(m) => {
                done.current = false;
                setMode(m);
              }}
            />
          </View>
        ) : null}

        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: photo ? colors.grayBg : 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: photo ? colors.text : '#FFF', fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

export default ScanModal;
