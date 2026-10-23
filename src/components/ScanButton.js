import React, { useState } from 'react';
import { Button } from './ui';
import ScanModal from './ScanModal';

// Camera button that opens the scanner and hands back the scanned code.
// mode: 'barcode' (article barcodes / order numbers) or 'text' (serial plates).
const ScanButton = ({ onScanned, mode = 'barcode', title = '📷', icon, variant = 'secondary', small = true, style, disabled }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button title={title} icon={icon} small={small} variant={variant} style={style} disabled={disabled} onPress={() => setOpen(true)} />
      <ScanModal
        visible={open}
        initialMode={mode}
        onClose={() => setOpen(false)}
        onScanned={(code) => {
          setOpen(false);
          // Let the camera modal close before whatever comes next opens.
          setTimeout(() => onScanned(code), 350);
        }}
      />
    </>
  );
};

export default ScanButton;
