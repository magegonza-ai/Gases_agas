import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, ButtonGroup } from 'react-bootstrap';
import { ordenesTrabajoAPI, trabajadoresAPI } from '../services/api';
import { generateCertificadoBajaPDF } from '../services/pdfService';

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
    const [showRegistro, setShowRegistro] = useState(false);
    const [textoAvance, setTextoAvance] = useState('');
    const [seleccionada, setSeleccionada] = useState(null);
    const [idAsignado, setIdAsignado] = useState('');
    const [idResponsable, setIdResponsable] = useState('');
    const [certificado, setCertificado] = useState(null);
    const [showCertificado, setShowCertificado] = useState(false);
    const [formData, setFormData] = useState({ resultado: '', repuestos: '', tiempo_invertido: '', prueba_hidraulica_resultado: '', pintura_realizada: false, glosa: '' });

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
        setIdResponsable(orden.id_asignado || '');
        setFormData({ resultado: '', repuestos: '', tiempo_invertido: '', prueba_hidraulica_resultado: '', pintura_realizada: false, glosa: '' });
        setShowCompletar(true);
    };

    const openRegistro = (orden) => {
        setSeleccionada(orden);
        setTextoAvance('');
        setShowRegistro(true);
    };

    const handleAgregarAvance = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const res = await ordenesTrabajoAPI.registroAvance(seleccionada.id_orden, textoAvance);
            setSeleccionada(res.data);
            setTextoAvance('');
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error registrando avance');
        } finally {
            setGuardando(false);
        }
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
        setError('');
        try {
            const res = await ordenesTrabajoAPI.complete(seleccionada.id_orden, {
                resultado: formData.resultado,
                repuestos: formData.repuestos,
                tiempo_invertido: formData.tiempo_invertido ? parseInt(formData.tiempo_invertido) : null,
                prueba_hidraulica_resultado: formData.prueba_hidraulica_resultado || null,
                pintura_realizada: formData.pintura_realizada,
                glosa: formData.glosa,
                id_responsable: idResponsable ? parseInt(idResponsable) : null,
            });
            setShowCompletar(false);
            loadAll();
            // Si la prueba fue rechazada, el backend devuelve el certificado de baja
            if (res.data?.certificado_baja) {
                setCertificado(res.data.certificado_baja);
                setShowCertificado(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error completando orden');
        } finally {
            setGuardando(false);
        }
    };

    const descargarCertificado = () => {
        if (!certificado) return;
        try {
            generateCertificadoBajaPDF(certificado).download(`Certificado_Baja_${certificado.numero_certificado}.pdf`);
        } catch (err) {
            setError('Error generando PDF: ' + (err.message || ''));
        }
    };

    const imprimirCertificado = () => {
        if (!certificado) return;
        try {
            generateCertificadoBajaPDF(certificado).print();
        } catch (err) {
            setError('Error imprimiendo PDF: ' + (err.message || ''));
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

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

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
                        <th>N° OT</th>
                        <th>Código Cilindro</th>
                        <th>Gas</th>
                        <th>Cliente</th>
                        <th>Tipo Trabajo</th>
                        <th>Prueba Hidr.</th>
                        <th>Pintura</th>
                        <th>Prioridad</th>
                        <th>F. Est. Entrega</th>
                        <th>Asignado</th>
                        <th>Avances</th>
                        <th>Estado</th>
                        <th>Fecha Creación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filtradas.length === 0 && (
                        <tr><td colSpan={14} className="text-center text-muted">No hay órdenes de trabajo para mostrar</td></tr>
                    )}
                    {filtradas.map(o => (
                        <tr key={o.id_orden}>
                            <td className="fw-bold">{o.numero_orden || `OT-#${o.id_orden}`}</td>
                            <td className="fw-bold">{o.codigo_interno}</td>
                            <td>{o.gas}</td>
                            <td>{o.cliente}</td>
                            <td>{o.tipo_trabajo}</td>
                            <td>
                                {o.prueba_hidraulica_resultado
                                    ? <Badge bg={o.prueba_hidraulica_resultado === 'Aprobado' ? 'success' : 'danger'}>{o.prueba_hidraulica_resultado}</Badge>
                                    : (o.requiere_prueba_hidraulica ? <Badge bg="warning">Requerida</Badge> : <Badge bg="secondary">No</Badge>)}
                            </td>
                            <td>
                                {o.pintura_realizada
                                    ? <Badge bg="success">Realizada</Badge>
                                    : (o.requiere_pintura ? <Badge bg="warning">Requerida</Badge> : <Badge bg="secondary">No</Badge>)}
                            </td>
                            <td><Badge bg={prioridadVariant[o.prioridad] || 'secondary'}>{o.prioridad}</Badge></td>
                            <td>{o.fecha_entrega_estimada ? new Date(o.fecha_entrega_estimada).toLocaleDateString() : '-'}</td>
                            <td>{o.asignado_nombre || '-'}</td>
                            <td>
                                {o.registro_horario
                                    ? `${o.registro_horario.split('\n').length} registro(s)`
                                    : <span className="text-muted">-</span>}
                            </td>
                            <td><Badge bg={estadoVariant[o.estado] || 'secondary'}>{o.estado}</Badge></td>
                            <td>{new Date(o.fecha_creacion).toLocaleDateString()}</td>
                            <td>
                                <Button variant="outline-secondary" size="sm" className="me-2" title="Ver / agregar avances del trabajo" onClick={() => openRegistro(o)}>📋</Button>
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
                    <Modal.Title>Iniciar OT {seleccionada?.numero_orden || `#${seleccionada?.id_orden}`} - {seleccionada?.codigo_interno}</Modal.Title>
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
                    <Modal.Title>Completar OT {seleccionada?.numero_orden || `#${seleccionada?.id_orden}`} - {seleccionada?.codigo_interno}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCompletar}>
                    <Modal.Body>
                        <Form.Text className="text-muted d-block mb-3">
                            ℹ️ Al completar la OT, el cilindro quedará <b>liberado para su llenado</b>.
                        </Form.Text>
                        {seleccionada?.requiere_prueba_hidraulica && (
                            <Form.Group className="mb-3">
                                <Form.Label>Resultado Prueba Hidráulica *</Form.Label>
                                <Form.Select
                                    value={formData.prueba_hidraulica_resultado}
                                    onChange={e => setFormData({ ...formData, prueba_hidraulica_resultado: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar resultado...</option>
                                    <option value="Aprobado">Aprobado</option>
                                    <option value="Rechazado">Rechazado</option>
                                </Form.Select>
                                <Form.Text className="text-muted d-block">
                                    Si la prueba resulta <b>Rechazada</b>, se emitirá un <b>certificado de baja</b> y el
                                    cilindro quedará fuera de servicio (no podrá recepcionarse ni llenarse nuevamente).
                                </Form.Text>
                            </Form.Group>
                        )}
                        {seleccionada?.requiere_prueba_hidraulica && formData.prueba_hidraulica_resultado === 'Rechazado' && (
                            <>
                                <Alert variant="danger" className="py-2">
                                    La prueba <b>Rechazada</b> da de baja el cilindro. Complete la glosa y el responsable
                                    para emitir el certificado.
                                </Alert>
                                <Form.Group className="mb-3">
                                    <Form.Label>Glosa / detalle del certificado *</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.glosa}
                                        onChange={e => setFormData({ ...formData, glosa: e.target.value })}
                                        placeholder="Detalle del rechazo, hallazgos u observaciones técnicas..."
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Responsable que firma *</Form.Label>
                                    <Form.Select
                                        value={idResponsable}
                                        onChange={e => setIdResponsable(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccione un responsable...</option>
                                        {trabajadores.map(t => (
                                            <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre} ({t.cargos})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </>
                        )}
                        {seleccionada?.requiere_pintura && formData.prueba_hidraulica_resultado !== 'Rechazado' && (
                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Confirmo que la pintura fue realizada"
                                    checked={formData.pintura_realizada}
                                    onChange={e => setFormData({ ...formData, pintura_realizada: e.target.checked })}
                                />
                                <Form.Text className="text-muted d-block">
                                    Debe confirmar la pintura para poder completar la OT.
                                </Form.Text>
                            </Form.Group>
                        )}
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

            <Modal show={showRegistro} onHide={() => setShowRegistro(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Registro de Avances - OT {seleccionada?.numero_orden || `#${seleccionada?.id_orden}`} ({seleccionada?.codigo_interno})</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {seleccionada?.registro_horario ? (
                        <pre className="bg-light p-3 rounded" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                            {seleccionada.registro_horario}
                        </pre>
                    ) : (
                        <p className="text-muted">Aún no hay avances registrados.</p>
                    )}
                    {seleccionada?.estado === 'En proceso' && (
                        <Form onSubmit={handleAgregarAvance}>
                            <Form.Group className="mb-2">
                                <Form.Label>Nuevo avance (se registrará con fecha y hora)</Form.Label>
                                <Form.Control
                                    as="textarea" rows={2}
                                    value={textoAvance}
                                    onChange={e => setTextoAvance(e.target.value)}
                                    placeholder="Ej: Se reemplazó la válvula; 14:30 prueba de estanqueidad ok..."
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit" disabled={guardando || !textoAvance.trim()}>
                                {guardando ? 'Registrando...' : '+ Agregar avance'}
                            </Button>
                        </Form>
                    )}
                    {seleccionada?.estado === 'Completada' && (
                        <Form.Text className="text-muted">OT completada: el registro es de solo lectura.</Form.Text>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRegistro(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showCertificado} onHide={() => setShowCertificado(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>🚫 Cilindro dado de baja</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    <h5>Certificado N° {certificado?.numero_certificado}</h5>
                    <p className="text-muted mb-4">
                        El cilindro <b>{certificado?.codigo_interno}</b> quedó <b>dado de baja</b> por prueba
                        hidráulica rechazada y no podrá recepcionarse ni llenarse nuevamente.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <Button variant="primary" onClick={descargarCertificado}>
                            ⬇ Descargar PDF
                        </Button>
                        <Button variant="outline-primary" onClick={imprimirCertificado}>
                            🖨 Imprimir
                        </Button>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCertificado(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default OrdenesTrabajo;