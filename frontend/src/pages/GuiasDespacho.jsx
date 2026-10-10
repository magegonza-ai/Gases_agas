import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, Row, Col, DropdownButton, Dropdown } from 'react-bootstrap';
import { guiasDespachoAPI } from '../services/api';
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

    useEffect(() => { loadGuias(); }, []);

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

    const resetForm = () => {
        setEditingGuia(null);
        setFormData({ id_detalle_recepcion: '', id_planta_externa: '', numero_guia: '', chofer: '', patente_vehiculo: '', observaciones: '', prueba_hidraulica_resultado: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.id_detalle_recepcion || !formData.id_planta_externa || !formData.numero_guia) {
                return setError('Detalle recepción, planta y número de guía requeridos');
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

    const handleRetornar = async (id) => {
        try {
            await guiasDespachoAPI.retornarDePlanta(id);
            loadGuias();
        } catch (err) {
            setError(err.response?.data?.error || 'Error retornando de planta');
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
                { codigo_interno: guia.codigo_interno, gas: guia.gas, capacidad: '', propiedad: '' },
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
                { codigo_interno: guia.codigo_interno, gas: guia.gas, capacidad: '', propiedad: '' },
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

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>N° Guía</th>
                        <th>Cilindro</th>
                        <th>Gas</th>
                        <th>Cliente</th>
                        <th>Planta Externa</th>
                        <th>Fecha Envío</th>
                        <th>Chofer</th>
                        <th>Patente</th>
                        <th>Prueba Hidr.</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {guias.length === 0 && (
                        <tr><td colSpan={11} className="text-center text-muted">No hay guías de despacho registradas</td></tr>
                    )}
                    {guias.map(g => (
                        <tr key={g.id_guia}>
                            <td className="fw-bold">{g.numero_guia}</td>
                            <td>{g.codigo_interno}</td>
                            <td>{g.gas}</td>
                            <td>{g.cliente}</td>
                            <td>{g.planta_externa}</td>
                            <td>{new Date(g.fecha_envio).toLocaleString()}</td>
                            <td>{g.chofer || '-'}</td>
                            <td>{g.patente_vehiculo || '-'}</td>
                            <td>
                                {g.prueba_hidraulica_resultado ? (
                                    <Badge bg={pruebaVariant[g.prueba_hidraulica_resultado] || 'secondary'}>{g.prueba_hidraulica_resultado}</Badge>
                                ) : (
                                    <Badge bg="secondary">Pendiente</Badge>
                                )}
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
                                        <Dropdown.Item onClick={() => handleRecibir(g.id_guia)}>✓ Recibir en Planta</Dropdown.Item>
                                    )}
                                    {g.estado === 'Recibida' && (
                                        <Dropdown.Item onClick={() => handleRetornar(g.id_guia)}>↩ Retornar</Dropdown.Item>
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
                                    <Form.Label>N° Guía *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.numero_guia}
                                        onChange={e => setFormData({ ...formData, numero_guia: e.target.value })}
                                        required
                                    />
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
        </div>
    );
};

export default GuiasDespacho;