import api, { API_BASE_URL, getToken } from "./client";

// Endpoint wrappers -- same as the web app's src/api/api.js.

// Auth API
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// Parts API (simplified - includes color, category, supplier)
export const partsAPI = {
  getAll: () => api.get("/parts"),
  getById: (id) => api.get(`/parts/${id}`),
  getLowStock: () => api.get("/parts/low-stock"),
  getColors: () => api.get("/parts/colors"),
  getCategories: () => api.get("/parts/categories"),
  getSuppliers: () => api.get("/parts/suppliers"),
  getByCategory: (category) =>
    api.get(`/parts/category/${encodeURIComponent(category)}`),
  getByColor: (color) => api.get(`/parts/color/${encodeURIComponent(color)}`),
  getBySupplier: (supplier) =>
    api.get(`/parts/supplier/${encodeURIComponent(supplier)}`),
  create: (data) => api.post("/parts", data),
  update: (id, data) => api.put(`/parts/${id}`, data),
  updateQuantity: (id, data) => api.patch(`/parts/${id}/quantity`, data),
  delete: (id) => api.delete(`/parts/${id}`),
};

// Equipment API (simplified - brand/category are columns)
export const equipmentAPI = {
  getAll: () => api.get("/equipment"),
  getById: (id) => api.get(`/equipment/${id}`),
  getBrands: () => api.get("/equipment/brands"),
  getCategories: () => api.get("/equipment/categories"),
  create: (data) => api.post("/equipment", data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  addPart: (equipmentId, data) =>
    api.post(`/equipment/${equipmentId}/parts`, data),
  removePart: (equipmentId, partId) =>
    api.delete(`/equipment/${equipmentId}/parts/${partId}`),
  produce: (equipmentId) => api.post(`/equipment/${equipmentId}/produce`),
};

// Equipment Templates API
export const equipmentTemplatesAPI = {
  getAll: () => api.get("/equipment-templates"),
  getById: (id) => api.get(`/equipment-templates/${id}`),
  create: (data) => api.post("/equipment-templates", data),
  createFromEquipment: (data) =>
    api.post("/equipment-templates/from-equipment", data),
  createEquipment: (templateId, data) =>
    api.post(`/equipment-templates/${templateId}/create-equipment`, data),
  update: (id, data) => api.put(`/equipment-templates/${id}`, data),
  delete: (id) => api.delete(`/equipment-templates/${id}`),
  getComponentsStock: () => api.get("/equipment-templates/components/stock"),
  setComponentReadyStock: (templateId, quantity) =>
    api.put(`/equipment-templates/${templateId}/components-stock`, { quantity }),
  getComponentStockMovements: (templateId) =>
    api.get(`/equipment-templates/${templateId}/components-stock/movements`),
};

// Orders API
export const ordersAPI = {
  getAll: () => api.get("/orders"),
  getById: (id) => api.get(`/orders/${id}`),
  getStats: () => api.get("/orders/stats"),
  getPartsSummary: () => api.get("/orders/parts-summary"),
  getBackorderParts: () => api.get("/orders/backorder-parts"),
  create: (data) => api.post("/orders", data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  complete: (id, data) => api.put(`/orders/${id}/complete`, data),
  update: (id, data) => api.patch(`/orders/${id}`, data), // ← only keep this one
  delete: (id) => api.delete(`/orders/${id}`),
  addItem: (orderId, itemData) =>
    api.post(`/orders/${orderId}/items`, itemData),
  updateItem: (itemId, data) => api.patch(`/orders/item/${itemId}`, data),
  deleteItem: (itemId) => api.delete(`/orders/item/${itemId}`),
};

// Stock API
export const stockAPI = {
  getMovements: () => api.get("/stock/movements"),
  getMovementsByPart: (partId) => api.get(`/stock/movements/${partId}`),
  getLevels: () => api.get("/stock/levels"),
  getAlerts: () => api.get("/stock/alerts"),
  getSummary: () => api.get("/stock/summary"),
  addStock: (data) => api.post("/stock/add", data),
  adjustStock: (data) => api.post("/stock/adjust", data),
};

// Users API
export const usersAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// "To produce" notes + navbar notifications
export const productionTasksAPI = {
  getAll: (scope) => api.get("/production-tasks", { params: { scope } }),
  getNotifications: () => api.get("/production-tasks/notifications"),
  create: (data) => api.post("/production-tasks", data),
  updateStatus: (id, status) => api.patch(`/production-tasks/${id}/status`, { status }),
  markRead: (id) => api.patch(`/production-tasks/${id}/read`),
  getComments: (id) => api.get(`/production-tasks/${id}/comments`),
  addComment: (id, body) => api.post(`/production-tasks/${id}/comments`, { body }),
  markAllRead: () => api.post("/production-tasks/read-all"),
  delete: (id) => api.delete(`/production-tasks/${id}`),
};

// Vacation / absence calendar
export const vacationsAPI = {
  getAll: (from, to) => api.get("/vacations", { params: { from, to } }),
  getSummary: (year) => api.get("/vacations/summary", { params: { year } }),
  create: (data) => api.post("/vacations", data),
  update: (id, data) => api.put(`/vacations/${id}`, data),
  delete: (id) => api.delete(`/vacations/${id}`),
  setAllowance: (userId, days) => api.put(`/vacations/allowance/${userId}`, { days }),
  getUserStats: (userId, year) => api.get(`/vacations/user/${userId}`, { params: { year } }),
  getHolidays: (from, to) => api.get("/vacations/holidays", { params: { from, to } }),
  addHolidays: (holidays) => api.post("/vacations/holidays", { holidays }),
  deleteHoliday: (id) => api.delete(`/vacations/holidays/${id}`),
};

// Customers API
export const customersAPI = {
  getAll: () => api.get("/customers"),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Dealers API
export const dealersAPI = {
  getAll: () => api.get("/dealers"),
  getById: (id) => api.get(`/dealers/${id}`),
  create: (data) => api.post("/dealers", data),
  update: (id, data) => api.put(`/dealers/${id}`, data),
  sync: (id) => api.post(`/dealers/${id}/sync`),
  delete: (id) => api.delete(`/dealers/${id}`),
};

// Devices API (serial-number tracking)
export const devicesAPI = {
  getAll: () => api.get("/devices"),
  getById: (id) => api.get(`/devices/${id}`),
  getBySerial: (serial) => api.get(`/devices/by-serial/${encodeURIComponent(serial)}`),
  getRepairs: (id) => api.get(`/devices/${id}/repairs`),
  create: (data) => api.post("/devices", data),
  update: (id, data) => api.put(`/devices/${id}`, data),
  delete: (id) => api.delete(`/devices/${id}`),
};

// Repairs API
export const repairsAPI = {
  getAll: () => api.get("/repairs"),
  getById: (id) => api.get(`/repairs/${id}`),
  getStats: () => api.get("/repairs/stats"),
  create: (data) => api.post("/repairs", data),
  update: (id, data) => api.put(`/repairs/${id}`, data),
  updateStatus: (id, data) => api.put(`/repairs/${id}/status`, data),
  addDevice: (id, data) => api.post(`/repairs/${id}/devices`, data),
  removeDevice: (id, deviceId) => api.delete(`/repairs/${id}/devices/${deviceId}`),
  addAssignee: (id, data) => api.post(`/repairs/${id}/assignees`, data),
  removeAssignee: (id, userId) => api.delete(`/repairs/${id}/assignees/${userId}`),
  addPart: (id, data) => api.post(`/repairs/${id}/parts`, data),
  removePart: (id, partsUsedId) => api.delete(`/repairs/${id}/parts/${partsUsedId}`),
  // Plain URLs (opened in the browser / downloaded) carry the token as ?token=.
  getDocumentUrl: (id, focus) =>
    `${API_BASE_URL}/repairs/${id}/document?focus=${focus}&token=${encodeURIComponent(getToken() || "")}`,
  getShiplabel: (id) => api.get(`/repairs/${id}/shiplabel`),
  delete: (id) => api.delete(`/repairs/${id}`),
  getAttachments: (id) => api.get(`/repairs/${id}/attachments`),
  // formData parts are { uri, name, type } objects (React Native file upload).
  uploadAttachments: (id, formData) =>
    api.post(`/repairs/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data) => data,
      timeout: 120000,
    }),
  deleteAttachment: (id, attachmentId) => api.delete(`/repairs/${id}/attachments/${attachmentId}`),
  getAttachmentUrl: (id, attachmentId) =>
    `${API_BASE_URL}/repairs/${id}/attachments/${attachmentId}/download?token=${encodeURIComponent(getToken() || "")}`,
};


// Push notification device tokens (mobile app only)
export const pushTokensAPI = {
  register: (token, platform) => api.post("/push-tokens", { token, platform }),
  unregister: (token) => api.delete("/push-tokens", { data: { token } }),
};
