import { useState, useMemo } from 'react';
import { Card, Badge, Form, Row, Col, Button, InputGroup, DropdownButton, Dropdown } from 'react-bootstrap';

// ============================================
// COMPONENTE: Filtros Avanzados para Tablas
// ============================================

export const useTableFilters = (data, config = {}) => {
    const { searchFields = [], dateFields = [], selectFields = [], booleanFields = [] } = config;
    
    const [filters, setFilters] = useState({
        search: '',
        dateFrom: {},
        dateTo: {},
        selects: {},
        booleans: {},
    });

    const filteredData = useMemo(() => {
        return data.filter(row => {
            // Búsqueda de texto general
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchSearch = searchFields.some(field => {
                    const value = getNestedValue(row, field);
                    return value && String(value).toLowerCase().includes(searchLower);
                });
                if (!matchSearch) return false;
            }

            // Filtros de fecha (rango)
            for (const field of dateFields) {
                const from = filters.dateFrom[field];
                const to = filters.dateTo[field];
                if (from || to) {
                    const value = getNestedValue(row, field);
                    if (!value) return false;
                    const date = new Date(value);
                    if (from && date < new Date(from)) return false;
                    if (to && date > new Date(to + 'T23:59:59')) return false;
                }
            }

            // Filtros select (valor exacto)
            for (const field of selectFields) {
                const selected = filters.selects[field];
                if (selected && selected !== '') {
                    const value = getNestedValue(row, field);
                    if (value !== selected) return false;
                }
            }

            // Filtros booleanos
            for (const field of booleanFields) {
                const selected = filters.booleans[field];
                if (selected !== null && selected !== undefined) {
                    const value = getNestedValue(row, field);
                    if (Boolean(value) !== selected) return false;
                }
            }

            return true;
        });
    }, [data, filters, searchFields, dateFields, selectFields, booleanFields]);

    const handleSearchChange = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
    };

    const handleDateChange = (field, type) => (e) => {
        setFilters(prev => ({
            ...prev,
            [type === 'from' ? 'dateFrom' : 'dateTo']: {
                ...prev[type === 'from' ? 'dateFrom' : 'dateTo'],
                [field]: e.target.value,
            },
        }));
    };

    const handleSelectChange = (field) => (e) => {
        setFilters(prev => ({
            ...prev,
            selects: { ...prev.selects, [field]: e.target.value },
        }));
    };

    const handleBooleanChange = (field) => (e) => {
        const value = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null;
        setFilters(prev => ({
            ...prev,
            booleans: { ...prev.booleans, [field]: value },
        }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            dateFrom: {},
            dateTo: {},
            selects: {},
            booleans: {},
        });
    };

    const hasActiveFilters = filters.search || 
        Object.values(filters.dateFrom).some(v => v) || 
        Object.values(filters.dateTo).some(v => v) ||
        Object.values(filters.selects).some(v => v) ||
        Object.values(filters.booleans).some(v => v !== null && v !== undefined);

    return {
        filters,
        filteredData,
        handleSearchChange,
        handleDateChange,
        handleSelectChange,
        handleBooleanChange,
        clearFilters,
        hasActiveFilters,
    };
};

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

// ============================================
// COMPONENTE UI: Panel de Filtros Colapsable
// ============================================

export const TableFilterPanel = ({ 
    filters, 
    filteredCount, 
    totalCount,
    config,
    onSearchChange,
    onDateChange,
    onSelectChange,
    onBooleanChange,
    onClear,
    hasActiveFilters,
}) => {
    const { searchFields = [], dateFields = [], selectFields = [], booleanFields = [], selectOptions = {} } = config;
    
    const [expanded, setExpanded] = useState(true);

    if (!searchFields.length && !dateFields.length && !selectFields.length && !booleanFields.length) {
        return null;
    }

    return (
        <Card className="mb-3 shadow-sm">
            <Card.Header 
                className="d-flex justify-content-between align-items-center cursor-pointer bg-light"
                onClick={() => setExpanded(!expanded)}
            >
                <h6 className="mb-0">
                    🔍 Filtros {hasActiveFilters && <Badge bg="primary" className="ms-2">Activos</Badge>}
                </h6>
                <span className="small text-muted">
                    {filteredCount} de {totalCount} | {expanded ? '▼' : '▶'}
                </span>
            </Card.Header>
            
            {expanded && (
                <Card.Body>
                    <Row className="g-3">
                        {/* Búsqueda global */}
                        {searchFields.length > 0 && (
                            <Col md={6}>
                                <Form.Label>Buscar (texto)</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar en campos de texto..."
                                        onChange={onSearchChange}
                                    />
                                    <InputGroup.Text>🔍</InputGroup.Text>
                                </InputGroup>
                            </Col>
                        )}

                        {/* Filtros de fecha */}
                        {dateFields.map(field => (
                            <Col key={field} md={3}>
                                <Form.Label>{field} (desde)</Form.Label>
                                <Form.Control type="date" onChange={onDateChange(field, 'from')} />
                            </Col>
                        ))}
                        {dateFields.map(field => (
                            <Col key={field + '_to'} md={3}>
                                <Form.Label>{field} (hasta)</Form.Label>
                                <Form.Control type="date" onChange={onDateChange(field, 'to')} />
                            </Col>
                        ))}

                        {/* Filtros select */}
                        {selectFields.map(field => (
                            <Col key={field} md={3}>
                                <Form.Label>{field}</Form.Label>
                                <Form.Select onChange={onSelectChange(field)}>
                                    <option value="">Todos</option>
                                    {(selectOptions[field] || []).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                        ))}

                        {/* Filtros booleanos */}
                        {booleanFields.map(field => (
                            <Col key={field} md={3}>
                                <Form.Label>{field}</Form.Label>
                                <Form.Select onChange={onBooleanChange(field)}>
                                    <option value="">Todos</option>
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                </Form.Select>
                            </Col>
                        ))}

                        {/* Botón limpiar */}
                        <Col md={12} className="d-flex align-items-end">
                            <Button variant="outline-secondary" onClick={onClear} disabled={!hasActiveFilters}>
                                🗑 Limpiar filtros
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            )}
        </Card>
    );
};

// ============================================
// HOOK PARA OBTENER OPCIONES ÚNICAS DE SELECT
// ============================================

export const useSelectOptions = (data, fields) => {
    return useMemo(() => {
        const options = {};
        fields.forEach(field => {
            const values = new Set();
            data.forEach(row => {
                const val = getNestedValue(row, field);
                if (val !== null && val !== undefined && val !== '') {
                    values.add(String(val));
                }
            });
            options[field] = Array.from(values).sort();
        });
        return options;
    }, [data, fields]);
};

export default useTableFilters;