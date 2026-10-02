import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const links = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/nueva-recepcion', label: 'Nueva Recepción', icon: '📥' },
    { to: '/cilindros', label: 'Cilindros', icon: '🛢️' },
    { to: '/llenados', label: 'Llenados', icon: '⛽' },
    { to: '/ordenes-trabajo', label: 'Órdenes de Trabajo', icon: '🔧' },
    { to: '/entregas', label: 'Entregas', icon: '🚚' },
    { to: '/clientes', label: 'Clientes', icon: '👥' },
    { to: '/productos', label: 'Productos', icon: '📦' },
    { to: '/trabajadores', label: 'Trabajadores', icon: '👷' },
];

const Layout = () => (
    <div className="app-layout">
        <aside className="sidebar">
            <div className="sidebar-brand">
                <h4>GasAgas</h4>
                <small className="text-secondary">Gestión de Cilindros</small>
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
