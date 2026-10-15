import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { envasesAPI, productosAPI, ordenesTrabajoAPI, recepcionesAPI } from '../services/api';

const estadoVariant = {
    'Disponible': 'success',
    'Vacio': 'secondary',
    'Lleno': 'primary',
    'En bodega': 'info',
    'En reparacion': 'warning',
    'Entregado': 'dark',
    'En planta externa': 'info',
    'En OT local': 'warning',
    'Por entregar': 'primary',
    'Baja': 'danger',
};

const situacionVariant = {
    'En llenado externo': 'info',
    'En reparación/pintura local': 'warning',
    'Listo para despacho': 'success',
};

const Dashboard = () => {
    const [resumen, setResumen] = useState([]);
    const [pendientesEntrega, setPendientesEntrega] = useState([]);
    const [otsPendientes, setOtsPendientes] = useState([]);
    const [recepciones, setRecepciones] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [resumenRes, pendRes, otsRes, recepRes] = await Promise.all([
                envasesAPI.getResumen(),
                envasesAPI.getPendientesEntrega(),
                ordenesTrabajoAPI.getPending(),
                recepcionesAPI.getAll(),
            ]);
            setResumen(resumenRes.data);
            setPendientesEntrega(pendRes.data);
            setOtsPendientes(otsRes.data);
            setRecepciones(recepRes.data.slice(0, 6));
        } catch (err) {
            setError('Error cargando datos del dashboard');
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    const totalPendientes = pendientesEntrega.length;
    const enPlantaExterna = pendientesEntrega.filter(c => c.situacion === 'En llenado externo').length;
    const enOTLocal = pendientesEntrega.filter(c => c.situacion === 'En reparación/pintura local').length;
    const porEntregar = pendientesEntrega.filter(c => c.situacion === 'Listo para despacho').length;
    // Cilindros dados de baja (prueba hidráulica rechazada en local)
    const totalBajas = resumen.find(r => r.estado === 'Baja')?.cantidad || 0;
    const resumenEstados = resumen.filter(r => r.estado !== 'Baja');

    return (
        <div>
            <h2 className="mb-4">Dashboard</h2>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            {/* Resumen de estados de cilindros */}
            <Row className="mb-4">
                {resumenEstados.map(item => (
                    <Col md={3} sm={6} key={item.estado} className="mb-3">
                        <Card className="text-center h-100 shadow-sm">
                            <Card.Body>
                                <Card.Title as="div" className="display-6">{item.cantidad}</Card.Title>
                                <Card.Text>
                                    <Badge bg={estadoVariant[item.estado] || 'light'}>{item.estado}</Badge>
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
                <Col md={3} sm={6} className="mb-3">
                    <Card className="text-center h-100 shadow-sm border-warning">
                        <Card.Body>
                            <Card.Title as="div" className="display-6 text-warning">{otsPendientes.length}</Card.Title>
                            <Card.Text><Badge bg="warning">OTs Pendientes</Badge></Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <Card className="text-center h-100 shadow-sm border-primary">
                        <Card.Body>
                            <Card.Title as="div" className="display-6 text-primary">{totalPendientes}</Card.Title>
                            <Card.Text><Badge bg="primary">Por Entregar</Badge></Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <Card as={Link} to="/cilindros-baja" className="text-center h-100 shadow-sm border-danger text-decoration-none">
                        <Card.Body>
                            <Card.Title as="div" className="display-6 text-danger">{totalBajas}</Card.Title>
                            <Card.Text><Badge bg="danger">Cilindros de Baja</Badge></Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Cilindros Pendientes de Entrega */}
            <Row>
                <Col lg={7} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header as="h5">
                            <span>Cilindros Pendientes de Entrega ({totalPendientes})</span>
                            <span className="float-end text-muted small">
                                Externa: {enPlantaExterna} | OT Local: {enOTLocal} | Listos: {porEntregar}
                            </span>
                        </Card.Header>
                        <Table striped hover responsive className="mb-0">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Gas</th>
                                    <th>Cliente</th>
                                    <th>Situación</th>
                                    <th>Planta/OT</th>
                                    <th>Fecha Recepción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendientesEntrega.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-success">No hay cilindros pendientes de entrega</td></tr>
                                )}
                                {pendientesEntrega.slice(0, 10).map(c => (
                                    <tr key={c.id_envase}>
                                        <td className="fw-bold">{c.codigo_interno}</td>
                                        <td>{c.gas}</td>
                                        <td>{c.cliente || '-'}</td>
                                        <td>
                                            <Badge bg={situacionVariant[c.situacion] || 'secondary'}>{c.situacion}</Badge>
                                        </td>
                                        <td>{c.planta_externa || (c.situacion === 'En reparación/pintura local' ? 'OT Local' : '-')}</td>
                                        <td>{c.fecha_recepcion ? new Date(c.fecha_recepcion).toLocaleDateString() : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
                <Col lg={5} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header as="h5">Últimas Recepciones</Card.Header>
                        <Table striped hover responsive className="mb-0">
                            <thead>
                                <tr>
                                    <th>Comprobante</th>
                                    <th>Cliente</th>
                                    <th>Recepcionista</th>
                                    <th>Cilindros</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recepciones.length === 0 && (
                                    <tr><td colSpan={5} className="text-center">Sin recepciones registradas</td></tr>
                                )}
                                {recepciones.map(r => (
                                    <tr key={r.id_recepcion}>
                                        <td>{r.numero_comprobante}</td>
                                        <td>{r.cliente}</td>
                                        <td>{r.recepcionista}</td>
                                        <td>{r.total_cilindros}</td>
                                        <td>{new Date(r.fecha_recepcion).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>

            {/* OTs con fecha de entrega estimada próxima */}
            {otsPendientes.length > 0 && (
                <Row>
                    <Col lg={12} className="mb-4">
                        <Card className="shadow-sm">
                            <Card.Header as="h5">Órdenes de Trabajo con Fecha de Entrega Estimada</Card.Header>
                            <Table striped hover responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Cilindro</th>
                                        <th>Gas</th>
                                        <th>Cliente</th>
                                        <th>Tipo</th>
                                        <th>F. Est. Entrega</th>
                                        <th>Estado</th>
                                        <th>Asignado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {otsPendientes.filter(o => o.fecha_entrega_estimada).slice(0, 10).map(o => (
                                        <tr key={o.id_orden}>
                                            <td>{o.id_orden}</td>
                                            <td className="fw-bold">{o.codigo_interno}</td>
                                            <td>{o.gas}</td>
                                            <td>{o.cliente}</td>
                                            <td>{o.tipo_trabajo}</td>
                                            <td>
                                                <Badge bg={new Date(o.fecha_entrega_estimada) < new Date() ? 'danger' : 'primary'}>
                                                    {new Date(o.fecha_entrega_estimada).toLocaleDateString()}
                                                </Badge>
                                            </td>
                                            <td><Badge bg={estadoVariant[o.estado] || 'secondary'}>{o.estado}</Badge></td>
                                            <td>{o.asignado_nombre || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default Dashboard;