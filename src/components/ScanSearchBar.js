import React from 'react';
import { Row, SearchBar } from './ui';
import ScanButton from './ScanButton';

// Search bar with a camera button: the scanned code becomes the search text
// (or goes to onScanned when given).
const ScanSearchBar = ({ value, onChangeText, placeholder, right, scanMode = 'barcode', onScanned }) => (
  <SearchBar
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    right={
      <Row gap={6}>
        <ScanButton mode={scanMode} style={{ height: 42 }} onScanned={(code) => (onScanned ? onScanned(code) : onChangeText(code))} />
        {right}
      </Row>
    }
  />
);

export default ScanSearchBar;
