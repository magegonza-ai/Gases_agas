import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, ListGroup, Row, Col, Card } from 'react-bootstrap';
import { envasesAPI, clientesAPI, productosAPI, trabajadoresAPI, plantasExternasAPI } from '../services/api';
import { useTableFilters, TableFilterPanel } from '../components/TableFilters';

const estadoVariant = {
    'Disponible': 'success',
    'Vacio': 'warning',
    'En llenado': 'info',
    'Lleno': 'primary',
    'En reparacion': 'danger',
    'En bodega': 'secondary',
    'Entregado': 'dark',
    'Baja': 'light',
    'En planta externa': 'info',
    'En OT local': 'warning',
    'Por entregar': 'primary',
};

const propiedadLabel = {
    'Propiedad_empresa': 'Empresa',
    'Propiedad_cliente': 'Cliente',
    'Tercero': 'Tercero',
};

const tipoObservacion = ['General', 'Dano', 'Reparacion', 'Mantenimiento'];

const Cilindros = () => {
    const [cilindros, setCilindros] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [plantasExternas, setPlantasExternas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [showNuevo, setShowNuevo] = useState(false);
    const [formData, setFormData] = useState({
        codigo_interno: '',
        id_producto: '',
        capacidad: '',
        propiedad: 'Propiedad_empresa',
        id_propietario: '',
    });

    const [showObs, setShowObs] = useState(false);
    const [cilindroObs, setCilindroObs] = useState(null);
    const [observaciones, setObservaciones] = useState([]);
    const [obsData, setObsData] = useState({ id_trabajador: '', tipo: 'General', descripcion: '' });

    // Configuración de filtros
    const filterConfig = {
        searchFields: ['codigo_interno', 'gas', 'propietario', 'planta_externa'],
        dateFields: ['fecha_ultimo_llenado', 'fecha_proxima_prueba'],
        selectFields: ['estado', 'propiedad', 'tipo_llenado', 'prueba_hidraulica'],
        booleanFields: ['requiere_pintura'],
        selectOptions: {
            estado: ['Disponible', 'Vacio', 'En llenado', 'Lleno', 'En reparacion', 'En bodega', 'Entregado', 'En planta externa', 'En OT local', 'Por entregar'],
            propiedad: ['Propiedad_empresa', 'Propiedad_cliente', 'Tercero'],
            tipo_llenado: ['Local', 'Externo'],
            prueba_hidraulica: ['Pendiente', 'Aprobado', 'Rechazado'],
        },
    };

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [cilRes, cliRes, prodRes, trabRes, plaRes] = await Promise.all([
                envasesAPI.getAll(),
                clientesAPI.getAll(),
                productosAPI.getAll(),
                trabajadoresAPI.getAll(),
                plantasExternasAPI.getAll(),
            ]);
            setCilindros(cilRes.data.filter(c => c.estado !== 'Baja'));
            setClientes(cliRes.data);
            setProductos(prodRes.data);
            setTrabajadores(trabRes.data.filter(t => t.activo));
            setPlantasExternas(plaRes.data);
        } catch (err) {
            setError('Error cargando cilindros');
        } finally {
            setLoading(false);
        }
    };

    // Hook de filtros
    const { filters, filteredData: cilindrosFiltrados, handleSearchChange, handleDateChange, handleSelectChange, handleBooleanChange, clearFilters, hasActiveFilters } = useTableFilters(cilindros, filterConfig);

    const handleNuevo = () => {
        setFormData({ codigo_interno: '', id_producto: '', capacidad: '', propiedad: 'Propiedad_empresa', id_propietario: '' });
        setShowNuevo(true);
    };

    const handleSubmitNuevo = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await envasesAPI.create({
                codigo_interno: formData.codigo_interno.trim(),
                id_producto: parseInt(formData.id_producto),
                capacidad: formData.capacidad ? parseFloat(formData.capacidad) : null,
                propiedad: formData.propiedad,
                id_propietario: formData.propiedad === 'Propiedad_empresa' ? null : parseInt(formData.id_propietario),
                estado: 'Disponible',
            });
            setShowNuevo(false);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error creando cilindro');
        } finally {
            setGuardando(false);
        }
    };

    const openObservaciones = async (cilindro) => {
        setCilindroObs(cilindro);
        setObsData({ id_trabajador: '', tipo: 'General', descripcion: '' });
        setShowObs(true);
        try {
            const res = await envasesAPI.getObservaciones(cilindro.id_envase);
            setObservaciones(res.data);
        } catch (err) {
            setObservaciones([]);
        }
    };

    const handleAddObservacion = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await envasesAPI.addObservacion({
                id_envase: cilindroObs.id_envase,
                id_trabajador: parseInt(obsData.id_trabajador),
                tipo: obsData.tipo,
                descripcion: obsData.descripcion,
            });
            setObsData({ id_trabajador: '', tipo: 'General', descripcion: '' });
            const res = await envasesAPI.getObservaciones(cilindroObs.id_envase);
            setObservaciones(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Error agregando observación');
        } finally {
            setGuardando(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    // Render historial observaciones
    const renderHistorial = () => {
        if (observaciones.length === 0) {
            return <Alert variant="light" className="py-2">Sin observaciones registradas</Alert>;
        }
        return (
            <ListGroup variant="flush" className="border rounded mb-4">
                {observaciones.map(o => (
                    <ListGroup.Item key={o.id_observacion}>
                        <div className="d-flex justify-content-between">
                            <strong>
                                <Badge bg={o.tipo === 'Dano' ? 'danger' : o.tipo === 'Reparacion' ? 'success' : 'info'} className="me-2">
                                    {o.tipo}
                                </Badge>
                                {o.descripcion}
                            </strong>
                        </div>
                        <small className="text-muted">{o.trabajador} - {new Date(o.fecha).toLocaleString()}</small>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        );
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Cilindros</h2>
                <Button variant="primary" onClick={handleNuevo}>Nuevo Cilindro</Button>
            </div>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            {/* Panel de filtros */}
            <TableFilterPanel
                filters={filters}
                filteredCount={cilindrosFiltrados.length}
                totalCount={cilindros.length}
                config={filterConfig}
                onSearchChange={handleSearchChange}
                onDateChange={handleDateChange}
                onSelectChange={handleSelectChange}
                onBooleanChange={handleBooleanChange}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Gas</th>
                        <th>Capacidad</th>
                        <th>Propiedad</th>
                        <th>Propietario</th>
                        <th>Estado</th>
                        <th>Tipo Llenado</th>
                        <th>Planta Ext.</th>
                        <th>Prueba Hidr.</th>
                        <th>Pintura</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {cilindrosFiltrados.length === 0 && (
                        <tr><td colSpan={11} className="text-center text-muted">
                            {cilindros.length === 0 ? 'No hay cilindros registrados' : 'No hay cilindros que coincidan con los filtros'}
                        </td></tr>
                    )}
                    {cilindrosFiltrados.map(c => (
                        <tr key={c.id_envase}>
                            <td className="fw-bold">{c.codigo_interno}</td>
                            <td>{c.gas}</td>
                            <td>{c.capacidad ? `${c.capacidad} L` : '-'}</td>
                            <td>{propiedadLabel[c.propiedad] || c.propiedad}</td>
                            <td>{c.propietario || (c.propiedad === 'Propiedad_empresa' ? 'PROMINER' : '-')}</td>
                            <td><Badge bg={estadoVariant[c.estado] || 'secondary'}>{c.estado}</Badge></td>
                            <td>{c.tipo_llenado ? <Badge bg={c.tipo_llenado === 'Externo' ? 'info' : 'primary'}>{c.tipo_llenado}</Badge> : '-'}</td>
                            <td>{c.planta_externa || '-'}</td>
                            <td>
                                {c.prueba_hidraulica ? (
                                    <Badge bg={c.prueba_hidraulica === 'Aprobado' ? 'success' : c.prueba_hidraulica === 'Rechazado' ? 'danger' : 'secondary'}>
                                        {c.prueba_hidraulica}
                                    </Badge>
                                ) : '-'}
                            </td>
                            <td>
                                {c.requiere_pintura ? <Badge bg="warning">Sí</Badge> : <Badge bg="secondary">No</Badge>}
                            </td>
                            <td>
                                <Button variant="outline-secondary" size="sm" onClick={() => openObservaciones(c)}>Observaciones</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showNuevo} onHide={() => setShowNuevo(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Nuevo Cilindro</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmitNuevo}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Código Interno *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.codigo_interno}
                                onChange={e => setFormData({ ...formData, codigo_interno: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Producto (Gas Asignado) * <span className="text-muted small">(Inmutable una vez creado)</span></Form.Label>
                            <Form.Select value={formData.id_producto} onChange={e => setFormData({ ...formData, id_producto: e.target.value })} required>
                                <option value="">Seleccione un producto...</option>
                                {productos.map(p => (
                                    <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Capacidad (litros)</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.capacidad}
                                onChange={e => setFormData({ ...formData, capacidad: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Propiedad *</Form.Label>
                            <Form.Select value={formData.propiedad} onChange={e => setFormData({ ...formData, propiedad: e.target.value })} required>
                                <option value="Propiedad_empresa">Propiedad de la empresa</option>
                                <option value="Propiedad_cliente">Propiedad del cliente</option>
                                <option value="Tercero">Tercero</option>
                            </Form.Select>
                        </Form.Group>
                        {formData.propiedad !== 'Propiedad_empresa' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Propietario *</Form.Label>
                                <Form.Select value={formData.id_propietario} onChange={e => setFormData({ ...formData, id_propietario: e.target.value })} required>
                                    <option value="">Seleccione el propietario...</option>
                                    {clientes.map(c => (
                                        <option key={c.id_cliente} value={c.id_cliente}>{c.razon_social} ({c.rut})</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowNuevo(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showObs} onHide={() => setShowObs(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Observaciones - {cilindroObs?.codigo_interno}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h6 className="mb-2">Historial</h6>
                    {renderHistorial()}

                    <h6 className="mb-2">Nueva Observación</h6>
                    <Form onSubmit={handleAddObservacion}>
                        <Row>
                            <Col md={5}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Trabajador *</Form.Label>
                                    <Form.Select value={obsData.id_trabajador} onChange={e => setObsData({ ...obsData, id_trabajador: e.target.value })} required>
                                        <option value="">Seleccione...</option>
                                        {trabajadores.map(t => (
                                            <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre} ({t.cargos})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={7}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tipo *</Form.Label>
                                    <Form.Select value={obsData.tipo} onChange={e => setObsData({ ...obsData, tipo: e.target.value })}>
                                        {tipoObservacion.map(t => <option key={t} value={t}>{t}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Descripción *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={obsData.descripcion}
                                onChange={e => setObsData({ ...obsData, descripcion: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Agregar Observación'}
                        </Button>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowObs(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Cilindros;