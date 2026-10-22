// Status -> label/badge color helpers shared by list and detail screens.

export const partStatus = (part, t) => {
  if (part.is_nla) return { label: t('partsTable.nla'), color: 'gray' };
  if (Number(part.quantity) <= 0) return { label: t('partsTable.outOfStock'), color: 'red' };
  if (Number(part.quantity) <= Number(part.min_stock_level)) return { label: t('partsTable.lowStock'), color: 'yellow' };
  return { label: t('partsTable.inStock'), color: 'green' };
};


export const taskItemLabel = (task) => {
  if (task.item_type === 'part') return task.part_name || `#${task.part_id}`;
  if (task.item_type === 'component') return task.component_name || `#${task.template_id}`;
  return task.note || '';
};


// Repair tickets
export const REPAIR_STATUSES = [
  'warten auf Gerät',
  'bereit zur Analyse',
  'warten auf KV',
  'warten auf Ersatzteil',
  'in Reparatur',
  'zu verrechnen',
  'abgeschlossen',
];
export const REPAIR_TYPES = ['Reparatur', 'Kontrolle', 'Ersatzteile'];
export const repairStatusColor = {
  test: 'gray',
  'warten auf Gerät': 'gray',
  'bereit zur Analyse': 'blue',
  'warten auf KV': 'red',
  'warten auf Ersatzteil': 'orange',
  'in Reparatur': 'blue',
  'zu verrechnen': 'yellow',
  abgeschlossen: 'green',
};

// Displayed ticket number: <yy><mm><internal id> (see web utils/reportId.js).
export const buildReportId = (id, createdAt) => {
  const d = new Date(createdAt);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}${id}`;
};

export const deviceLabel = (d) =>
  `${d.serial_number}${d.brand || d.model ? ` — ${[d.brand, d.model].filter(Boolean).join(' ')}` : ''}`;

// Supplier orders
export const orderStatusColor = {
  draft: 'gray',
  pending: 'yellow',
  ordered: 'blue',
  partial: 'orange',
  delivered: 'green',
  completed: 'green',
  cancelled: 'red',
  backorder: 'orange',
  nla: 'gray',
  closed: 'gray',
};
export const CLOSED_ITEM_STATUSES = ['cancelled', 'nla', 'closed'];
