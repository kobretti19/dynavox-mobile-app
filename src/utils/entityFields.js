// Form field definitions shared by list (create) and detail (edit) screens.

export const customerFields = (t) => [
  { key: 'name', label: t('common.name'), required: true },
  { key: 'email', label: t('customers.email'), keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'tel', label: t('customers.phone'), keyboardType: 'phone-pad' },
  { key: 'street', label: t('customers.street') },
  { key: 'house_number', label: t('customers.number') },
  { key: 'zip', label: t('customers.zip'), keyboardType: 'number-pad' },
  { key: 'city', label: t('customers.city') },
];

export const dealerFields = (t) => [
  { key: 'name', label: t('common.name'), required: true },
  { key: 'nickname', label: t('dealers.nickname') },
  { key: 'contact_person', label: t('dealers.contactPerson') },
  { key: 'email', label: t('dealers.email'), keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'tel', label: t('dealers.phone'), keyboardType: 'phone-pad' },
  { key: 'street', label: t('dealers.street') },
  { key: 'zip', label: t('dealers.zip'), keyboardType: 'number-pad' },
  { key: 'city', label: t('dealers.city') },
  { key: 'templateID', label: t('dealers.templateId'), autoCapitalize: 'none', hint: t('dealerDetails.templateSyncNote') },
];

export const deviceFields = (t) => [
  { key: 'serial_number', label: t('devices.serialNumber'), required: true, autoCapitalize: 'characters', autoCorrect: false, scannable: true },
  { key: 'brand', label: t('devices.brand') },
  { key: 'model', label: t('devices.model') },
];
