import { useState, useEffect, useMemo } from 'react';
import { Tabs, Tab, Table, Button, Modal, Form, Alert, Badge, Spinner, Card, Row, Col } from 'react-bootstrap';
import { llenadosAPI, trabajadoresAPI, productosAPI } from '../services/api';
import { useTableFilters, TableFilterPanel } from '../components/TableFilters';

const destinoVariant = {
    'Retiro inmediato': 'success',
    'Bodega temporal': 'info',
};

const guiaEstadoVariant = {
    'Enviada': 'warning',
    'Recibida': 'info',
    'Devuelta': 'success',
    'Cancelada': 'danger',
};

const Llenados = () => {
    const [pendientes, setPendientes] = useState([]);
    const [enTransito, setEnTransito] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [llenadores, setLlenadores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [activeTab, setActiveTab] = useState('pendientes');
    const [formData, setFormData] = useState({
        id_llenador: '',
        gas_llenado: '',
        cantidad: '',
        destino: 'Retiro inmediato',
        id_planta_externa: null,
        prueba_hidraulica_resultado: null,
    });

    // Configuración filtros por tab
    const filterConfigs = useMemo(() => ({
        pendientes: {
            searchFields: ['codigo_interno', 'cliente', 'gas_solicitado_nombre', 'planta_externa'],
            dateFields: ['fecha_recepcion'],
            selectFields: ['tipo_llenado', 'prueba_hidraulica', 'requiere_pintura'],
            booleanFields: [],
            selectOptions: {
                tipo_llenado: ['Local', 'Externo'],
                prueba_hidraulica: ['Pendiente', 'Aprobado', 'Rechazado'],
                requiere_pintura: [true, false],
            },
        },
        enTransito: {
            searchFields: ['numero_guia', 'codigo_interno', 'gas', 'cliente', 'planta_externa'],
            dateFields: ['fecha_envio'],
            selectFields: ['estado', 'prueba_hidraulica_resultado'],
            booleanFields: [],
            selectOptions: {
                estado: ['Enviada', 'Recibida', 'Devuelta', 'Cancelada'],
                prueba_hidraulica_resultado: ['Aprobado', 'Rechazado'],
            },
        },
        historial: {
            searchFields: ['codigo_interno', 'gas_nombre', 'llenador_nombre', 'cliente', 'planta_externa'],
            dateFields: ['fecha_llenado'],
            selectFields: ['destino', 'prueba_hidraulica_resultado', 'requiere_pintura'],
            booleanFields: [],
            selectOptions: {
                destino: ['Retiro inmediato', 'Bodega temporal'],
                prueba_hidraulica_resultado: ['Aprobado', 'Rechazado', 'N/A'],
                requiere_pintura: [true, false],
            },
        },
    }), []);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [pendRes, transRes, histRes, trabRes, prodRes] = await Promise.all([
                llenadosAPI.getPendientes(),
                llenadosAPI.getEnTransito(),
                llenadosAPI.getHistorial(),
                trabajadoresAPI.getByCargo('Llenador'),
                productosAPI.getAll(),
            ]);
            setPendientes(pendRes.data);
            setEnTransito(transRes.data);
            setHistorial(histRes.data);
            setLlenadores(trabRes.data.filter(t => t.activo));
            setProductos(prodRes.data.filter(p => Number(p.stock_disponible) > 0));
        } catch (err) {
            setError('Error cargando datos de llenados');
        } finally {
            setLoading(false);
        }
    };

    // Hooks de filtros por tab
    const { filteredData: pendientesFiltrados, handleSearchChange: handleSearchPendientes, handleDateChange: handleDatePendientes, handleSelectChange: handleSelectPendientes, handleBooleanChange: handleBooleanPendientes, clearFilters: clearPendientes, hasActiveFilters: hasFiltersPendientes, filters: filtersPendientes } = useTableFilters(pendientes, filterConfigs.pendientes);
    const { filteredData: enTransitoFiltrados, handleSearchChange: handleSearchTransito, handleDateChange: handleDateTransito, handleSelectChange: handleSelectTransito, handleBooleanChange: handleBooleanTransito, clearFilters: clearTransito, hasActiveFilters: hasFiltersTransito, filters: filtersTransito } = useTableFilters(enTransito, filterConfigs.enTransito);
    const { filteredData: historialFiltrados, handleSearchChange: handleSearchHistorial, handleDateChange: handleDateHistorial, handleSelectChange: handleSelectHistorial, handleBooleanChange: handleBooleanHistorial, clearFilters: clearHistorial, hasActiveFilters: hasFiltersHistorial, filters: filtersHistorial } = useTableFilters(historial, filterConfigs.historial);

    const openModal = (pendiente) => {
        setSeleccionado(pendiente);
        const isExterno = pendiente.tipo_llenado === 'Externo';
        setFormData({
            id_llenador: '',
            gas_llenado: pendiente.gas_solicitado || '',
            cantidad: '',
            destino: 'Retiro inmediato',
            id_planta_externa: isExterno ? pendiente.id_planta_externa : null,
            prueba_hidraulica_resultado: isExterno ? pendiente.prueba_hidraulica : null,
        });
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setSeleccionado(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError('');
        try {
            await llenadosAPI.create({
                id_detalle_recepcion: seleccionado.id_detalle,
                id_envase: seleccionado.id_envase,
                id_llenador: parseInt(formData.id_llenador),
                gas_llenado: parseInt(formData.gas_llenado),
                cantidad: parseFloat(formData.cantidad),
                destino: formData.destino,
                id_planta_externa: formData.id_planta_externa,
                prueba_hidraulica_resultado: formData.prueba_hidraulica_resultado,
            });
            handleClose();
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error registrando llenado');
        } finally {
            setGuardando(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Llenados</h2>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <Tabs defaultActiveKey="pendientes" className="mb-3" onSelect={setActiveTab}>
                <Tab eventKey="pendientes" title={`Pendientes (${pendientesFiltrados.length}/${pendientes.length})`}>
                    <div>
                        <TableFilterPanel
                            filters={filtersPendientes}
                            filteredCount={pendientesFiltrados.length}
                            totalCount={pendientes.length}
                            config={filterConfigs.pendientes}
                            onSearchChange={handleSearchPendientes}
                            onDateChange={handleDatePendientes}
                            onSelectChange={handleSelectPendientes}
                            onBooleanChange={handleBooleanPendientes}
                            onClear={clearPendientes}
                            hasActiveFilters={hasFiltersPendientes}
                        />
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cliente</th>
                                    <th>Gas</th>
                                    <th>Prueba Hidr.</th>
                                    <th>Pintura</th>
                                    <th>Tipo Llenado</th>
                                    <th>Planta Ext.</th>
                                    <th>Comprobante</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendientesFiltrados.length === 0 && (
                                    <tr><td colSpan={9} className="text-center text-muted">
                                        {pendientes.length === 0 ? 'No hay cilindros pendientes de llenado' : 'No hay cilindros que coincidan con los filtros'}
                                    </td></tr>
                                )}
                                {pendientesFiltrados.map(p => (
                                    <tr key={p.id_detalle}>
                                        <td className="fw-bold">{p.codigo_interno}</td>
                                        <td>{p.cliente}</td>
                                        <td>{p.gas_solicitado_nombre}</td>
                                        <td>
                                            <Badge bg={p.prueba_hidraulica === 'Aprobado' ? 'success' : p.prueba_hidraulica === 'Rechazado' ? 'danger' : 'secondary'}>
                                                {p.prueba_hidraulica}
                                            </Badge>
                                        </td>
                                        <td>
                                            {p.requiere_pintura ? <Badge bg="warning">Sí</Badge> : <Badge bg="secondary">No</Badge>}
                                        </td>
                                        <td>
                                            <Badge bg={p.tipo_llenado === 'Externo' ? 'info' : 'primary'}>
                                                {p.tipo_llenado}
                                            </Badge>
                                        </td>
                                        <td>{p.planta_externa || '-'}</td>
                                        <td>{p.numero_comprobante}</td>
                                        <td>
                                            <Button variant="primary" size="sm" onClick={() => openModal(p)}>Llenar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
                <Tab eventKey="enTransito" title={`En Tránsito (${enTransitoFiltrados.length}/${enTransito.length})`}>
                    <div>
                        <TableFilterPanel
                            filters={filtersTransito}
                            filteredCount={enTransitoFiltrados.length}
                            totalCount={enTransito.length}
                            config={filterConfigs.enTransito}
                            onSearchChange={handleSearchTransito}
                            onDateChange={handleDateTransito}
                            onSelectChange={handleSelectTransito}
                            onBooleanChange={handleBooleanTransito}
                            onClear={clearTransito}
                            hasActiveFilters={hasFiltersTransito}
                        />
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Guía N°</th>
                                    <th>Código Cilindro</th>
                                    <th>Gas</th>
                                    <th>Cliente</th>
                                    <th>Planta Externa</th>
                                    <th>Fecha Envío</th>
                                    <th>Estado</th>
                                    <th>Prueba Hidr.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enTransitoFiltrados.length === 0 && (
                                    <tr><td colSpan={8} className="text-center text-muted">
                                        {enTransito.length === 0 ? 'No hay cilindros en tránsito' : 'No hay cilindros que coincidan con los filtros'}
                                    </td></tr>
                                )}
                                {enTransitoFiltrados.map(g => (
                                    <tr key={g.id_guia}>
                                        <td className="fw-bold">{g.numero_guia}</td>
                                        <td>{g.codigo_interno}</td>
                                        <td>{g.gas}</td>
                                        <td>{g.cliente}</td>
                                        <td>{g.planta_externa}</td>
                                        <td>{new Date(g.fecha_envio).toLocaleString()}</td>
                                        <td><Badge bg={guiaEstadoVariant[g.estado] || 'secondary'}>{g.estado}</Badge></td>
                                        <td>
                                            <Badge bg={g.prueba_hidraulica_resultado === 'Aprobado' ? 'success' : g.prueba_hidraulica_resultado === 'Rechazado' ? 'danger' : 'secondary'}>
                                                {g.prueba_hidraulica_resultado || 'Pendiente'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
                <Tab eventKey="historial" title={`Historial (${historialFiltrados.length}/${historial.length})`}>
                    <div>
                        <TableFilterPanel
                            filters={filtersHistorial}
                            filteredCount={historialFiltrados.length}
                            totalCount={historial.length}
                            config={filterConfigs.historial}
                            onSearchChange={handleSearchHistorial}
                            onDateChange={handleDateHistorial}
                            onSelectChange={handleSelectHistorial}
                            onBooleanChange={handleBooleanHistorial}
                            onClear={clearHistorial}
                            hasActiveFilters={hasFiltersHistorial}
                        />
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Gas</th>
                                    <th>Cantidad</th>
                                    <th>Llenador</th>
                                    <th>Cliente</th>
                                    <th>Fecha</th>
                                    <th>Destino</th>
                                    <th>Planta Ext.</th>
                                    <th>Prueba Hidr.</th>
                                    <th>Pintura</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historialFiltrados.length === 0 && (
                                    <tr><td colSpan={10} className="text-center text-muted">
                                        {historial.length === 0 ? 'Sin llenados registrados' : 'No hay llenados que coincidan con los filtros'}
                                    </td></tr>
                                )}
                                {historialFiltrados.map(l => (
                                    <tr key={l.id_llenado}>
                                        <td className="fw-bold">{l.codigo_interno}</td>
                                        <td>{l.gas_nombre}</td>
                                        <td>{l.cantidad}</td>
                                        <td>{l.llenador_nombre}</td>
                                        <td>{l.cliente}</td>
                                        <td>{new Date(l.fecha_llenado).toLocaleString()}</td>
                                        <td><Badge bg={destinoVariant[l.destino] || 'secondary'}>{l.destino}</Badge></td>
                                        <td>{l.planta_externa || '-'}</td>
                                        <td>
                                            <Badge bg={l.prueba_hidraulica_resultado === 'Aprobado' ? 'success' : l.prueba_hidraulica_resultado === 'Rechazado' ? 'danger' : 'secondary'}>
                                                {l.prueba_hidraulica_resultado || 'N/A'}
                                            </Badge>
                                        </td>
                                        <td>{l.requiere_pintura ? <Badge bg="warning">Sí</Badge> : <Badge bg="secondary">No</Badge>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
            </Tabs>

            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Registrar Llenado - {seleccionado?.codigo_interno}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Llenador *</Form.Label>
                            <Form.Select value={formData.id_llenador} onChange={e => setFormData({ ...formData, id_llenador: e.target.value })} required>
                                <option value="">Seleccione un llenador...</option>
                                {llenadores.map(t => (
                                    <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Gas a llenar * (fijo según cilindro)</Form.Label>
                            <Form.Select value={formData.gas_llenado} onChange={e => setFormData({ ...formData, gas_llenado: e.target.value })} required disabled>
                                <option value="">Seleccione un gas...</option>
                                {productos.map(p => (
                                    <option key={p.id_producto} value={p.id_producto}>
                                        {p.nombre} (Stock: {p.stock_disponible} {p.unidad_medida})
                                    </option>
                                ))}
                            </Form.Select>
                            <Form.Text>El gas es inmutable y viene definido por el cilindro</Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Cantidad *</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.cantidad}
                                onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Destino *</Form.Label>
                            <Form.Select value={formData.destino} onChange={e => setFormData({ ...formData, destino: e.target.value })} required>
                                <option value="Retiro inmediato">Retiro inmediato</option>
                                <option value="Bodega temporal">Bodega temporal</option>
                            </Form.Select>
                        </Form.Group>
                        {seleccionado?.tipo_llenado === 'Externo' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Planta Externa (predefinida)</Form.Label>
                                <Form.Control value={seleccionado.planta_externa} disabled />
                                <Form.Text>El llenado es en planta externa: {seleccionado.planta_externa}</Form.Text>
                            </Form.Group>
                        )}
                        {seleccionado?.tipo_llenado === 'Externo' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Resultado Prueba Hidráulica *</Form.Label>
                                <Form.Select value={formData.prueba_hidraulica_resultado} onChange={e => setFormData({ ...formData, prueba_hidraulica_resultado: e.target.value })} required>
                                    <option value="">Seleccionar resultado</option>
                                    <option value="Aprobado">Aprobado</option>
                                    <option value="Rechazado">Rechazado</option>
                                </Form.Select>
                            </Form.Group>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Registrar Llenado'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default Llenados;