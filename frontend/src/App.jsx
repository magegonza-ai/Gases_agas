import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import NuevaRecepcion from './pages/NuevaRecepcion';
import Cilindros from './pages/Cilindros';
import Llenados from './pages/Llenados';
import OrdenesTrabajo from './pages/OrdenesTrabajo';
import Entregas from './pages/Entregas';
import Clientes from './pages/Clientes';
import Productos from './pages/Productos';
import Trabajadores from './pages/Trabajadores';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="nueva-recepcion" element={<NuevaRecepcion />} />
                    <Route path="cilindros" element={<Cilindros />} />
                    <Route path="llenados" element={<Llenados />} />
                    <Route path="ordenes-trabajo" element={<OrdenesTrabajo />} />
                    <Route path="entregas" element={<Entregas />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="productos" element={<Productos />} />
                    <Route path="trabajadores" element={<Trabajadores />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
