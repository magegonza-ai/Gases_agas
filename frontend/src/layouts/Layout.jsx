import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const links = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/nueva-recepcion', label: 'Nueva Recepción', icon: '📥' },
    { to: '/llenados', label: 'Llenados', icon: '⛽' },
    { to: '/ordenes-trabajo', label: 'Órdenes de Trabajo', icon: '🔧' },
    { to: '/entregas', label: 'Entregas', icon: '🚚' },
    { to: '/guias-despacho', label: 'Guías Despacho', icon: '📋' },
    { to: '/clientes', label: 'Clientes', icon: '👥' },
    { to: '/productos', label: 'Productos', icon: '📦' },
    { to: '/plantas-externas', label: 'Plantas Externas', icon: '🏭' },
    { to: '/trabajadores', label: 'Trabajadores', icon: '👷' },
    { to: '/cilindros', label: 'Cilindros', icon: '🛢️' },
];

const Layout = () => (
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
        </aside>
        <main className="main-content">
            <Outlet />
        </main>
    </div>
);

export default Layout;
