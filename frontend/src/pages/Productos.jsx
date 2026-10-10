import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { productosAPI } from '../services/api';

const emptyForm = { nombre: '', descripcion: '', unidad_medida: 'M3', precio_unitario: '', stock_disponible: '', stock_minimo: '' };

const Productos = () => {
    const [productos, setProductos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProducto, setEditingProducto] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadProductos(); }, []);

    const loadProductos = async () => {
        try {
            const res = await productosAPI.getAll();
            setProductos(res.data);
        } catch (err) {
            setError('Error cargando productos');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingProducto(null);
        setFormData(emptyForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                precio_unitario: parseFloat(formData.precio_unitario) || 0,
                stock_disponible: parseFloat(formData.stock_disponible) || 0,
                stock_minimo: parseFloat(formData.stock_minimo) || 0,
            };
            if (editingProducto) {
                await productosAPI.update(editingProducto.id_producto, data);
            } else {
                await productosAPI.create(data);
            }
            setShowModal(false);
            resetForm();
            loadProductos();
        } catch (err) {
            setError(err.response?.data?.error || 'Error guardando producto');
        }
    };

    const handleEdit = (producto) => {
        setEditingProducto(producto);
        setFormData({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            unidad_medida: producto.unidad_medida,
            precio_unitario: producto.precio_unitario ?? '',
            stock_disponible: producto.stock_disponible ?? '',
            stock_minimo: producto.stock_minimo ?? '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este producto?')) return;
        try {
            await productosAPI.delete(id);
            loadProductos();
        } catch (err) {
            setError(err.response?.data?.error || 'Error eliminando producto');
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Productos (Gases)</h2>
                <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>Nuevo Producto</Button>
            </div>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Unidad de Medida</th>
                        <th>Precio Unitario</th>
                        <th>Stock Disponible</th>
                        <th>Stock Mínimo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.length === 0 && (
                        <tr><td colSpan={7} className="text-center text-muted">No hay productos registrados</td></tr>
                    )}
                    {productos.map(producto => (
                        <tr key={producto.id_producto}>
                            <td className="fw-bold">{producto.nombre}</td>
                            <td>{producto.descripcion || '-'}</td>
                            <td>{producto.unidad_medida}</td>
                            <td>${producto.precio_unitario}</td>
                            <td>
                                <Badge bg={Number(producto.stock_disponible) <= Number(producto.stock_minimo) ? 'danger' : 'success'}>
                                    {producto.stock_disponible}
                                </Badge>
                            </td>
                            <td>{producto.stock_minimo}</td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(producto)}>Editar</Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(producto.id_producto)}>Eliminar</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre *</Form.Label>
                            <Form.Control type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control as="textarea" rows={2} value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Unidad de Medida *</Form.Label>
                                    <Form.Select value={formData.unidad_medida} onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })} required>
                                        <option value="M3">M3 (Metros cúbicos)</option>
                                        <option value="Kilos">Kilos</option>
                                        <option value="Litros">Litros</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio Unitario</Form.Label>
                                    <Form.Control type="number" step="0.01" min="0" value={formData.precio_unitario} onChange={e => setFormData({ ...formData, precio_unitario: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock Disponible *</Form.Label>
                                    <Form.Control type="number" step="0.01" min="0" value={formData.stock_disponible} onChange={e => setFormData({ ...formData, stock_disponible: e.target.value })} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock Mínimo *</Form.Label>
                                    <Form.Control type="number" step="0.01" min="0" value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })} required />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</Button>
                        <Button variant="primary" type="submit">Guardar</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default Productos;
