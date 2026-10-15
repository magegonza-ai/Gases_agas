import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { systemAPI } from '../services/api';
import './Layout.css';

const links = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/nueva-recepcion', label: 'Nueva Recepción', icon: '📥' },
    { to: '/recepciones', label: 'Recepciones', icon: '🧾' },
    { to: '/llenados', label: 'Llenados', icon: '⛽' },
    { to: '/ordenes-trabajo', label: 'Órdenes de Trabajo', icon: '🔧' },
    { to: '/cilindros-baja', label: 'Cilindros de Baja', icon: '🚫' },
    { to: '/entregas', label: 'Entregas', icon: '🚚' },
    { to: '/guias-despacho', label: 'Guías Despacho', icon: '📋' },
    { to: '/clientes', label: 'Clientes', icon: '👥' },
    { to: '/productos', label: 'Productos', icon: '📦' },
    { to: '/plantas-externas', label: 'Plantas Externas', icon: '🏭' },
    { to: '/trabajadores', label: 'Trabajadores', icon: '👷' },
    { to: '/cilindros', label: 'Cilindros', icon: '🛢️' },
];

const Layout = () => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [closing, setClosing] = useState(false);
    const [closed, setClosed] = useState(false);

    const cerrarPrograma = async () => {
        setClosing(true);
        try {
            if (window.electronAPI?.quitApp) {
                // Modo aplicación de escritorio (Electron)
                await window.electronAPI.quitApp();
            } else {
                // Modo navegador (servidor Node): pedimos el apagado controlado
                await systemAPI.shutdown();
            }
        } catch (err) {
            // Si el servidor ya se cerró, la petición puede fallar; igualmente lo damos por cerrado.
        }
        setClosing(false);
        setClosed(true);
    };

    if (closed) {
        return (
            <div className="cerrado-overlay">
                <div className="cerrado-card">
                    <img src="/prominer-logo.png" alt="PROMINER" className="cerrado-logo" />
                    <h3>PROMINER se ha cerrado</h3>
                    <p>
                        El programa se cerró correctamente y la base de datos quedó guardada.
                    </p>
                    <p className="text-muted mb-0">
                        Ya puede cerrar esta ventana del navegador.
                    </p>
                    <button className="btn btn-outline-secondary mt-4" onClick={() => window.close()}>
                        Cerrar ventana
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <img src="/prominer-logo.png" alt="PROMINER" className="brand-logo" />
                    <div className="brand-text">
                        <h4>PROMINER</h4>
                        <small className="text-secondary">Control de Envases</small>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/'}
                            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                        >
                            <span className="sidebar-icon">{link.icon}</span>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button
                        type="button"
                        className="btn-cerrar-app"
                        title="Cerrar PROMINER"
                        onClick={() => setShowConfirm(true)}
                    >
                        <span aria-hidden="true">⏻</span> Cerrar aplicación
                    </button>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>

            <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Cerrar PROMINER</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-2">
                        Se cerrará el programa y se guardará la base de datos.
                    </p>
                    <p className="text-muted mb-0">
                        Deberá volver a abrir PROMINER para usarlo nuevamente.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={closing}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={cerrarPrograma} disabled={closing}>
                        {closing ? 'Cerrando…' : 'Sí, cerrar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Layout;
