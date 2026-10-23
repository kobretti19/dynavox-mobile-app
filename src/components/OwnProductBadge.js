import React from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { findOwnProduct } from '../utils/ownProducts';
import { tone } from '../theme';
import { Badge } from './ui';

// Green "our product" / red "not ours" marker for a device serial.
export const ownTone = (equipment, serial) => (findOwnProduct(equipment, serial) ? 'green' : 'red');

const OwnProductBadge = ({ equipment, serial, style }) => {
  const { t } = useLanguage();
  const own = !!findOwnProduct(equipment, serial);
  return <Badge label={own ? `✓ ${t('mobile.ownProduct')}` : `✗ ${t('mobile.foreignProduct')}`} color={own ? 'green' : 'red'} style={style} />;
};

// Red banner for the device form when a scanned serial isn't ours.
export const ForeignNotice = () => {
  const { t } = useLanguage();
  return (
    <View style={{ backgroundColor: tone.red.bg, borderColor: tone.red.color, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 }}>
      <Text style={{ color: tone.red.color, fontWeight: '700' }}>✗ {t('mobile.foreignProduct')}</Text>
      <Text style={{ color: tone.red.color, marginTop: 4 }}>{t('mobile.foreignProductHint')}</Text>
    </View>
  );
};

export default OwnProductBadge;
