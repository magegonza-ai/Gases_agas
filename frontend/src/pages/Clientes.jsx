import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { clientesAPI } from '../services/api';

const emptyForm = { razon_social: '', rut: '', direccion: '', comuna: '', telefono: '', email: '' };

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadClientes(); }, []);

    const loadClientes = async () => {
        try {
            const res = await clientesAPI.getAll();
            setClientes(res.data);
        } catch (err) {
            setError('Error cargando clientes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCliente) {
                await clientesAPI.update(editingCliente.id_cliente, formData);
            } else {
                await clientesAPI.create(formData);
            }
            handleClose();
            loadClientes();
        } catch (err) {
            setError(err.response?.data?.error || 'Error guardando cliente');
        }
    };

    const handleEdit = (cliente) => {
        setEditingCliente(cliente);
        setFormData({
            razon_social: cliente.razon_social,
            rut: cliente.rut,
            direccion: cliente.direccion || '',
            comuna: cliente.comuna || '',
            telefono: cliente.telefono || '',
            email: cliente.email || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
        try {
            await clientesAPI.delete(id);
            loadClientes();
        } catch (err) {
            setError(err.response?.data?.error || 'Error eliminando cliente');
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setEditingCliente(null);
        setFormData(emptyForm);
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Clientes</h2>
                <Button variant="primary" onClick={() => setShowModal(true)}>Nuevo Cliente</Button>
            </div>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>Razón Social</th>
                        <th>RUT</th>
                        <th>Dirección</th>
                        <th>Comuna</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {clientes.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted">No hay clientes registrados</td></tr>
                    )}
                    {clientes.map(cliente => (
                        <tr key={cliente.id_cliente}>
                            <td className="fw-bold">{cliente.razon_social}</td>
                            <td>{cliente.rut}</td>
                            <td>{cliente.direccion || '-'}</td>
                            <td>{cliente.comuna || '-'}</td>
                            <td>{cliente.telefono || '-'}</td>
                            <td>{cliente.email || '-'}</td>
                            <td><Badge bg={cliente.activo ? 'success' : 'danger'}>{cliente.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(cliente)}>Editar</Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(cliente.id_cliente)}>Eliminar</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Razón Social *</Form.Label>
                            <Form.Control type="text" value={formData.razon_social} onChange={e => setFormData({ ...formData, razon_social: e.target.value })} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>RUT *</Form.Label>
                            <Form.Control type="text" value={formData.rut} onChange={e => setFormData({ ...formData, rut: e.target.value })} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Dirección</Form.Label>
                            <Form.Control type="text" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Comuna</Form.Label>
                            <Form.Control type="text" value={formData.comuna} onChange={e => setFormData({ ...formData, comuna: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control type="text" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </Form.Group>
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

export default Clientes;
