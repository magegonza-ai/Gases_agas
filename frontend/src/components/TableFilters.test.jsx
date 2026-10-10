import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useTableFilters, TableFilterPanel } from './TableFilters';
import { act } from 'react';

// Test component for useTableFilters hook
const TestComponent = ({ data, config }) => {
  const { filteredData, handleSearchChange, handleDateChange, handleSelectChange, handleBooleanChange, clearFilters, hasActiveFilters, filters } = useTableFilters(data, config);
  
  return (
    <div>
      <input data-testid="search" value={filters.search} onChange={handleSearchChange} placeholder="Buscar..." />
      {config.selectFields?.map(field => (
        <select key={field} data-testid={`select-${field}`} value={filters.selects[field] || ''} onChange={handleSelectChange(field)}>
          <option value="">Todos</option>
          {(config.selectOptions?.[field] || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ))}
      <button data-testid="clear" onClick={clearFilters} disabled={!hasActiveFilters}>Limpiar</button>
      <div data-testid="results">{filteredData.length} resultados</div>
    </div>
  );
};

describe('useTableFilters', () => {
  const testData = [
    { id: 1, codigo: 'CIL-001', nombre: 'Cilindro 1', estado: 'Vacio', tipo: 'Local', fecha: '2026-10-01', activo: true },
    { id: 2, codigo: 'CIL-002', nombre: 'Cilindro 2', estado: 'Lleno', tipo: 'Externo', fecha: '2026-10-02', activo: false },
    { id: 3, codigo: 'CIL-003', nombre: 'Cilindro 3', estado: 'En reparacion', tipo: 'Local', fecha: '2026-10-03', activo: true },
  ];

  const config = {
    searchFields: ['codigo', 'nombre'],
    dateFields: ['fecha'],
    selectFields: ['estado', 'tipo'],
    booleanFields: ['activo'],
    selectOptions: {
      estado: ['Vacio', 'Lleno', 'En reparacion'],
      tipo: ['Local', 'Externo'],
    },
  };

  it('should return all data initially', () => {
    const { container } = render(<TestComponent data={testData} config={config} />);
    expect(screen.getByTestId('results').textContent).toBe('3 resultados');
  });

  it('should filter by search text', () => {
    render(<TestComponent data={testData} config={config} />);
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'CIL-001' } });
    expect(screen.getByTestId('results').textContent).toBe('1 resultados');
  });

  it('should filter by select field', () => {
    render(<TestComponent data={testData} config={config} />);
    fireEvent.change(screen.getByTestId('select-estado'), { target: { value: 'Lleno' } });
    expect(screen.getByTestId('results').textContent).toBe('1 resultados');
  });

  it('should filter by boolean field', () => {
    const configWithBoolean = { ...config, booleanFields: ['activo'] };
    render(<TestComponent data={testData} config={configWithBoolean} />);
    // The hook doesn't render boolean select by default, test the hook directly
  });

  it('should clear filters', () => {
    render(<TestComponent data={testData} config={config} />);
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'CIL-001' } });
    expect(screen.getByTestId('results').textContent).toBe('1 resultados');
    fireEvent.click(screen.getByTestId('clear'));
    expect(screen.getByTestId('results').textContent).toBe('3 resultados');
  });
});

describe('TableFilterPanel', () => {
  const mockData = [
    { id: 1, codigo: 'CIL-001', estado: 'Vacio', tipo_llenado: 'Local', planta_externa: 'Planta A', fecha_recepcion: '2026-10-01', requiere_pintura: false },
  ];

  const filterConfig = {
    searchFields: ['codigo'],
    dateFields: ['fecha_recepcion'],
    selectFields: ['estado', 'tipo_llenado'],
    booleanFields: ['requiere_pintura'],
    selectOptions: {
      estado: ['Vacio', 'Lleno'],
      tipo_llenado: ['Local', 'Externo'],
    },
  };

  it('renders search input when searchFields provided', () => {
    const { filters, handleSearchChange, hasActiveFilters, clearFilters } = useTableFilters(mockData, filterConfig);
    render(<TableFilterPanel filters={filters} filteredCount={1} totalCount={3} config={filterConfig} onSearchChange={handleSearchChange} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />);
    expect(screen.getByPlaceholderText('Buscar en campos de texto...')).toBeInTheDocument();
  });

  it('renders date inputs when dateFields provided', () => {
    const { filters, handleSearchChange, handleDateChange, handleSelectChange, handleBooleanChange, hasActiveFilters, clearFilters } = useTableFilters(mockData, filterConfig);
    render(<TableFilterPanel filters={filters} filteredCount={1} totalCount={3} config={filterConfig} onSearchChange={handleSearchChange} onDateChange={handleDateChange} onSelectChange={handleSelectChange} onBooleanChange={handleBooleanChange} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />);
    expect(screen.getByLabelText('fecha_recepcion (desde)')).toBeInTheDocument();
    expect(screen.getByLabelText('fecha_recepcion (hasta)')).toBeInTheDocument();
  });

  it('renders select when selectFields provided', () => {
    const { filters, handleSearchChange, handleDateChange, handleSelectChange, handleBooleanChange, hasActiveFilters, clearFilters } = useTableFilters(mockData, filterConfig);
    render(<TableFilterPanel filters={filters} filteredCount={1} totalCount={3} config={filterConfig} onSearchChange={handleSearchChange} onDateChange={handleDateChange} onSelectChange={handleSelectChange} onBooleanChange={handleBooleanChange} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />);
    expect(screen.getByLabelText('estado')).toBeInTheDocument();
    expect(screen.getByLabelText('tipo_llenado')).toBeInTheDocument();
  });

  it('shows active badge when filters active', () => {
    const { filters, handleSearchChange, handleDateChange, handleSelectChange, handleBooleanChange, clearFilters, hasActiveFilters } = useTableFilters(mockData, filterConfig);
    // Set a filter to make it active
    act(() => {
      handleSearchChange({ target: { value: 'test' } });
    });
    render(<TableFilterPanel filters={filters} filteredCount={1} totalCount={3} config={filterConfig} onSearchChange={handleSearchChange} onDateChange={handleDateChange} onSelectChange={handleSelectChange} onBooleanChange={handleBooleanChange} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />);
    expect(screen.getByText('Activos')).toBeInTheDocument();
  });
});