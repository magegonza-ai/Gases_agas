import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, Row, Col, DropdownButton, Dropdown } from 'react-bootstrap';
import { guiasDespachoAPI, trabajadoresAPI } from '../services/api';
import { generateGuiaDespachoPDF } from '../services/pdfService';

const estadoVariant = {
    'Enviada': 'warning',
    'Recibida': 'info',
    'Devuelta': 'success',
    'Cancelada': 'danger',
};

const pruebaVariant = {
    'Aprobado': 'success',
    'Rechazado': 'danger',
};

const GuiasDespacho = () => {
    const [guias, setGuias] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingGuia, setEditingGuia] = useState(null);
    const [formData, setFormData] = useState({
        id_detalle_recepcion: '',
        id_planta_externa: '',
        numero_guia: '',
        chofer: '',
        patente_vehiculo: '',
        observaciones: '',
        prueba_hidraulica_resultado: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [trabajadores, setTrabajadores] = useState([]);
    const [showRetorno, setShowRetorno] = useState(false);
    const [guiaRetorno, setGuiaRetorno] = useState(null);
    const [formRetorno, setFormRetorno] = useState({
        trabajos_realizados: '', prueba_hidraulica_resultado: 'Aprobado',
        cantidad_llenada: '', id_llenador: '', destino: 'Retiro inmediato',
    });
    const [guardandoRetorno, setGuardandoRetorno] = useState(false);

    useEffect(() => { loadGuias(); loadTrabajadores(); }, []);

    const loadGuias = async () => {
        try {
            const res = await guiasDespachoAPI.getAll();
            setGuias(res.data);
        } catch (err) {
            setError('Error cargando guías de despacho');
        } finally {
            setLoading(false);
        }
    };

    const loadTrabajadores = async () => {
        try {
            const res = await trabajadoresAPI.getAll();
            setTrabajadores(res.data);
        } catch (err) {
            // silencioso
        }
    };

    const resetForm = () => {
        setEditingGuia(null);
        setFormData({ id_detalle_recepcion: '', id_planta_externa: '', numero_guia: '', chofer: '', patente_vehiculo: '', observaciones: '', prueba_hidraulica_resultado: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.id_detalle_recepcion || !formData.id_planta_externa) {
                return setError('Detalle recepción y planta requeridos');
            }
            if (editingGuia) {
                await guiasDespachoAPI.update(editingGuia.id_guia, formData);
            } else {
                await guiasDespachoAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            loadGuias();
        } catch (err) {
            setError(err.response?.data?.error || 'Error guardando guía');
        }
    };

    const handleEdit = (guia) => {
        setEditingGuia(guia);
        setFormData({
            id_detalle_recepcion: guia.id_detalle,
            id_planta_externa: guia.id_planta_externa || '',
            numero_guia: guia.numero_guia,
            chofer: guia.chofer || '',
            patente_vehiculo: guia.patente_vehiculo || '',
            observaciones: guia.observaciones || '',
            prueba_hidraulica_resultado: guia.prueba_hidraulica_resultado || '',
        });
        setShowModal(true);
    };

    const handleRecibir = async (id) => {
        try {
            await guiasDespachoAPI.recibirEnPlanta(id);
            loadGuias();
        } catch (err) {
            setError(err.response?.data?.error || 'Error recibiendo en planta');
        }
    };

    const openRetorno = (guia) => {
        setGuiaRetorno(guia);
        setFormRetorno({
            trabajos_realizados: guia.trabajos_realizados || '',
            prueba_hidraulica_resultado: 'Aprobado',
            cantidad_llenada: guia.cantidad_llenado != null ? guia.cantidad_llenado : '',
            id_llenador: '',
            destino: 'Retiro inmediato',
        });
        setError('');
        setShowRetorno(true);
    };

    const submitRetorno = async (e) => {
        e.preventDefault();
        if (!guiaRetorno) return;
        if (!formRetorno.trabajos_realizados.trim()) {
            return setError('Debe detallar los trabajos realizados en la planta externa');
        }
        if (formRetorno.prueba_hidraulica_resultado !== 'Aprobado') {
            return setError('El cilindro no puede llenarse sin la prueba hidráulica aprobada');
        }
        if (!formRetorno.id_llenador) {
            return setError('Debe indicar quién recibe el cilindro de vuelta');
        }
        setGuardandoRetorno(true);
        try {
            await guiasDespachoAPI.retornarDePlanta(guiaRetorno.id_guia, {
                ...formRetorno,
                cantidad_llenada: formRetorno.cantidad_llenada === '' ? null : Number(formRetorno.cantidad_llenada),
                id_llenador: Number(formRetorno.id_llenador),
            });
            setShowRetorno(false);
            setGuiaRetorno(null);
            loadGuias();
        } catch (err) {
            setError(err.response?.data?.error || 'Error registrando la recepción desde planta');
        } finally {
            setGuardandoRetorno(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        resetForm();
    };

    const handleDownloadPDF = (guia) => {
        try {
            const pdf = generateGuiaDespachoPDF(
                guia,
                { codigo_interno: guia.codigo_interno, gas: guia.gas, capacidad: '', propiedad: '', cantidad: guia.cantidad_llenado },
                { razon_social: guia.cliente, rut: '', direccion: '', comuna: '' },
                { razon_social: guia.planta_externa, rut: '', direccion: '', persona_contacto: '', telefono: '', email: '' }
            );
            pdf.download(`Guia_Despacho_${guia.numero_guia}.pdf`);
        } catch (err) {
            setError('Error generando PDF: ' + err.message);
        }
    };

    const handlePrintPDF = (guia) => {
        try {
            const pdf = generateGuiaDespachoPDF(
                guia,
                { codigo_interno: guia.codigo_interno, gas: guia.gas, capacidad: '', propiedad: '', cantidad: guia.cantidad_llenado },
                { razon_social: guia.cliente, rut: '', direccion: '', comuna: '' },
                { razon_social: guia.planta_externa, rut: '', direccion: '', persona_contacto: '', telefono: '', email: '' }
            );
            pdf.print();
        } catch (err) {
            setError('Error imprimiendo PDF: ' + err.message);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Guías de Despacho (Plantas Externas)</h2>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>N° Guía</th>
                        <th>Cilindro</th>
                        <th>Gas</th>
                        <th>Cant. Sol. (L)</th>
                        <th>Cant. Llen. (L)</th>
                        <th>Cliente</th>
                        <th>Planta Externa</th>
                        <th>Fecha Envío</th>
                        <th>F. Rec. Planta</th>
                        <th>F. Retorno</th>
                        <th>Chofer</th>
                        <th>Patente</th>
                        <th>Prueba Hidr.</th>
                        <th>Trabajos realizados</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {guias.length === 0 && (
                        <tr><td colSpan={16} className="text-center text-muted">No hay guías de despacho registradas</td></tr>
                    )}
                    {guias.map(g => (
                        <tr key={g.id_guia}>
                            <td className="fw-bold">{g.numero_guia}</td>
                            <td>{g.codigo_interno}</td>
                            <td>{g.gas}</td>
                            <td>{g.cantidad_llenado ? `${g.cantidad_llenado} L` : '-'}</td>
                            <td>{g.cantidad_llenada != null ? `${g.cantidad_llenada} L` : '-'}</td>
                            <td>{g.cliente}</td>
                            <td>{g.planta_externa}</td>
                            <td>{g.fecha_envio ? new Date(g.fecha_envio).toLocaleString() : '-'}</td>
                            <td>{g.fecha_recepcion_planta ? new Date(g.fecha_recepcion_planta).toLocaleString() : '-'}</td>
                            <td>{g.fecha_retorno ? new Date(g.fecha_retorno).toLocaleString() : '-'}</td>
                            <td>{g.chofer || '-'}</td>
                            <td>{g.patente_vehiculo || '-'}</td>
                            <td>
                                {g.prueba_hidraulica_resultado ? (
                                    <Badge bg={pruebaVariant[g.prueba_hidraulica_resultado] || 'secondary'}>{g.prueba_hidraulica_resultado}</Badge>
                                ) : (
                                    <Badge bg="secondary">Pendiente</Badge>
                                )}
                            </td>
                            <td style={{ maxWidth: 220 }} className="text-truncate" title={g.trabajos_realizados || ''}>
                                {g.trabajos_realizados || '-'}
                            </td>
                            <td><Badge bg={estadoVariant[g.estado] || 'secondary'}>{g.estado}</Badge></td>
                            <td>
                                <DropdownButton
                                    title="Acciones"
                                    variant="outline-secondary"
                                    size="sm"
                                    id={`actions-${g.id_guia}`}
                                >
                                    <Dropdown.Item onClick={() => handleDownloadPDF(g)}>⬇ Descargar PDF</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handlePrintPDF(g)}>🖨 Imprimir</Dropdown.Item>
                                    <Dropdown.Divider />
                                    {g.estado === 'Enviada' && (
                                        <Dropdown.Item onClick={() => handleRecibir(g.id_guia)}>✓ Marcar llegada a Planta</Dropdown.Item>
                                    )}
                                    {(g.estado === 'Enviada' || g.estado === 'Recibida') && (
                                        <Dropdown.Item onClick={() => openRetorno(g)}>↩ Recepción desde Planta (trabajos + llenado)</Dropdown.Item>
                                    )}
                                    <Dropdown.Item onClick={() => handleEdit(g)}>✏ Editar</Dropdown.Item>
                                </DropdownButton>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingGuia ? 'Editar Guía de Despacho' : 'Nueva Guía de Despacho'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>N° Guía</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.numero_guia}
                                        onChange={e => setFormData({ ...formData, numero_guia: e.target.value })}
                                        placeholder="Se genera automáticamente (GUIA-00001...)"
                                        disabled={editingGuia && formData.numero_guia}
                                    />
                                    {!editingGuia && (
                                        <Form.Text className="text-muted">Déjelo en blanco: se asignará el siguiente número secuencial.</Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Detalle Recepción *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.id_detalle_recepcion}
                                        onChange={e => setFormData({ ...formData, id_detalle_recepcion: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Planta Externa *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.id_planta_externa}
                                        onChange={e => setFormData({ ...formData, id_planta_externa: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Chofer</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.chofer}
                                        onChange={e => setFormData({ ...formData, chofer: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Patente Vehículo</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.patente_vehiculo}
                                        onChange={e => setFormData({ ...formData, patente_vehiculo: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Observaciones</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        value={formData.observaciones}
                                        onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Resultado Prueba Hidráulica</Form.Label>
                                    <Form.Select value={formData.prueba_hidraulica_resultado} onChange={e => setFormData({ ...formData, prueba_hidraulica_resultado: e.target.value })}>
                                        <option value="">Pendiente</option>
                                        <option value="Aprobado">Aprobado</option>
                                        <option value="Rechazado">Rechazado</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                        <Button variant="primary" type="submit">Guardar</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Recepción desde planta externa: trabajos realizados + llenado */}
            <Modal show={showRetorno} onHide={() => setShowRetorno(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Recepción desde Planta — Guía {guiaRetorno?.numero_guia}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={submitRetorno}>
                    <Modal.Body>
                        <Alert variant="light" className="border">
                            <div><strong>Cilindro:</strong> {guiaRetorno?.codigo_interno} — {guiaRetorno?.gas}</div>
                            <div><strong>Planta externa:</strong> {guiaRetorno?.planta_externa}</div>
                            <div><strong>Cantidad solicitada:</strong> {guiaRetorno?.cantidad_llenado != null ? `${guiaRetorno.cantidad_llenado} L` : '-'}</div>
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label>Trabajos realizados en la planta *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formRetorno.trabajos_realizados}
                                onChange={e => setFormRetorno({ ...formRetorno, trabajos_realizados: e.target.value })}
                                placeholder="Ej: Reparación de válvula, prueba hidráulica, pintura, llenado..."
                                required
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Resultado Prueba Hidráulica *</Form.Label>
                                    <Form.Select
                                        value={formRetorno.prueba_hidraulica_resultado}
                                        onChange={e => setFormRetorno({ ...formRetorno, prueba_hidraulica_resultado: e.target.value })}
                                        required
                                    >
                                        <option value="Aprobado">Aprobado</option>
                                        <option value="Rechazado">Rechazado</option>
                                    </Form.Select>
                                    <Form.Text className="text-danger d-block">
                                        Debe estar <b>Aprobada</b> para poder llenar y entregar el cilindro.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cantidad llenada (L) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={formRetorno.cantidad_llenada}
                                        onChange={e => setFormRetorno({ ...formRetorno, cantidad_llenada: e.target.value })}
                                        required
                                    />
                                    <Form.Text className="text-muted d-block">
                                        Por defecto, la solicitada en la recepción.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Recibido por *</Form.Label>
                                    <Form.Select
                                        value={formRetorno.id_llenador}
                                        onChange={e => setFormRetorno({ ...formRetorno, id_llenador: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccionar trabajador...</option>
                                        {trabajadores.map(t => (
                                            <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Destino *</Form.Label>
                                    <Form.Select
                                        value={formRetorno.destino}
                                        onChange={e => setFormRetorno({ ...formRetorno, destino: e.target.value })}
                                    >
                                        <option value="Retiro inmediato">Retiro inmediato (queda Lleno)</option>
                                        <option value="Bodega temporal">Bodega temporal</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Text className="text-muted">
                            Al confirmar, el cilindro queda <b>disponible para la entrega</b> al cliente.
                        </Form.Text>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRetorno(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={guardandoRetorno}>
                            {guardandoRetorno ? <Spinner animation="border" size="sm" className="me-2" /> : ''}
                            Confirmar recepción
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default GuiasDespacho;