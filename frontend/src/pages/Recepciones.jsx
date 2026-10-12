import { useState, useEffect } from 'react';
import { Table, Button, Modal, Alert, Badge, Spinner, Form, InputGroup } from 'react-bootstrap';
import { recepcionesAPI } from '../services/api';
import { generateComprobanteRecepcionPDF } from '../services/pdfService';

const estadoVariant = {
    'Abierta': 'info',
    'Cerrada': 'secondary',
    'Cancelada': 'danger',
};

const Recepciones = () => {
    const [recepciones, setRecepciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [showDetalle, setShowDetalle] = useState(false);
    const [detalleActual, setDetalleActual] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const res = await recepcionesAPI.getAll();
            setRecepciones(res.data);
        } catch (err) {
            setError('Error cargando comprobantes de recepción');
        } finally {
            setLoading(false);
        }
    };

    const verDetalle = async (r) => {
        setCargandoDetalle(true);
        setError('');
        try {
            const res = await recepcionesAPI.getById(r.id_recepcion);
            setDetalleActual(res.data);
            setShowDetalle(true);
        } catch (err) {
            setError('Error cargando el comprobante');
        } finally {
            setCargandoDetalle(false);
        }
    };

    const clienteDe = (r) => ({
        razon_social: r.cliente, rut: r.rut, direccion: r.direccion,
        comuna: r.comuna, telefono: r.telefono, email: r.email,
    });

    const generarPDF = (r, detalle) => generateComprobanteRecepcionPDF(
        r,
        detalle,
        clienteDe(r),
        { nombre: r.recepcionista }
    );

    const descargarPDF = async (r) => {
        try {
            const res = await recepcionesAPI.getById(r.id_recepcion);
            const pdf = generarPDF(res.data, res.data.detalle);
            pdf.download(`Comprobante_Recepcion_${res.data.numero_comprobante}.pdf`);
        } catch (err) {
            setError('Error generando PDF: ' + (err.message || ''));
        }
    };

    const imprimirPDF = async (r) => {
        try {
            const res = await recepcionesAPI.getById(r.id_recepcion);
            const pdf = generarPDF(res.data, res.data.detalle);
            pdf.print();
        } catch (err) {
            setError('Error imprimiendo PDF: ' + (err.message || ''));
        }
    };

    const term = busqueda.trim().toLowerCase();
    const filtradas = term
        ? recepciones.filter(r =>
            [r.numero_comprobante, r.cliente, r.recepcionista].some(v => String(v || '').toLowerCase().includes(term)))
        : recepciones;

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Comprobantes de Recepción</h2>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <InputGroup style={{ maxWidth: 420 }}>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                        placeholder="Buscar por N° comprobante, cliente o recepcionista..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </InputGroup>
                <span className="text-muted small">{filtradas.length} de {recepciones.length} comprobante(s)</span>
            </div>

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>N° Comprobante</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Recepcionista</th>
                        <th className="text-center">Cilindros</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filtradas.length === 0 && (
                        <tr><td colSpan={7} className="text-center text-muted">
                            {recepciones.length === 0 ? 'No hay comprobantes de recepción registrados' : 'No hay comprobantes que coincidan con la búsqueda'}
                        </td></tr>
                    )}
                    {filtradas.map(r => (
                        <tr key={r.id_recepcion}>
                            <td className="fw-bold">{r.numero_comprobante}</td>
                            <td>{r.fecha_recepcion ? new Date(r.fecha_recepcion).toLocaleString() : '-'}</td>
                            <td>{r.cliente}</td>
                            <td>{r.recepcionista}</td>
                            <td className="text-center">{r.total_cilindros}</td>
                            <td><Badge bg={estadoVariant[r.estado] || 'secondary'}>{r.estado}</Badge></td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => verDetalle(r)}>
                                    Ver
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => descargarPDF(r)}>
                                    PDF
                                </Button>
                                <Button variant="outline-dark" size="sm" onClick={() => imprimirPDF(r)}>
                                    Imprimir
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showDetalle} onHide={() => setShowDetalle(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Comprobante {detalleActual?.numero_comprobante}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cargandoDetalle && <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>}
                    {detalleActual && (
                        <>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <div><strong>Cliente:</strong> {detalleActual.cliente}</div>
                                    <div><strong>RUT:</strong> {detalleActual.rut || '-'}</div>
                                    <div><strong>Dirección:</strong> {detalleActual.direccion || '-'}</div>
                                </div>
                                <div className="col-md-6">
                                    <div><strong>Fecha:</strong> {detalleActual.fecha_recepcion ? new Date(detalleActual.fecha_recepcion).toLocaleString() : '-'}</div>
                                    <div><strong>Recepcionista:</strong> {detalleActual.recepcionista}</div>
                                    <div><strong>Estado:</strong> {detalleActual.estado}</div>
                                    <div><strong>Observaciones:</strong> {detalleActual.observaciones || '-'}</div>
                                </div>
                            </div>

                            <Table striped bordered size="sm" responsive>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Gas</th>
                                        <th>Cant. a llenar (L)</th>
                                        <th>Estado recibido</th>
                                        <th>Prueba Hidr.</th>
                                        <th>Tipo llenado</th>
                                        <th>Planta ext.</th>
                                        <th>Procesado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(detalleActual.detalle || []).map((d, i) => (
                                        <tr key={d.id_detalle}>
                                            <td>{i + 1}</td>
                                            <td className="fw-bold">{d.codigo_interno}</td>
                                            <td>{d.gas_actual || d.gas_nombre || d.gas_solicitado_nombre}</td>
                                            <td>{d.cantidad_llenado != null ? `${d.cantidad_llenado} L` : '-'}</td>
                                            <td>{d.estado_recibido}</td>
                                            <td>{d.prueba_hidraulica}</td>
                                            <td>{d.tipo_llenado}</td>
                                            <td>{d.planta_externa || '-'}</td>
                                            <td>{d.procesado ? <Badge bg="success">Sí</Badge> : <Badge bg="secondary">No</Badge>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetalle(false)}>Cerrar</Button>
                    <Button
                        variant="outline-secondary"
                        disabled={!detalleActual}
                        onClick={() => detalleActual && imprimirPDF(detalleActual)}
                    >
                        Imprimir
                    </Button>
                    <Button
                        variant="primary"
                        disabled={!detalleActual}
                        onClick={() => detalleActual && descargarPDF(detalleActual)}
                    >
                        Descargar PDF
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Recepciones;
