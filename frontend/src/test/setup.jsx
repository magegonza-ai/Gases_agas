import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock react-bootstrap components - defined inline to avoid hoisting issues
vi.mock('react-bootstrap', () => {
  const mockComponent = (name) => ({ children, ...props }) => 
    React.createElement('div', { 'data-testid': name.toLowerCase(), ...props }, children);
  
  const mockCompound = (name, subs = {}) => {
    const Main = ({ children, ...props }) => 
      React.createElement('div', { 'data-testid': name.toLowerCase(), ...props }, children);
    Object.entries(subs).forEach(([key, fn]) => { Main[key] = fn; });
    return Main;
  };

  return {
    Card: mockCompound('Card', {
      Header: mockComponent('CardHeader'),
      Body: mockComponent('CardBody'),
      Footer: mockComponent('CardFooter'),
      Title: mockComponent('CardTitle'),
      Text: mockComponent('CardText'),
      Img: mockComponent('CardImg'),
    }),
    Badge: mockComponent('Badge'),
    Form: mockCompound('Form', {
      Control: mockComponent('FormControl'),
      Select: mockComponent('FormSelect'),
      Label: mockComponent('FormLabel'),
      Check: mockComponent('FormCheck'),
      Group: mockComponent('FormGroup'),
      Text: mockComponent('FormText'),
    }),
    Row: mockComponent('Row'),
    Col: mockComponent('Col'),
    Button: mockComponent('Button'),
    InputGroup: mockComponent('InputGroup'),
    InputGroupText: mockComponent('InputGroupText'),
    DropdownButton: mockComponent('DropdownButton'),
    Dropdown: mockComponent('Dropdown'),
    Table: mockComponent('Table'),
    Alert: mockComponent('Alert'),
    Spinner: mockComponent('Spinner'),
    Modal: mockComponent('Modal'),
    Tabs: mockComponent('Tabs'),
    Tab: mockComponent('Tab'),
    Accordion: mockComponent('Accordion'),
    AccordionItem: mockComponent('AccordionItem'),
    AccordionHeader: mockComponent('AccordionHeader'),
    AccordionBody: mockComponent('AccordionBody'),
    Pagination: mockComponent('Pagination'),
    Breadcrumb: mockComponent('Breadcrumb'),
    BreadcrumbItem: mockComponent('BreadcrumbItem'),
    Nav: mockComponent('Nav'),
    NavLink: mockComponent('NavLink'),
    Navbar: mockComponent('Navbar'),
    NavDropdown: mockComponent('NavDropdown'),
    Container: mockComponent('Container'),
  };
});

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  ...vi.requireActual('react-router-dom'),
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  NavLink: ({ children, to, className, ...props }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock API services
vi.mock('../services/api', () => ({
  clientesAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    search: vi.fn().mockResolvedValue({ data: [] }),
  },
  trabajadoresAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    getByCargo: vi.fn().mockResolvedValue({ data: [] }),
    getCargos: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  productosAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    getStockAlertas: vi.fn().mockResolvedValue({ data: [] }),
  },
  envasesAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    getByCodigo: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    updateEstado: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    getResumen: vi.fn().mockResolvedValue({ data: [] }),
    getParaLlenado: vi.fn().mockResolvedValue({ data: [] }),
    getPendientesEntrega: vi.fn().mockResolvedValue({ data: [] }),
    getObservaciones: vi.fn().mockResolvedValue({ data: [] }),
    addObservacion: vi.fn().mockResolvedValue({ data: {} }),
  },
  recepcionesAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    close: vi.fn().mockResolvedValue({ data: {} }),
  },
  ordenesTrabajoAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    getPending: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    start: vi.fn().mockResolvedValue({ data: {} }),
    complete: vi.fn().mockResolvedValue({ data: {} }),
    cancel: vi.fn().mockResolvedValue({ data: {} }),
  },
  llenadosAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getPendientes: vi.fn().mockResolvedValue({ data: [] }),
    getEnTransito: vi.fn().mockResolvedValue({ data: [] }),
    getHistorial: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
  },
  entregasAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    getParaEntregar: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
  },
  plantasExternasAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getAllIncluyendoInactivas: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  guiasDespachoAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: {} }),
    getByDetalleRecepcion: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    recibirEnPlanta: vi.fn().mockResolvedValue({ data: {} }),
    retornarDePlanta: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock console.error to reduce noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});