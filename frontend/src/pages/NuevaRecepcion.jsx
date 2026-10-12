import { useState, useEffect } from 'react';
import { Form, Button, Table, Card, Row, Col, Alert, Badge, InputGroup, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { clientesAPI, trabajadoresAPI, productosAPI, envasesAPI, recepcionesAPI, plantasExternasAPI } from '../services/api';
import { generateComprobanteRecepcionPDF } from '../services/pdfService';

const estadosRecibido = ['Bueno', 'Regular', 'Danado'];
const opcionesPruebaHidraulica = ['Pendiente', 'Aprobado', 'Rechazado'];
const opcionesTipoLlenado = ['Local', 'Externo'];

const generarComprobante = () => {
    const f = new Date();
    const pad = n => String(n).padStart(2, '0');
    // Formato: REC-YYYYMMDD-#### (el número lo asigna el servidor secuencialmente por día)
    return `REC-${f.getFullYear()}${pad(f.getMonth()+1)}${pad(f.getDate())}-0000`;
};

const NuevaRecepcion = () => {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [recepcionistas, setRecepcionistas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [plantasExternas, setPlantasExternas] = useState([]);
    const [idCliente, setIdCliente] = useState('');
    const [idRecepcionista, setIdRecepcionista] = useState('');
    const [numeroComprobante, setNumeroComprobante] = useState(generarComprobante);
    const [observaciones, setObservaciones] = useState('');
    const [codigoBusqueda, setCodigoBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [cilindroActual, setCilindroActual] = useState(null);
    const [gasSolicitado, setGasSolicitado] = useState('');
    const [estadoRecibido, setEstadoRecibido] = useState('Bueno');
    const [requiereReparacion, setRequiereReparacion] = useState(false);
    const [pruebaHidraulica, setPruebaHidraulica] = useState('Pendiente');
    const [requierePintura, setRequierePintura] = useState(false);
    const [tipoLlenado, setTipoLlenado] = useState('Local');
    const [idPlantaExterna, setIdPlantaExterna] = useState('');
    const [cantidadLlenado, setCantidadLlenado] = useState('');
    const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
    const [observacionCilindro, setObservacionCilindro] = useState('');
    const [showCrear, setShowCrear] = useState(false);
    const [nuevoCil, setNuevoCil] = useState({ gas: '', capacidad: '', propiedad: 'Propiedad_cliente' });
    const [detalle, setDetalle] = useState([]);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [creando, setCreando] = useState(false);
    const [savedRecepcion, setSavedRecepcion] = useState(null);
    const [showPdfSuccess, setShowPdfSuccess] = useState(false);

    useEffect(() => { loadInitial(); }, []);

    const refrescarComprobante = async () => {
        try {
            const res = await recepcionesAPI.siguiente();
            if (res.data?.numero_comprobante) setNumeroComprobante(res.data.numero_comprobante);
        } catch { setNumeroComprobante(generarComprobante()); }
    };

    const loadInitial = async () => {
        try {
            const [cli, tra, pro, pla] = await Promise.all([
                clientesAPI.getAll(), 
                trabajadoresAPI.getByCargo('Recepcionista'), 
                productosAPI.getAll(),
                plantasExternasAPI.getAll()
            ]);
            setClientes(cli.data);
            setRecepcionistas(tra.data);
            setProductos(pro.data);
            setPlantasExternas(pla.data);
            refrescarComprobante();
        } catch (e) { setError('Error cargando datos'); }
    };

    const clienteSeleccionado = clientes.find(c => c.id_cliente === Number(idCliente));

    const buscarCilindro = async () => {
        setError(''); setShowCrear(false); setCilindroActual(null);
        if (!codigoBusqueda.trim()) return;
        setBuscando(true);
        try {
            const res = await envasesAPI.getByCodigo(codigoBusqueda.trim());
            setCilindroActual(res.data);
            setGasSolicitado(String(res.data.id_producto));
            setEstadoRecibido('Bueno');
            setRequiereReparacion(false);
            setPruebaHidraulica('Pendiente');
            setRequierePintura(false);
            setTipoLlenado('Local');
            setIdPlantaExterna('');
            setCantidadLlenado('');
            setFechaEntregaEstimada('');
            setObservacionCilindro('');
        } catch (err) {
            setShowCrear(true);
            setNuevoCil({ gas: '', capacidad: '', propiedad: 'Propiedad_cliente' });
        } finally { setBuscando(false); }
    };

    const crearYAgregar = async () => {
        setCreando(true); setError('');
        try {
            if (!nuevoCil.gas) { setError('Seleccione un gas'); setCreando(false); return; }
            const gasProd = Number(nuevoCil.gas);
            const propietarioId = nuevoCil.propiedad === 'Propiedad_empresa' ? null : (Number(idCliente) || null);
            const res = await envasesAPI.create({
                codigo_interno: codigoBusqueda.trim(), id_producto: gasProd,
                capacidad: nuevoCil.capacidad ? parseFloat(nuevoCil.capacidad) : null,
                propiedad: nuevoCil.propiedad, id_propietario: propietarioId, estado: 'Vacio',
            });
            const prod = productos.find(p => p.id_producto === gasProd);
            const nombreProp = nuevoCil.propiedad === 'Propiedad_empresa' ? 'Empresa' : (clienteSeleccionado ? clienteSeleccionado.razon_social : '');
            setDetalle([...detalle, {
                id_envase: res.data.id_envase, codigo_interno: res.data.codigo_interno,
                gas_actual: prod ? prod.nombre : '', propietario_nombre: nombreProp,
                gas_solicitado: gasProd, gas_solicitado_nombre: prod ? prod.nombre : '',
                cantidad_llenado: null, capacidad: res.data.capacidad || null,
                estado_recibido: 'Bueno', requiere_reparacion: false,
                prueba_hidraulica: 'Pendiente', requiere_pintura: false,
                tipo_llenado: 'Local', id_planta_externa: null,
                fecha_entrega_estimada: '', observaciones: '',
            }]);
            setShowCrear(false); setCilindroActual(null); setCodigoBusqueda('');
            setGasSolicitado(''); setEstadoRecibido('Bueno'); setRequiereReparacion(false);
            setPruebaHidraulica('Pendiente'); setRequierePintura(false); setTipoLlenado('Local');
            setIdPlantaExterna(''); setFechaEntregaEstimada(''); setObservacionCilindro('');
        } catch (err) {
            setError(err.response?.data?.error || 'Error creando cilindro');
        } finally { setCreando(false); }
    };

    const agregarCilindro = (e) => {
        e.preventDefault();
        if (!cilindroActual) { setError('No hay cilindro seleccionado'); return; }
        if (!gasSolicitado) { setError('Seleccione gas solicitado'); return; }
        const gasProd = Number(gasSolicitado);
        const prod = productos.find(p => p.id_producto === gasProd);
        const nombreProp = cilindroActual.propiedad === 'Propiedad_empresa' ? 'Empresa' : (clienteSeleccionado ? clienteSeleccionado.razon_social : '');
        const capacidadCil = cilindroActual.capacidad ? Number(cilindroActual.capacidad) : null;
        // La cantidad a llenar es obligatoria: queda registrada en el comprobante y la usa el llenado
        if (!cantidadLlenado || !(Number(cantidadLlenado) > 0)) {
            setError('Debe indicar la cantidad a llenar con que se solicita el cilindro');
            return;
        }
        if (capacidadCil && Number(cantidadLlenado) > capacidadCil) {
            setError(`La cantidad a llenar (${Number(cantidadLlenado)}) no puede ser mayor a la capacidad del cilindro (${capacidadCil} L)`);
            return;
        }
        setDetalle([...detalle, {
            id_envase: cilindroActual.id_envase, codigo_interno: cilindroActual.codigo_interno,
            gas_actual: cilindroActual.producto?.nombre || '', propietario_nombre: nombreProp,
            gas_solicitado: gasProd, gas_solicitado_nombre: prod ? prod.nombre : '',
            cantidad_llenado: cantidadLlenado ? Number(cantidadLlenado) : null,
            capacidad: capacidadCil,
            estado_recibido: estadoRecibido, requiere_reparacion: requiereReparacion,
            prueba_hidraulica: pruebaHidraulica, requiere_pintura: requierePintura,
            tipo_llenado: tipoLlenado, id_planta_externa: tipoLlenado === 'Externo' ? Number(idPlantaExterna) : null,
            fecha_entrega_estimada: fechaEntregaEstimada || null,
            observaciones: observacionCilindro,
        }]);
        setCilindroActual(null); setCodigoBusqueda(''); setGasSolicitado(''); setEstadoRecibido('Bueno');
        setRequiereReparacion(false); setPruebaHidraulica('Pendiente'); setRequierePintura(false);
        setTipoLlenado('Local'); setIdPlantaExterna(''); setCantidadLlenado('');
        setFechaEntregaEstimada(''); setObservacionCilindro(''); setError('');
    };

    const quitarCilindro = (idx) => {
        setDetalle(detalle.filter((_, i) => i !== idx));
    };

    const actualizarCilindro = (idx, campo, valor) => {
        const copia = [...detalle];
        copia[idx][campo] = valor;
        if (campo === 'gas_solicitado') {
            const prod = productos.find(p => p.id_producto === Number(valor));
            copia[idx].gas_solicitado_nombre = prod ? prod.nombre : '';
        }
        if (campo === 'tipo_llenado' && valor === 'Local') {
            copia[idx].id_planta_externa = null;
        }
        setDetalle(copia);
    };

    const enviarRecepcion = async (e) => {
        e.preventDefault();
        setError('');
        if (!idCliente || !idRecepcionista || detalle.length === 0) {
            setError('Complete cliente, recepcionista y al menos un cilindro'); return;
        }
        setGuardando(true);
        try {
            const response = await recepcionesAPI.create({
                id_cliente: Number(idCliente), id_recepcionista: Number(idRecepcionista),
                numero_comprobante: numeroComprobante, observaciones,
                detalle: detalle.map(d => ({
                    id_envase: d.id_envase, gas_solicitado: d.gas_solicitado,
                    cantidad_llenado: d.cantidad_llenado,
                    estado_recibido: d.estado_recibido, requiere_reparacion: d.requiere_reparacion,
                    prueba_hidraulica: d.prueba_hidraulica, requiere_pintura: d.requiere_pintura,
                    tipo_llenado: d.tipo_llenado, id_planta_externa: d.id_planta_externa,
                    fecha_entrega_estimada: d.fecha_entrega_estimada,
                    observaciones: d.observaciones,
                })),
            });
            
            // Guardar datos para PDF
            const recepcionData = {
                ...response.data,
                numero_comprobante: response.data.numero_comprobante || numeroComprobante,
                cliente: clienteSeleccionado,
                recepcionista: recepcionistas.find(r => r.id_trabajador === Number(idRecepcionista)),
                detalle: detalle,
            };
            setSavedRecepcion(recepcionData);
            setShowPdfSuccess(true);
            
        } catch (err) {
            const msg = err.response?.data?.error || '';
            if (msg.includes('UNIQUE') && msg.includes('numero_comprobante')) {
                setError('El número de comprobante ya existía. Se generó uno nuevo, vuelva a registrar.');
                setNumeroComprobante(generarComprobante());
            } else {
                setError(msg || 'Error guardando recepción');
            }
        } finally { setGuardando(false); }
    };

    const handleDownloadComprobante = () => {
        if (!savedRecepcion) return;
        try {
            const pdf = generateComprobanteRecepcionPDF(
                savedRecepcion,
                savedRecepcion.detalle,
                savedRecepcion.cliente,
                savedRecepcion.recepcionista
            );
            pdf.download(`Comprobante_Recepcion_${savedRecepcion.numero_comprobante}.pdf`);
            setShowPdfSuccess(false);
        } catch (err) {
            setError('Error generando PDF: ' + err.message);
        }
    };

    const handlePrintComprobante = () => {
        if (!savedRecepcion) return;
        try {
            const pdf = generateComprobanteRecepcionPDF(
                savedRecepcion,
                savedRecepcion.detalle,
                savedRecepcion.cliente,
                savedRecepcion.recepcionista
            );
            pdf.print();
            setShowPdfSuccess(false);
        } catch (err) {
            setError('Error imprimiendo PDF: ' + err.message);
        }
    };

    const handleNewRecepcion = () => {
        setSavedRecepcion(null);
        setShowPdfSuccess(false);
        setIdCliente('');
        setIdRecepcionista('');
        setObservaciones('');
        setDetalle([]);
        // Generar el siguiente número secuencial del día desde el servidor
        refrescarComprobante();
    };

    return (
        <div className="p-3">
            <h4 className="mb-3">Nueva Recepción de Cilindros</h4>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <Form onSubmit={enviarRecepcion}>
                <Row>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Comprobante</Form.Label>
                            <Form.Control value={numeroComprobante} disabled />
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Cliente</Form.Label>
                            <Form.Select value={idCliente} onChange={e => setIdCliente(e.target.value)} required>
                                <option value="">Seleccionar cliente</option>
                                {clientes.map(c => (
                                    <option key={c.id_cliente} value={c.id_cliente}>{c.razon_social}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Recepcionista</Form.Label>
                            <Form.Select value={idRecepcionista} onChange={e => setIdRecepcionista(e.target.value)} required>
                                <option value="">Seleccionar recepcionista</option>
                                {recepcionistas.map(t => (
                                    <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group className="mb-3">
                    <Form.Label>Observaciones generales</Form.Label>
                    <Form.Control as="textarea" rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                </Form.Group>

                <hr />
                <h5 className="mb-3">Buscar Cilindro</h5>
                <Row className="mb-3 align-items-end">
                    <Col md={3}>
                        <Form.Label>Código del cilindro</Form.Label>
                        <InputGroup>
                            <Form.Control value={codigoBusqueda} onChange={e => setCodigoBusqueda(e.target.value)} placeholder="Ej: CIL-001" />
                            <Button variant="outline-secondary" onClick={buscarCilindro} disabled={buscando}>
                                {buscando ? <Spinner animation="border" size="sm" /> : '🔍'}
                            </Button>
                        </InputGroup>
                    </Col>
                    {cilindroActual && (
                        <>
                            <Col md={2}>
                                <Form.Label>Gas actual</Form.Label>
                                <Form.Control value={cilindroActual.producto?.nombre || ''} disabled />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Propiedad</Form.Label>
                                <Form.Control value={cilindroActual.propiedad} disabled />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Estado</Form.Label>
                                <Badge bg={cilindroActual.estado === 'Vacio' ? 'warning' : cilindroActual.estado === 'Lleno' ? 'success' : 'secondary'} className="fs-6">
                                    {cilindroActual.estado}
                                </Badge>
                            </Col>
                        </>
                    )}
                </Row>

                {cilindroActual && (
                    <Card className="mb-3 p-3 bg-light">
                        <Row className="mb-2">
                            <Col>
                                <Badge bg="info" className="fs-6">
                                    Gas reconocido: {cilindroActual.producto?.nombre || 'Sin gas'} — Llenado confirmado con este gas
                                </Badge>
                            </Col>
                        </Row>
                        <Row className="mb-2">
                            <Col md={3}>
                                <Form.Label>Gas (confirmado, no editable)</Form.Label>
                                <Form.Control value={cilindroActual.producto?.nombre || ''} disabled />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Capacidad (L)</Form.Label>
                                <Form.Control value={cilindroActual.capacidad ?? ''} disabled />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Cantidad a llenar (L)</Form.Label>
                                <Form.Control type="number" min="1"
                                    max={cilindroActual.capacidad || undefined}
                                    value={cantidadLlenado}
                                    onChange={e => setCantidadLlenado(e.target.value)}
                                    placeholder={cilindroActual.capacidad ? `máx ${cilindroActual.capacidad}` : 'L'}
                                />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Estado recibido</Form.Label>
                                <Form.Select value={estadoRecibido} onChange={e => setEstadoRecibido(e.target.value)}>
                                    {estadosRecibido.map(e => <option key={e}>{e}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <Form.Label>Prueba hidráulica</Form.Label>
                                <Form.Select value={pruebaHidraulica} onChange={e => setPruebaHidraulica(e.target.value)}>
                                    {opcionesPruebaHidraulica.map(e => <option key={e}>{e}</option>)}
                                </Form.Select>
                            </Col>
                        </Row>
                        <Row className="mb-2">
                            <Col md={2}>
                                <Form.Check type="checkbox" label="Requiere pintura" checked={requierePintura}
                                    onChange={e => setRequierePintura(e.target.checked)} className="mt-4" />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Tipo llenado</Form.Label>
                                <Form.Select value={tipoLlenado} onChange={e => setTipoLlenado(e.target.value)}>
                                    {opcionesTipoLlenado.map(e => <option key={e}>{e}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={3}>
                                <Form.Label>Planta externa</Form.Label>
                                <Form.Select value={idPlantaExterna} onChange={e => setIdPlantaExterna(e.target.value)} disabled={tipoLlenado !== 'Externo'}>
                                    <option value="">Seleccionar planta</option>
                                    {plantasExternas.map(p => <option key={p.id_planta} value={p.id_planta}>{p.razon_social}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Form.Label>Fecha est. entrega (OT)</Form.Label>
                                <Form.Control type="date" value={fechaEntregaEstimada} onChange={e => setFechaEntregaEstimada(e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <Form.Label>Observación</Form.Label>
                                <Form.Control value={observacionCilindro} onChange={e => setObservacionCilindro(e.target.value)} placeholder="Detalle..." />
                            </Col>
                        </Row>
                        <Row className="mb-2">
                            {tipoLlenado === 'Externo' && (
                                <Col md={7}>
                                    <Form.Text className="text-muted">
                                        ℹ️ Al registrar un cilindro con tipo de llenado <b>externo</b> se generará automáticamente la <b>Guía de Traslado</b> (número secuencial) con la cantidad indicada.
                                    </Form.Text>
                                </Col>
                            )}
                            <Col md={tipoLlenado === 'Externo' ? 5 : 12} className="d-flex align-items-end justify-content-end">
                                <Button variant="primary" type="button" onClick={agregarCilindro} className="w-100">Agregar</Button>
                            </Col>
                        </Row>
                    </Card>
                )}

                {showCrear && (
                    <Card className="mb-3 p-3 border-warning">
                        <h6>Cilindro <code>{codigoBusqueda}</code> no encontrado. Crear nuevo:</h6>
                        <Row>
                            <Col md={3}>
                                <Form.Label>Gas (producto)</Form.Label>
                                <Form.Select value={nuevoCil.gas} onChange={e => setNuevoCil({...nuevoCil, gas: e.target.value})}>
                                    <option value="">Seleccionar gas</option>
                                    {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Form.Label>Capacidad (L)</Form.Label>
                                <Form.Control type="number" value={nuevoCil.capacidad} onChange={e => setNuevoCil({...nuevoCil, capacidad: e.target.value})} />
                            </Col>
                            <Col md={3}>
                                <Form.Label>Propiedad</Form.Label>
                                <Form.Select value={nuevoCil.propiedad} onChange={e => setNuevoCil({...nuevoCil, propiedad: e.target.value})}>
                                    <option value="Propiedad_cliente">Propiedad del cliente</option>
                                    <option value="Propiedad_empresa">Propiedad de la empresa</option>
                                    <option value="Tercero">Tercero</option>
                                </Form.Select>
                            </Col>
                            <Col md={4} className="d-flex align-items-end gap-2">
                                <Button type="button" variant="success" disabled={creando} onClick={crearYAgregar}>
                                    {creando ? <Spinner animation="border" size="sm" /> : 'Crear y agregar'}
                                </Button>
                                <Button type="button" variant="secondary" onClick={() => setShowCrear(false)}>Cancelar</Button>
                            </Col>
                        </Row>
                    </Card>
                )}

                {detalle.length > 0 && (
                    <>
                        <h5 className="mt-4 mb-3">Detalle de recepción ({detalle.length} cilindros)</h5>
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Código</th>
                                    <th>Gas actual</th>
                                    <th>Propietario</th>
                                    <th>Gas</th>
                                    <th>Cant. llenar (L)</th>
                                    <th>Estado rec.</th>
                                    <th>Prueba hidr.</th>
                                    <th>Pintura</th>
                                    <th>Tipo llenado</th>
                                    <th>Planta ext.</th>
                                    <th>F. est. entrega</th>
                                    <th>Obs.</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalle.map((d, idx) => (
                                    <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td><code>{d.codigo_interno}</code></td>
                                        <td>{d.gas_actual}</td>
                                        <td>{d.propietario_nombre}</td>
                                        <td>
                                            <Form.Control size="sm" value={d.gas_solicitado_nombre} disabled />
                                        </td>
                                        <td>
                                            <Form.Control size="sm" type="number" min="1"
                                                max={d.capacidad || undefined}
                                                value={d.cantidad_llenado ?? ''}
                                                placeholder={d.capacidad ? `máx ${d.capacidad}` : 'L'}
                                                onChange={e => actualizarCilindro(idx, 'cantidad_llenado', e.target.value)} />
                                            {!d.cantidad_llenado && (
                                                <Form.Text className="text-danger">Obligatorio</Form.Text>
                                            )}
                                        </td>
                                        <td>
                                            <Form.Select size="sm" value={d.estado_recibido}
                                                onChange={e => actualizarCilindro(idx, 'estado_recibido', e.target.value)}>
                                                {estadosRecibido.map(e => <option key={e}>{e}</option>)}
                                            </Form.Select>
                                        </td>
                                        <td>
                                            <Form.Select size="sm" value={d.prueba_hidraulica}
                                                onChange={e => actualizarCilindro(idx, 'prueba_hidraulica', e.target.value)}>
                                                {opcionesPruebaHidraulica.map(e => <option key={e}>{e}</option>)}
                                            </Form.Select>
                                        </td>
                                        <td className="text-center">
                                            <Form.Check type="checkbox" checked={d.requiere_pintura}
                                                onChange={e => actualizarCilindro(idx, 'requiere_pintura', e.target.checked)} />
                                        </td>
                                        <td>
                                            <Form.Select size="sm" value={d.tipo_llenado}
                                                onChange={e => actualizarCilindro(idx, 'tipo_llenado', e.target.value)}>
                                                {opcionesTipoLlenado.map(e => <option key={e}>{e}</option>)}
                                            </Form.Select>
                                        </td>
                                        <td>
                                            <Form.Select size="sm" value={d.id_planta_externa || ''}
                                                onChange={e => actualizarCilindro(idx, 'id_planta_externa', e.target.value)}
                                                disabled={d.tipo_llenado !== 'Externo'}>
                                                <option value="">Seleccionar</option>
                                                {plantasExternas.map(p => <option key={p.id_planta} value={p.id_planta}>{p.razon_social}</option>)}
                                            </Form.Select>
                                        </td>
                                        <td>
                                            <Form.Control size="sm" type="date" value={d.fecha_entrega_estimada || ''}
                                                onChange={e => actualizarCilindro(idx, 'fecha_entrega_estimada', e.target.value)} />
                                        </td>
                                        <td>
                                            <Form.Control size="sm" value={d.observaciones}
                                                onChange={e => actualizarCilindro(idx, 'observaciones', e.target.value)} />
                                        </td>
                                        <td>
                                            <Button variant="outline-danger" size="sm" onClick={() => quitarCilindro(idx)}>✕</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <Alert variant="info" className="py-2 mb-0">
                            ℹ️ Un cilindro no puede llenarse sin la <b>prueba hidráulica aprobada</b>. Si al recibir
                            está <b>Pendiente</b> o <b>Rechazada</b>, se generará automáticamente una <b>OT</b> para
                            realizarla; el cilindro se habilitará para llenado cuando quede <b>Aprobada</b>.
                        </Alert>
                    </>
                )}

                <div className="d-flex justify-content-between mt-4">
                    <Button variant="secondary" type="button" onClick={() => navigate('/recepciones')}>Cancelar</Button>
                    <Button variant="success" type="submit" disabled={guardando || detalle.length === 0}>
                        {guardando ? <Spinner animation="border" size="sm" className="me-2" /> : ''}
                        Registrar Recepción ({detalle.length} cilindros)
                    </Button>
                </div>
            </Form>

        {/* Modal éxito con opciones de PDF */}
        <Modal show={showPdfSuccess} onHide={handleNewRecepcion} centered>
            <Modal.Header closeButton>
                <Modal.Title>✅ Recepción Registrada</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                <h5>Comprobante N° {savedRecepcion?.numero_comprobante}</h5>
                <p className="text-muted mb-4">La recepción se guardó correctamente. ¿Desea descargar o imprimir el comprobante?</p>
                <div className="d-flex justify-content-center gap-3">
                    <Button variant="primary" onClick={handleDownloadComprobante} className="me-2">
                        ⬇ Descargar PDF
                    </Button>
                    <Button variant="outline-primary" onClick={handlePrintComprobante}>
                        🖨 Imprimir
                    </Button>
                </div>
                <Button variant="secondary" className="mt-3" onClick={handleNewRecepcion}>
                    Nueva Recepción
                </Button>
            </Modal.Body>
        </Modal>
        </div>
    );
};

export default NuevaRecepcion;