import React from 'react';
import { Linking } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { Button, Row } from './ui';

// Call / e-mail / map buttons for a contact record.
const ContactActions = ({ tel, email, address }) => {
  const { t } = useLanguage();
  if (!tel && !email && !address) return null;
  return (
    <Row style={{ flexWrap: 'wrap', marginBottom: 10 }}>
      {tel ? <Button title={t('mobile.call')} icon='📞' small variant='secondary' onPress={() => Linking.openURL(`tel:${tel.replace(/\s/g, '')}`)} /> : null}
      {email ? <Button title={t('mobile.sendEmail')} icon='✉️' small variant='secondary' onPress={() => Linking.openURL(`mailto:${email}`)} /> : null}
      {address ? (
        <Button
          title='Maps'
          icon='📍'
          small
          variant='secondary'
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
        />
      ) : null}
    </Row>
  );
};

export default ContactActions;
