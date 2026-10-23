import { codeMatches } from './codes';

// "Our" products are the units we built / sold -- the Equipment list,
// matched by serial number. A repair device that isn't in there is foreign.
export const findOwnProduct = (equipment, serial) =>
  serial ? (equipment || []).find((e) => codeMatches(serial, e.serial_number)) || null : null;

// New repair device prefilled from our equipment record.
export const deviceFromOwnProduct = (e) => ({ serial_number: e.serial_number, brand: e.brand || '', model: e.model || '' });

// Device form prefill for a typed / scanned serial.
export const devicePrefill = (equipment, serial) => {
  const own = findOwnProduct(equipment, serial);
  return own ? deviceFromOwnProduct(own) : { serial_number: serial };
};
