import { useState, useEffect } from 'react';
import { Tabs, Tab, Table, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { llenadosAPI, trabajadoresAPI, productosAPI } from '../services/api';

const destinoVariant = {
    'Retiro inmediato': 'success',
    'Bodega temporal': 'info',
};

const Llenados = () => {
    const [pendientes, setPendientes] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [llenadores, setLlenadores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [formData, setFormData] = useState({
        id_llenador: '',
        gas_llenado: '',
        cantidad: '',
        destino: 'Retiro inmediato',
    });

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [pendRes, histRes, trabRes, prodRes] = await Promise.all([
                llenadosAPI.getPendientes(),
                llenadosAPI.getAll(),
                trabajadoresAPI.getByCargo('Llenador'),
                productosAPI.getAll(),
            ]);
            setPendientes(pendRes.data);
            setHistorial(histRes.data);
            setLlenadores(trabRes.data.filter(t => t.activo));
            setProductos(prodRes.data.filter(p => Number(p.stock_disponible) > 0));
        } catch (err) {
            setError('Error cargando datos de llenados');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (pendiente) => {
        setSeleccionado(pendiente);
        setFormData({ id_llenador: '', gas_llenado: '', cantidad: '', destino: 'Retiro inmediato' });
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

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Tabs defaultActiveKey="pendientes" className="mb-3">
                <Tab eventKey="pendientes" title={`Pendientes (${pendientes.length})`}>
                    <Table striped hover responsive>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th>Gas Solicitado</th>
                                <th>Comprobante</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendientes.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted">No hay cilindros pendientes de llenado</td></tr>
                            )}
                            {pendientes.map(p => (
                                <tr key={p.id_detalle}>
                                    <td className="fw-bold">{p.codigo_interno}</td>
                                    <td>{p.cliente}</td>
                                    <td>{p.gas_solicitado_nombre}</td>
                                    <td>{p.numero_comprobante}</td>
                                    <td>
                                        <Button variant="primary" size="sm" onClick={() => openModal(p)}>Llenar</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Tab>
                <Tab eventKey="historial" title={`Historial (${historial.length})`}>
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
                            </tr>
                        </thead>
                        <tbody>
                            {historial.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted">Sin llenados registrados</td></tr>
                            )}
                            {historial.map(l => (
                                <tr key={l.id_llenado}>
                                    <td className="fw-bold">{l.codigo_interno}</td>
                                    <td>{l.gas_nombre}</td>
                                    <td>{l.cantidad}</td>
                                    <td>{l.llenador_nombre}</td>
                                    <td>{l.cliente}</td>
                                    <td>{new Date(l.fecha_llenado).toLocaleString()}</td>
                                    <td><Badge bg={destinoVariant[l.destino] || 'secondary'}>{l.destino}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
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
                            <Form.Label>Gas a llenar *</Form.Label>
                            <Form.Select value={formData.gas_llenado} onChange={e => setFormData({ ...formData, gas_llenado: e.target.value })} required>
                                <option value="">Seleccione un gas...</option>
                                {productos.map(p => (
                                    <option key={p.id_producto} value={p.id_producto}>
                                        {p.nombre} (Stock: {p.stock_disponible} {p.unidad_medida})
                                    </option>
                                ))}
                            </Form.Select>
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
