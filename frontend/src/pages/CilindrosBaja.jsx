import { useState, useEffect } from 'react';
import { Table, Button, Modal, Alert, Badge, Spinner, Form, InputGroup } from 'react-bootstrap';
import { certificadosBajaAPI } from '../services/api';
import { generateCertificadoBajaPDF } from '../services/pdfService';

const CilindrosBaja = () => {
    const [certificados, setCertificados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [showDetalle, setShowDetalle] = useState(false);
    const [detalleActual, setDetalleActual] = useState(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const res = await certificadosBajaAPI.getAll();
            setCertificados(res.data);
        } catch {
            setError('Error cargando certificados de baja');
        } finally {
            setLoading(false);
        }
    };

    const descargarPDF = (c) => {
        try {
            generateCertificadoBajaPDF(c).download(`Certificado_Baja_${c.numero_certificado}.pdf`);
        } catch (err) {
            setError('Error generando PDF: ' + (err.message || ''));
        }
    };

    const imprimirPDF = (c) => {
        try {
            generateCertificadoBajaPDF(c).print();
        } catch (err) {
            setError('Error imprimiendo PDF: ' + (err.message || ''));
        }
    };

    const term = busqueda.trim().toLowerCase();
    const filtrados = term
        ? certificados.filter(c =>
            [c.numero_certificado, c.codigo_interno, c.gas_nombre, c.cliente_nombre, c.responsable_nombre, c.glosa]
                .some(v => String(v || '').toLowerCase().includes(term)))
        : certificados;

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Cilindros de Baja</h2>

            <Alert variant="warning" className="py-2">
                Los cilindros cuya prueba hidráulica fue <b>rechazada</b> en la planta local quedan
                <b> dados de baja</b> y no pueden recepcionarse ni llenarse nuevamente. Aquí se guardan sus certificados.
            </Alert>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <InputGroup style={{ maxWidth: 460 }}>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                        placeholder="Buscar por N° certificado, cilindro, gas, cliente o responsable..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </InputGroup>
                <span className="text-muted small">{filtrados.length} de {certificados.length} certificado(s)</span>
            </div>

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>N° Certificado</th>
                        <th>Fecha</th>
                        <th>N° Cilindro</th>
                        <th>Gas</th>
                        <th>Cliente</th>
                        <th>Responsable</th>
                        <th>Glosa</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted">
                            {certificados.length === 0
                                ? 'No hay cilindros dados de baja registrados'
                                : 'No hay certificados que coincidan con la búsqueda'}
                        </td></tr>
                    )}
                    {filtrados.map(c => (
                        <tr key={c.id_certificado}>
                            <td className="fw-bold">{c.numero_certificado}</td>
                            <td>{c.fecha ? new Date(c.fecha).toLocaleString() : '-'}</td>
                            <td className="fw-bold">{c.codigo_interno}</td>
                            <td>{c.gas_nombre || '-'}</td>
                            <td>{c.cliente_nombre || '-'}</td>
                            <td>{c.responsable_nombre || '-'}</td>
                            <td style={{ maxWidth: 260 }}>
                                <span className="text-truncate d-inline-block" style={{ maxWidth: 250 }} title={c.glosa}>
                                    {c.glosa}
                                </span>
                            </td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2"
                                    onClick={() => { setDetalleActual(c); setShowDetalle(true); }}>
                                    Ver
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => descargarPDF(c)}>
                                    PDF
                                </Button>
                                <Button variant="outline-dark" size="sm" onClick={() => imprimirPDF(c)}>
                                    Imprimir
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showDetalle} onHide={() => setShowDetalle(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Certificado {detalleActual?.numero_certificado}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detalleActual && (
                        <>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <div><strong>N° Cilindro:</strong> {detalleActual.codigo_interno}</div>
                                    <div><strong>Gas:</strong> {detalleActual.gas_nombre || '-'}</div>
                                    <div><strong>Capacidad:</strong> {detalleActual.capacidad != null ? `${detalleActual.capacidad} L` : '-'}</div>
                                    <div><strong>Cliente:</strong> {detalleActual.cliente_nombre || '-'}</div>
                                </div>
                                <div className="col-md-6">
                                    <div><strong>Fecha:</strong> {detalleActual.fecha ? new Date(detalleActual.fecha).toLocaleString() : '-'}</div>
                                    <div><strong>Orden de Trabajo:</strong> {detalleActual.id_orden_trabajo ? `OT-${String(detalleActual.id_orden_trabajo).padStart(5, '0')}` : '-'}</div>
                                    <div><strong>Responsable:</strong> {detalleActual.responsable_nombre || '-'}</div>
                                    <div><strong>Cargo:</strong> {detalleActual.responsable_cargo || '-'}</div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <Badge bg="danger" className="me-2">Prueba hidráulica: Rechazada</Badge>
                                <Badge bg="dark">Cilindro dado de baja</Badge>
                            </div>
                            <h6>Glosa / detalle</h6>
                            <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>{detalleActual.glosa}</p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetalle(false)}>Cerrar</Button>
                    <Button variant="outline-secondary" disabled={!detalleActual}
                        onClick={() => detalleActual && imprimirPDF(detalleActual)}>
                        Imprimir
                    </Button>
                    <Button variant="primary" disabled={!detalleActual}
                        onClick={() => detalleActual && descargarPDF(detalleActual)}>
                        Descargar PDF
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CilindrosBaja;
