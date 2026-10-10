import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, ButtonGroup } from 'react-bootstrap';
import { ordenesTrabajoAPI, trabajadoresAPI } from '../services/api';

const estadoVariant = {
    'Pendiente': 'warning',
    'En proceso': 'info',
    'Completada': 'success',
    'Cancelada': 'danger',
};

const prioridadVariant = {
    'Alta': 'danger',
    'Normal': 'secondary',
    'Baja': 'light',
};

const filtros = [
    { valor: 'Todas', etiqueta: 'Todas' },
    { valor: 'Pendiente', etiqueta: 'Pendientes' },
    { valor: 'En proceso', etiqueta: 'En proceso' },
    { valor: 'Completada', etiqueta: 'Completadas' },
    { valor: 'Cancelada', etiqueta: 'Canceladas' },
];

const OrdenesTrabajo = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [filtro, setFiltro] = useState('Todas');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [showIniciar, setShowIniciar] = useState(false);
    const [showCompletar, setShowCompletar] = useState(false);
    const [seleccionada, setSeleccionada] = useState(null);
    const [idAsignado, setIdAsignado] = useState('');
    const [formData, setFormData] = useState({ resultado: '', repuestos: '', tiempo_invertido: '' });

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [otRes, trabRes] = await Promise.all([
                ordenesTrabajoAPI.getAll(),
                trabajadoresAPI.getAll(),
            ]);
            setOrdenes(otRes.data);
            setTrabajadores(trabRes.data.filter(t => t.activo));
        } catch (err) {
            setError('Error cargando órdenes de trabajo');
        } finally {
            setLoading(false);
        }
    };

    const filtradas = filtro === 'Todas' ? ordenes : ordenes.filter(o => o.estado === filtro);

    const openIniciar = (orden) => {
        setSeleccionada(orden);
        setIdAsignado(orden.id_asignado || '');
        setShowIniciar(true);
    };

    const openCompletar = (orden) => {
        setSeleccionada(orden);
        setFormData({ resultado: '', repuestos: '', tiempo_invertido: '' });
        setShowCompletar(true);
    };

    const handleIniciar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await ordenesTrabajoAPI.start(seleccionada.id_orden, parseInt(idAsignado));
            setShowIniciar(false);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error iniciando orden');
        } finally {
            setGuardando(false);
        }
    };

    const handleCompletar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await ordenesTrabajoAPI.complete(seleccionada.id_orden, {
                resultado: formData.resultado,
                repuestos: formData.repuestos,
                tiempo_invertido: formData.tiempo_invertido ? parseInt(formData.tiempo_invertido) : null,
            });
            setShowCompletar(false);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error completando orden');
        } finally {
            setGuardando(false);
        }
    };

    const handleCancelar = async (id) => {
        if (!window.confirm('¿Está seguro de cancelar esta orden de trabajo?')) return;
        try {
            await ordenesTrabajoAPI.cancel(id);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error cancelando orden');
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Órdenes de Trabajo (Solo Locales)</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <ButtonGroup>
                    {filtros.map(f => (
                        <Button
                            key={f.valor}
                            variant={filtro === f.valor ? 'primary' : 'outline-secondary'}
                            onClick={() => setFiltro(f.valor)}
                        >
                            {f.etiqueta}
                            {f.valor !== 'Todas' && ` (${ordenes.filter(o => o.estado === f.valor).length})`}
                        </Button>
                    ))}
                </ButtonGroup>
                <span className="text-muted small">
                    Total: {ordenes.length} | Prueba Hidráulica: {ordenes.filter(o => o.requiere_prueba_hidraulica).length} | Pintura: {ordenes.filter(o => o.requiere_pintura).length}
                </span>
            </div>

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Código Cilindro</th>
                        <th>Gas</th>
                        <th>Cliente</th>
                        <th>Tipo Trabajo</th>
                        <th>Prueba Hidr.</th>
                        <th>Pintura</th>
                        <th>Prioridad</th>
                        <th>F. Est. Entrega</th>
                        <th>Asignado</th>
                        <th>Estado</th>
                        <th>Fecha Creación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filtradas.length === 0 && (
                        <tr><td colSpan={13} className="text-center text-muted">No hay órdenes de trabajo para mostrar</td></tr>
                    )}
                    {filtradas.map(o => (
                        <tr key={o.id_orden}>
                            <td>{o.id_orden}</td>
                            <td className="fw-bold">{o.codigo_interno}</td>
                            <td>{o.gas}</td>
                            <td>{o.cliente}</td>
                            <td>{o.tipo_trabajo}</td>
                            <td>
                                {o.requiere_prueba_hidraulica ? <Badge bg="warning">Sí</Badge> : <Badge bg="secondary">No</Badge>}
                            </td>
                            <td>
                                {o.requiere_pintura ? <Badge bg="warning">Sí</Badge> : <Badge bg="secondary">No</Badge>}
                            </td>
                            <td><Badge bg={prioridadVariant[o.prioridad] || 'secondary'}>{o.prioridad}</Badge></td>
                            <td>{o.fecha_entrega_estimada ? new Date(o.fecha_entrega_estimada).toLocaleDateString() : '-'}</td>
                            <td>{o.asignado_nombre || '-'}</td>
                            <td><Badge bg={estadoVariant[o.estado] || 'secondary'}>{o.estado}</Badge></td>
                            <td>{new Date(o.fecha_creacion).toLocaleDateString()}</td>
                            <td>
                                {o.estado === 'Pendiente' && (
                                    <Button variant="outline-info" size="sm" className="me-2" onClick={() => openIniciar(o)}>Iniciar</Button>
                                )}
                                {o.estado === 'En proceso' && (
                                    <Button variant="outline-success" size="sm" className="me-2" onClick={() => openCompletar(o)}>Completar</Button>
                                )}
                                {(o.estado === 'Pendiente' || o.estado === 'En proceso') && (
                                    <Button variant="outline-danger" size="sm" onClick={() => handleCancelar(o.id_orden)}>Cancelar</Button>
                                )}
                                {o.estado !== 'Pendiente' && o.estado !== 'En proceso' && <span className="text-muted">-</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showIniciar} onHide={() => setShowIniciar(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Iniciar OT #{seleccionada?.id_orden} - {seleccionada?.codigo_interno}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleIniciar}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Asignar Trabajador *</Form.Label>
                            <Form.Select value={idAsignado} onChange={e => setIdAsignado(e.target.value)} required>
                                <option value="">Seleccione un trabajador...</option>
                                {trabajadores.map(t => (
                                    <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre} ({t.cargos})</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowIniciar(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={guardando}>
                            {guardando ? 'Iniciando...' : 'Iniciar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showCompletar} onHide={() => setShowCompletar(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Completar OT #{seleccionada?.id_orden} - {seleccionada?.codigo_interno}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCompletar}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Resultado *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.resultado}
                                onChange={e => setFormData({ ...formData, resultado: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Repuestos Utilizados</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.repuestos}
                                onChange={e => setFormData({ ...formData, repuestos: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Tiempo Invertido (horas)</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                value={formData.tiempo_invertido}
                                onChange={e => setFormData({ ...formData, tiempo_invertido: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCompletar(false)}>Cancelar</Button>
                        <Button variant="success" type="submit" disabled={guardando}>
                            {guardando ? 'Completando...' : 'Completar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default OrdenesTrabajo;