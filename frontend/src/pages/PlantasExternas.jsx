import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { plantasExternasAPI } from '../services/api';

const PlantasExternas = () => {
    const [plantas, setPlantas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPlanta, setEditingPlanta] = useState(null);
    const [formData, setFormData] = useState({ 
        rut: '', razon_social: '', direccion: '', 
        persona_contacto: '', telefono: '', email: '', activa: true 
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadPlantas(); }, []);

    const loadPlantas = async () => {
        try {
            const res = await plantasExternasAPI.getAllIncluyendoInactivas();
            setPlantas(res.data);
        } catch (err) {
            setError('Error cargando plantas externas');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingPlanta(null);
        setFormData({ rut: '', razon_social: '', direccion: '', persona_contacto: '', telefono: '', email: '', activa: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.rut || !formData.razon_social) return setError('RUT y Razón Social requeridos');
            if (editingPlanta) {
                await plantasExternasAPI.update(editingPlanta.id_planta, formData);
            } else {
                await plantasExternasAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            loadPlantas();
        } catch (err) {
            setError(err.response?.data?.error || 'Error guardando planta');
        }
    };

    const handleEdit = (planta) => {
        setEditingPlanta(planta);
        setFormData({
            rut: planta.rut,
            razon_social: planta.razon_social,
            direccion: planta.direccion || '',
            persona_contacto: planta.persona_contacto || '',
            telefono: planta.telefono || '',
            email: planta.email || '',
            activa: planta.activa,
        });
        setShowModal(true);
    };

    const handleToggleActiva = async (planta) => {
        try {
            await plantasExternasAPI.update(planta.id_planta, { ...planta, activa: !planta.activa });
            loadPlantas();
        } catch (err) {
            setError(err.response?.data?.error || 'Error actualizando planta');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de desactivar esta planta externa?')) return;
        try {
            await plantasExternasAPI.delete(id);
            loadPlantas();
        } catch (err) {
            setError(err.response?.data?.error || 'Error desactivando planta');
        }
    };

    const handleClose = () => {
        setShowModal(false);
        resetForm();
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Plantas Externas de Llenado</h2>
                <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>Nueva Planta</Button>
            </div>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>RUT</th>
                        <th>Razón Social</th>
                        <th>Dirección</th>
                        <th>Contacto</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Activa</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {plantas.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted">No hay plantas externas registradas</td></tr>
                    )}
                    {plantas.map(p => (
                        <tr key={p.id_planta}>
                            <td>{p.rut}</td>
                            <td className="fw-bold">{p.razon_social}</td>
                            <td>{p.direccion || '-'}</td>
                            <td>{p.persona_contacto || '-'}</td>
                            <td>{p.telefono || '-'}</td>
                            <td>{p.email || '-'}</td>
                            <td>
                                <Badge bg={p.activa ? 'success' : 'danger'}>{p.activa ? 'Sí' : 'No'}</Badge>
                            </td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(p)}>Editar</Button>
                                <Button 
                                    variant={p.activa ? 'outline-warning' : 'outline-success'}
                                    size="sm"
                                    className="me-2"
                                    onClick={() => handleToggleActiva(p)}
                                >
                                    {p.activa ? 'Desactivar' : 'Activar'}
                                </Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(p.id_planta)}>Eliminar</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingPlanta ? 'Editar Planta Externa' : 'Nueva Planta Externa'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>RUT *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.rut}
                                onChange={e => setFormData({ ...formData, rut: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Razón Social *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.razon_social}
                                onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Dirección</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.direccion}
                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Persona de Contacto</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.persona_contacto}
                                onChange={e => setFormData({ ...formData, persona_contacto: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
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

export default PlantasExternas;