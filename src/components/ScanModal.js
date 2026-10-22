import React, { useRef } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui';

// Full-screen camera that returns the first scanned code (e.g. to fill a
// serial number field).
const ScanModal = ({ visible, onClose, onScanned }) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose} onShow={() => (done.current = false)}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {Platform.OS !== 'web' && permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing='back'
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_a', 'upc_e', 'datamatrix', 'itf14'] }}
            onBarcodeScanned={({ data }) => {
              if (done.current || !data) return;
              done.current = true;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onScanned(String(data).trim());
            }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <Text style={{ color: '#FFF', textAlign: 'center', marginBottom: 16 }}>{t('mobile.scanNoPermission')}</Text>
            {Platform.OS !== 'web' ? <Button title={t('mobile.grantPermission')} onPress={requestPermission} /> : null}
          </View>
        )}
        <View pointerEvents='none' style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 260, height: 150, borderWidth: 3, borderColor: '#FFF', borderRadius: 14, opacity: 0.85 }} />
          <Text style={{ color: '#FFF', marginTop: 14 }}>{t('mobile.scanHint')}</Text>
        </View>
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: insets.top + 10, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

export default ScanModal;
