import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { envasesAPI, productosAPI, ordenesTrabajoAPI, recepcionesAPI } from '../services/api';

const estadoVariant = {
    'Disponible': 'success',
    'Vacio': 'secondary',
    'Lleno': 'primary',
    'En bodega': 'info',
    'En reparacion': 'warning',
    'Entregado': 'dark',
};

const Dashboard = () => {
    const [resumen, setResumen] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [otsPendientes, setOtsPendientes] = useState([]);
    const [recepciones, setRecepciones] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [resumenRes, alertasRes, otsRes, recepRes] = await Promise.all([
                envasesAPI.getResumen(),
                productosAPI.getStockAlertas(),
                ordenesTrabajoAPI.getPending(),
                recepcionesAPI.getAll(),
            ]);
            setResumen(resumenRes.data);
            setAlertas(alertasRes.data);
            setOtsPendientes(otsRes.data);
            setRecepciones(recepRes.data.slice(0, 6));
        } catch (err) {
            setError('Error cargando datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Dashboard</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Row className="mb-4">
                {resumen.map(item => (
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
            </Row>

            <Row>
                <Col lg={7} className="mb-4">
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
                <Col lg={5} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header as="h5">Alertas de Stock</Card.Header>
                        <Table striped hover responsive className="mb-0">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Stock</th>
                                    <th>Mínimo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alertas.length === 0 && (
                                    <tr><td colSpan={3} className="text-center text-success">Todo el stock está sobre el mínimo</td></tr>
                                )}
                                {alertas.map(p => (
                                    <tr key={p.id_producto}>
                                        <td>{p.nombre}</td>
                                        <td><Badge bg={p.stock_disponible <= 0 ? 'danger' : 'warning'}>{p.stock_disponible}</Badge></td>
                                        <td>{p.stock_minimo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
