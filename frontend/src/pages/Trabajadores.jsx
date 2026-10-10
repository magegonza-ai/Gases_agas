import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { trabajadoresAPI } from '../services/api';

const Trabajadores = () => {
    const [trabajadores, setTrabajadores] = useState([]);
    const [cargosDisponibles, setCargosDisponibles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTrabajador, setEditingTrabajador] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', cargos: [], telefono: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadInitial(); }, []);

    const loadInitial = async () => {
        try {
            const [resTrab, resCargos] = await Promise.all([
                trabajadoresAPI.getAll(), trabajadoresAPI.getCargos()
            ]);
            setTrabajadores(resTrab.data);
            setCargosDisponibles(resCargos.data);
        } catch (err) {
            setError('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingTrabajador(null);
        setFormData({ nombre: '', cargos: [], telefono: '' });
    };

    const toggleCargo = (cargoNombre) => {
        const current = formData.cargos;
        if (current.includes(cargoNombre)) {
            setFormData({ ...formData, cargos: current.filter(c => c !== cargoNombre) });
        } else {
            setFormData({ ...formData, cargos: [...current, cargoNombre] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTrabajador) {
                await trabajadoresAPI.update(editingTrabajador.id_trabajador, formData);
            } else {
                await trabajadoresAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            loadInitial();
        } catch (err) {
            setError(err.response?.data?.error || 'Error guardando trabajador');
        }
    };

    const handleEdit = (trabajador) => {
        setEditingTrabajador(trabajador);
        const cargosArray = trabajador.cargos ? trabajador.cargos.split(', ') : [];
        setFormData({
            nombre: trabajador.nombre,
            cargos: cargosArray,
            telefono: trabajador.telefono || '',
        });
        setShowModal(true);
    };

    const toggleActivo = async (trabajador) => {
        try {
            const cargosArray = trabajador.cargos ? trabajador.cargos.split(', ') : [];
            await trabajadoresAPI.update(trabajador.id_trabajador, {
                nombre: trabajador.nombre,
                cargos: cargosArray,
                telefono: trabajador.telefono,
                activo: !trabajador.activo,
            });
            loadInitial();
        } catch (err) {
            setError(err.response?.data?.error || 'Error actualizando trabajador');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este trabajador?')) return;
        try {
            await trabajadoresAPI.delete(id);
            loadInitial();
        } catch (err) {
            setError(err.response?.data?.error || 'Error eliminando trabajador');
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
                <h2>Trabajadores</h2>
                <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>Nuevo Trabajador</Button>
            </div>

            {error ? <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert> : null}

            <Table striped hover responsive>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Cargos</th>
                        <th>Teléfono</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {trabajadores.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted">No hay trabajadores registrados</td></tr>
                    )}
                    {trabajadores.map(t => {
                        const cargosArray = t.cargos ? t.cargos.split(', ') : [];
                        return (
                            <tr key={t.id_trabajador}>
                                <td className="fw-bold">{t.nombre}</td>
                                <td>
                                    {cargosArray.map((c, i) => (
                                        <Badge key={i} bg="secondary" className="me-1">{c}</Badge>
                                    ))}
                                </td>
                                <td>{t.telefono || '-'}</td>
                                <td>
                                    <Badge bg={t.activo ? 'success' : 'danger'}>{t.activo ? 'Sí' : 'No'}</Badge>
                                </td>
                                <td>
                                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(t)}>Editar</Button>
                                    <Button
                                        variant={t.activo ? 'outline-warning' : 'outline-success'}
                                        size="sm"
                                        className="me-2"
                                        onClick={() => toggleActivo(t)}
                                    >
                                        {t.activo ? 'Desactivar' : 'Activar'}
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(t.id_trabajador)}>Eliminar</Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingTrabajador ? 'Editar Trabajador' : 'Nuevo Trabajador'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Cargos * (seleccione uno o más)</Form.Label>
                            <div className="border rounded p-3">
                                <Row>
                                    {cargosDisponibles.map(c => (
                                        <Col md={6} key={c.id_cargo}>
                                            <Form.Check
                                                type="checkbox"
                                                label={c.nombre}
                                                checked={formData.cargos.includes(c.nombre)}
                                                onChange={() => toggleCargo(c.nombre)}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                            {formData.cargos.length === 0 && (
                                <small className="text-danger">Debe seleccionar al menos un cargo</small>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={formData.cargos.length === 0}>Guardar</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default Trabajadores;
