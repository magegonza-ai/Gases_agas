import axios from 'axios';

// Detectar si estamos en Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// En desarrollo (Vite dev server), usar /api para aprovechar el proxy de Vite
// En Electron/producción, usar la URL absoluta del backend
const getBaseURL = async () => {
  if (isElectron) {
    return await window.electronAPI.getBackendUrl() + '/api';
  }
  // En desarrollo (Vite), usar /api para que el proxy funcione
  return '/api';
};

// Crear instancia de axios con URL dinámica
const createApi = async () => {
  const baseURL = await getBaseURL();
  return axios.create({ 
    baseURL, 
    headers: { 'Content-Type': 'application/json' } 
  });
};

// Cache de la instancia
let apiInstance = null;
let apiPromise = null;

const getApi = async () => {
  if (apiInstance) return apiInstance;
  if (apiPromise) return apiPromise;
  apiPromise = createApi().then(instance => {
    apiInstance = instance;
    return instance;
  });
  return apiPromise;
};

// Helper para hacer llamadas a la API
const apiCall = async (method, url, data) => {
  const api = await getApi();
  return api[method](url, data);
};

// Wrapper para mantener compatibilidad con la API anterior
const apiWrapper = {
  get: (url) => apiCall('get', url),
  post: (url, data) => apiCall('post', url, data),
  put: (url, data) => apiCall('put', url, data),
  patch: (url, data) => apiCall('patch', url, data),
  delete: (url) => apiCall('delete', url),
};

// Exportar APIs manteniendo la misma interfaz
export const clientesAPI = {
    getAll: () => apiWrapper.get('/clientes'),
    getById: (id) => apiWrapper.get(`/clientes/${id}`),
    create: (data) => apiWrapper.post('/clientes', data),
    update: (id, data) => apiWrapper.put(`/clientes/${id}`, data),
    delete: (id) => apiWrapper.delete(`/clientes/${id}`),
    search: (term) => apiWrapper.get(`/clientes/search/${term}`),
};

export const trabajadoresAPI = {
    getAll: () => apiWrapper.get('/trabajadores'),
    getById: (id) => apiWrapper.get(`/trabajadores/${id}`),
    getByCargo: (cargo) => apiWrapper.get(`/trabajadores/cargo/${cargo}`),
    getCargos: () => apiWrapper.get('/trabajadores/cargos'),
    create: (data) => apiWrapper.post('/trabajadores', data),
    update: (id, data) => apiWrapper.put(`/trabajadores/${id}`, data),
    delete: (id) => apiWrapper.delete(`/trabajadores/${id}`),
};

export const productosAPI = {
    getAll: () => apiWrapper.get('/productos'),
    getById: (id) => apiWrapper.get(`/productos/${id}`),
    create: (data) => apiWrapper.post('/productos', data),
    update: (id, data) => apiWrapper.put(`/productos/${id}`, data),
    delete: (id) => apiWrapper.delete(`/productos/${id}`),
    getStockAlertas: () => apiWrapper.get('/productos/stock-alertas'),
};

export const envasesAPI = {
    getAll: () => apiWrapper.get('/envases'),
    getById: (id) => apiWrapper.get(`/envases/${id}`),
    getByCodigo: (codigo) => apiWrapper.get(`/envases/codigo/${codigo}`),
    create: (data) => apiWrapper.post('/envases', data),
    update: (id, data) => apiWrapper.put(`/envases/${id}`, data),
    updateEstado: (id, estado) => apiWrapper.patch(`/envases/${id}/estado`, { estado }),
    delete: (id) => apiWrapper.delete(`/envases/${id}`),
    getResumen: () => apiWrapper.get('/envases/resumen'),
    getParaLlenado: () => apiWrapper.get('/envases/para-llenado'),
    getPendientesEntrega: () => apiWrapper.get('/envases/pendientes-entrega'),
    getObservaciones: (id) => apiWrapper.get(`/envases/${id}/observaciones`),
    addObservacion: (id, data) => apiWrapper.post(`/envases/${id}/observaciones`, data),
};

export const recepcionesAPI = {
    getAll: () => apiWrapper.get('/recepciones'),
    getById: (id) => apiWrapper.get(`/recepciones/${id}`),
    create: (data) => apiWrapper.post('/recepciones', data),
    close: (id) => apiWrapper.patch(`/recepciones/${id}/cerrar`),
    siguiente: () => apiWrapper.get('/recepciones/siguiente'),
};

export const ordenesTrabajoAPI = {
    getAll: () => apiWrapper.get('/ordenes-trabajo'),
    getById: (id) => apiWrapper.get(`/ordenes-trabajo/${id}`),
    getPending: () => apiWrapper.get('/ordenes-trabajo/pendientes'),
    create: (data) => apiWrapper.post('/ordenes-trabajo', data),
    start: (id, idAsignado) => apiWrapper.patch(`/ordenes-trabajo/${id}/iniciar`, { id_asignado: idAsignado }),
    registroAvance: (id, detalle) => apiWrapper.patch(`/ordenes-trabajo/${id}/registro`, { detalle }),
    complete: (id, data) => apiWrapper.patch(`/ordenes-trabajo/${id}/completar`, data),
    cancel: (id) => apiWrapper.patch(`/ordenes-trabajo/${id}/cancelar`),
};

export const llenadosAPI = {
    getAll: () => apiWrapper.get('/llenados'),
    getPendientes: () => apiWrapper.get('/llenados/pendientes'),
    getEnTransito: () => apiWrapper.get('/llenados/en-transito'),
    getHistorial: () => apiWrapper.get('/llenados/historial'),
    create: (data) => apiWrapper.post('/llenados', data),
};

export const plantasExternasAPI = {
    getAll: () => apiWrapper.get('/plantas-externas'),
    getAllIncluyendoInactivas: () => apiWrapper.get('/plantas-externas/todas'),
    getById: (id) => apiWrapper.get(`/plantas-externas/${id}`),
    create: (data) => apiWrapper.post('/plantas-externas', data),
    update: (id, data) => apiWrapper.put(`/plantas-externas/${id}`, data),
    delete: (id) => apiWrapper.delete(`/plantas-externas/${id}`),
};

export const guiasDespachoAPI = {
    getAll: () => apiWrapper.get('/guias-despacho'),
    getById: (id) => apiWrapper.get(`/guias-despacho/${id}`),
    getByDetalleRecepcion: (idDetalle) => apiWrapper.get(`/guias-despacho/detalle/${idDetalle}`),
    create: (data) => apiWrapper.post('/guias-despacho', data),
    update: (id, data) => apiWrapper.put(`/guias-despacho/${id}`, data),
    recibirEnPlanta: (id) => apiWrapper.patch(`/guias-despacho/${id}/recibir`),
    retornarDePlanta: (id, data) => apiWrapper.patch(`/guias-despacho/${id}/retornar`, data),
};

export const entregasAPI = {
    getAll: () => apiWrapper.get('/entregas'),
    getById: (id) => apiWrapper.get(`/entregas/${id}`),
    getParaEntregar: (idCliente) => apiWrapper.get(`/entregas/para-entregar/${idCliente}`),
    create: (data) => apiWrapper.post('/entregas', data),
};

export const transaccionesAPI = {
    getAll: () => apiWrapper.get('/transacciones'),
    getById: (id) => apiWrapper.get(`/transacciones/${id}`),
    getDetalle: (id) => apiWrapper.get(`/transacciones/${id}/detalle`),
    create: (data, detalle) => apiWrapper.post('/transacciones', { ...data, detalle }),
    update: (id, data) => apiWrapper.put(`/transacciones/${id}`, data),
    anular: (id) => apiWrapper.patch(`/transacciones/${id}/anular`),
    getByFecha: (inicio, fin) => apiWrapper.get(`/transacciones/fecha/${inicio}/${fin}`),
    getByCliente: (id) => apiWrapper.get(`/transacciones/cliente/${id}`),
    getResumenDiario: () => apiWrapper.get('/transacciones/resumen-diario'),
};

// Certificados de baja: cilindros dados de baja por prueba hidráulica rechazada en local
export const certificadosBajaAPI = {
    getAll: () => apiWrapper.get('/certificados-baja'),
    getById: (id) => apiWrapper.get(`/certificados-baja/${id}`),
    getByEnvase: (idEnvase) => apiWrapper.get(`/certificados-baja/envase/${idEnvase}`),
};

// Sistema: rutina de salida (cierra el programa)
export const systemAPI = {
    shutdown: () => apiWrapper.post('/system/shutdown'),
};

export default apiWrapper;
