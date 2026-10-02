import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Alert, Badge, Spinner, Modal } from 'react-bootstrap';
import { entregasAPI, clientesAPI, trabajadoresAPI } from '../services/api';

const Entregas = () => {
    const [entregas, setEntregas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [despachadores, setDespachadores] = useState([]);
    const [cilindrosDisponibles, setCilindrosDisponibles] = useState([]);
    const [seleccionados, setSeleccionados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [showDetalle, setShowDetalle] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [formData, setFormData] = useState({
        id_cliente: '',
        id_despachador: '',
        numero_documento: '',
        tipo_documento: 'Vale',
        patente_vehiculo: '',
    });

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [entRes, cliRes, trabRes] = await Promise.all([
                entregasAPI.getAll(),
                clientesAPI.getAll(),
                trabajadoresAPI.getByCargo('Despachador'),
            ]);
            setEntregas(entRes.data);
            setClientes(cliRes.data.filter(c => c.activo));
            setDespachadores(trabRes.data.filter(t => t.activo));
        } catch (err) {
            setError('Error cargando datos de entregas');
        } finally {
            setLoading(false);
        }
    };

    const handleClienteChange = async (idCliente) => {
        setFormData({ ...formData, id_cliente: idCliente });
        setCilindrosDisponibles([]);
        setSeleccionados([]);
        if (!idCliente) return;
        try {
            const res = await entregasAPI.getParaEntregar(idCliente);
            setCilindrosDisponibles(res.data);
        } catch (err) {
            setError('Error cargando cilindros del cliente');
        }
    };

    const toggleCilindro = (cilindro) => {
        setSeleccionados(prev =>
            prev.some(c => c.id_llenado === cilindro.id_llenado)
                ? prev.filter(c => c.id_llenado !== cilindro.id_llenado)
                : [...prev, cilindro]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (seleccionados.length === 0) {
            setError('Debe seleccionar al menos un cilindro para entregar');
            return;
        }
        setGuardando(true);
        setError('');
        try {
            await entregasAPI.create({
                ...formData,
                id_cliente: parseInt(formData.id_cliente),
                id_despachador: parseInt(formData.id_despachador),
                detalle: seleccionados.map(c => ({ id_llenado: c.id_llenado, id_envase: c.id_envase })),
            });
            setFormData({ id_cliente: '', id_despachador: '', numero_documento: '', tipo_documento: 'Vale', patente_vehiculo: '' });
            setCilindrosDisponibles([]);
            setSeleccionados([]);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Error registrando entrega');
        } finally {
            setGuardando(false);
        }
    };

    const verDetalle = async (id) => {
        try {
            const res = await entregasAPI.getById(id);
            setDetalle(res.data);
            setShowDetalle(true);
        } catch (err) {
            setError('Error cargando detalle de la entrega');
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Entregas</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Row>
                <Col lg={5} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header as="h5">Nueva Entrega</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cliente *</Form.Label>
                                    <Form.Select value={formData.id_cliente} onChange={e => handleClienteChange(e.target.value)} required>
                                        <option value="">Seleccione un cliente...</option>
                                        {clientes.map(c => (
                                            <option key={c.id_cliente} value={c.id_cliente}>{c.razon_social}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                {formData.id_cliente && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Cilindros Listos para Entregar ({seleccionados.length} seleccionados)</Form.Label>
                                        {cilindrosDisponibles.length === 0 ? (
                                            <Alert variant="light" className="mb-0 py-2">No hay cilindros listos para este cliente</Alert>
                                        ) : (
                                            <div className="border rounded p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                                {cilindrosDisponibles.map(c => {
                                                    const checked = seleccionados.some(s => s.id_llenado === c.id_llenado);
                                                    return (
                                                        <Form.Check
                                                            key={c.id_llenado}
                                                            type="checkbox"
                                                            id={`cil-${c.id_llenado}`}
                                                            label={`${c.codigo_interno} - ${c.gas_nombre} (${c.cantidad})`}
                                                            checked={checked}
                                                            onChange={() => toggleCilindro(c)}
                                                            className="py-1"
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label>Despachador *</Form.Label>
                                    <Form.Select value={formData.id_despachador} onChange={e => setFormData({ ...formData, id_despachador: e.target.value })} required>
                                        <option value="">Seleccione un despachador...</option>
                                        {despachadores.map(d => (
                                            <option key={d.id_trabajador} value={d.id_trabajador}>{d.nombre}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                                <Row>
                                    <Col md={7}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Número Documento *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.numero_documento}
                                                onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={5}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Tipo Documento *</Form.Label>
                                            <Form.Select value={formData.tipo_documento} onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })} required>
                                                <option value="Vale">Vale</option>
                                                <option value="Factura">Factura</option>
                                                <option value="Boleta">Boleta</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Form.Group className="mb-3">
                                    <Form.Label>Patente Vehículo</Form.Label>
                                    <Form.Control
                                        type="text"
                                        maxLength={10}
                                        value={formData.patente_vehiculo}
                                        onChange={e => setFormData({ ...formData, patente_vehiculo: e.target.value.toUpperCase() })}
                                    />
                                </Form.Group>
                                <Button variant="primary" type="submit" disabled={guardando} className="w-100">
                                    {guardando ? 'Registrando...' : 'Registrar Entrega'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={7} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header as="h5">Historial de Entregas</Card.Header>
                        <Table striped hover responsive className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cliente</th>
                                    <th>Despachador</th>
                                    <th>Documento</th>
                                    <th>Fecha</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entregas.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-muted">Sin entregas registradas</td></tr>
                                )}
                                {entregas.map(e => (
                                    <tr key={e.id_entrega}>
                                        <td>{e.id_entrega}</td>
                                        <td>{e.cliente}</td>
                                        <td>{e.despachador}</td>
                                        <td>
                                            <Badge bg="secondary" className="me-1">{e.tipo_documento}</Badge>
                                            {e.numero_documento}
                                        </td>
                                        <td>{new Date(e.fecha_entrega).toLocaleString()}</td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" onClick={() => verDetalle(e.id_entrega)}>Ver detalle</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>

            <Modal show={showDetalle} onHide={() => setShowDetalle(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalle Entrega #{detalle?.id_entrega}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detalle && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}><strong>Cliente:</strong> {detalle.cliente}</Col>
                                <Col md={6}><strong>RUT:</strong> {detalle.rut || '-'}</Col>
                                <Col md={6}><strong>Despachador:</strong> {detalle.despachador}</Col>
                                <Col md={6}><strong>Fecha:</strong> {new Date(detalle.fecha_entrega).toLocaleString()}</Col>
                                <Col md={6}><strong>Documento:</strong> {detalle.tipo_documento} {detalle.numero_documento}</Col>
                                <Col md={6}><strong>Patente:</strong> {detalle.patente_vehiculo || '-'}</Col>
                            </Row>
                            <Table striped bordered size="sm">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Gas</th>
                                        <th>Cantidad</th>
                                        <th>Destino</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(detalle.detalle || []).map(d => (
                                        <tr key={d.id_detalle}>
                                            <td className="fw-bold">{d.codigo_interno}</td>
                                            <td>{d.gas}</td>
                                            <td>{d.cantidad}</td>
                                            <td>{d.destino}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetalle(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Entregas;
