import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

export const clientesAPI = {
    getAll: () => api.get('/clientes'),
    getById: (id) => api.get(`/clientes/${id}`),
    create: (data) => api.post('/clientes', data),
    update: (id, data) => api.put(`/clientes/${id}`, data),
    delete: (id) => api.delete(`/clientes/${id}`),
    search: (term) => api.get(`/clientes/search/${term}`),
};

export const trabajadoresAPI = {
    getAll: () => api.get('/trabajadores'),
    getById: (id) => api.get(`/trabajadores/${id}`),
    getByCargo: (cargo) => api.get(`/trabajadores/cargo/${cargo}`),
    getCargos: () => api.get('/trabajadores/cargos'),
    create: (data) => api.post('/trabajadores', data),
    update: (id, data) => api.put(`/trabajadores/${id}`, data),
    delete: (id) => api.delete(`/trabajadores/${id}`),
};

export const productosAPI = {
    getAll: () => api.get('/productos'),
    getById: (id) => api.get(`/productos/${id}`),
    create: (data) => api.post('/productos', data),
    update: (id, data) => api.put(`/productos/${id}`, data),
    delete: (id) => api.delete(`/productos/${id}`),
    getStockAlertas: () => api.get('/productos/stock-alertas'),
};

export const envasesAPI = {
    getAll: () => api.get('/envases'),
    getById: (id) => api.get(`/envases/${id}`),
    getByCodigo: (codigo) => api.get(`/envases/codigo/${codigo}`),
    create: (data) => api.post('/envases', data),
    update: (id, data) => api.put(`/envases/${id}`, data),
    updateEstado: (id, estado) => api.patch(`/envases/${id}/estado`, { estado }),
    delete: (id) => api.delete(`/envases/${id}`),
    getResumen: () => api.get('/envases/resumen'),
    getParaLlenado: () => api.get('/envases/para-llenado'),
    getPendientesEntrega: () => api.get('/envases/pendientes-entrega'),
    getObservaciones: (id) => api.get(`/envases/${id}/observaciones`),
    addObservacion: (id, data) => api.post(`/envases/${id}/observaciones`, data),
};

export const recepcionesAPI = {
    getAll: () => api.get('/recepciones'),
    getById: (id) => api.get(`/recepciones/${id}`),
    create: (data) => api.post('/recepciones', data),
    close: (id) => api.patch(`/recepciones/${id}/cerrar`),
};

export const ordenesTrabajoAPI = {
    getAll: () => api.get('/ordenes-trabajo'),
    getById: (id) => api.get(`/ordenes-trabajo/${id}`),
    getPending: () => api.get('/ordenes-trabajo/pendientes'),
    create: (data) => api.post('/ordenes-trabajo', data),
    start: (id, idAsignado) => api.patch(`/ordenes-trabajo/${id}/iniciar`, { id_asignado: idAsignado }),
    complete: (id, data) => api.patch(`/ordenes-trabajo/${id}/completar`, data),
    cancel: (id) => api.patch(`/ordenes-trabajo/${id}/cancelar`),
};

export const llenadosAPI = {
    getAll: () => api.get('/llenados'),
    getPendientes: () => api.get('/llenados/pendientes'),
    getEnTransito: () => api.get('/llenados/en-transito'),
    getHistorial: () => api.get('/llenados/historial'),
    create: (data) => api.post('/llenados', data),
};

export const plantasExternasAPI = {
    getAll: () => api.get('/plantas-externas'),
    getAllIncluyendoInactivas: () => api.get('/plantas-externas/todas'),
    getById: (id) => api.get(`/plantas-externas/${id}`),
    create: (data) => api.post('/plantas-externas', data),
    update: (id, data) => api.put(`/plantas-externas/${id}`, data),
    delete: (id) => api.delete(`/plantas-externas/${id}`),
};

export const guiasDespachoAPI = {
    getAll: () => api.get('/guias-despacho'),
    getById: (id) => api.get(`/guias-despacho/${id}`),
    getByDetalleRecepcion: (idDetalle) => api.get(`/guias-despacho/detalle/${idDetalle}`),
    create: (data) => api.post('/guias-despacho', data),
    update: (id, data) => api.put(`/guias-despacho/${id}`, data),
    recibirEnPlanta: (id) => api.patch(`/guias-despacho/${id}/recibir`),
    retornarDePlanta: (id) => api.patch(`/guias-despacho/${id}/retornar`),
};

export const entregasAPI = {
    getAll: () => api.get('/entregas'),
    getById: (id) => api.get(`/entregas/${id}`),
    getParaEntregar: (idCliente) => api.get(`/entregas/para-entregar/${idCliente}`),
    create: (data) => api.post('/entregas', data),
};

export default api;
