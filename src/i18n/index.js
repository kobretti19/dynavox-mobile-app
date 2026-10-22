import common from './locales/common';
import nav from './locales/nav';
import login from './locales/login';
import dashboard from './locales/dashboard';
import equipment from './locales/equipment';
import equipmentReport from './locales/equipmentReport';
import equipmentDetails from './locales/equipmentDetails';
import equipmentTable from './locales/equipmentTable';
import equipmentTemplates from './locales/equipmentTemplates';
import componentStock from './locales/componentStock';
import templateSelector from './locales/templateSelector';
import stockMovements from './locales/stockMovements';
import partsListTable from './locales/partsListTable';
import partSelector from './locales/partSelector';
import orders from './locales/orders';
import orderDetails from './locales/orderDetails';
import orderPartsReport from './locales/orderPartsReport';
import parts from './locales/parts';
import partsTable from './locales/partsTable';
import searchCreateSelect from './locales/searchCreateSelect';
import repairs from './locales/repairs';
import repairReport from './locales/repairReport';
import partDetails from './locales/partDetails';
import customers from './locales/customers';
import customerDetails from './locales/customerDetails';
import dealers from './locales/dealers';
import dealerDetails from './locales/dealerDetails';
import devices from './locales/devices';
import deviceDetails from './locales/deviceDetails';
import users from './locales/users';
import detailDrawer from './locales/detailDrawer';
import profileSettingsModal from './locales/profileSettingsModal';
import emptyState from './locales/emptyState';
import filterBar from './locales/filterBar';
import productionTasks from './locales/productionTasks';
import vacations from './locales/vacations';
import mobile from './locales/mobile';

// Each locale module exports { en: {...}, de: {...} } for one namespace.
// Add new page/component namespaces here as they're translated.
const namespaces = {
  common,
  nav,
  login,
  dashboard,
  equipment,
  equipmentReport,
  equipmentDetails,
  equipmentTable,
  equipmentTemplates,
  componentStock,
  templateSelector,
  stockMovements,
  partsListTable,
  partSelector,
  orders,
  orderDetails,
  orderPartsReport,
  parts,
  partsTable,
  searchCreateSelect,
  repairs,
  repairReport,
  partDetails,
  customers,
  customerDetails,
  dealers,
  dealerDetails,
  devices,
  deviceDetails,
  users,
  detailDrawer,
  profileSettingsModal,
  emptyState,
  filterBar,
  productionTasks,
  vacations,
  mobile,
};

const build = (lang) =>
  Object.fromEntries(
    Object.entries(namespaces).map(([key, mod]) => [key, mod[lang]])
  );

export const translations = {
  en: build('en'),
  de: build('de'),
};

export const SUPPORTED_LANGUAGES = ['en', 'de'];
