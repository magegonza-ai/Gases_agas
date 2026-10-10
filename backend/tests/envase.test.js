const Envase = require('../models/Envase');
const db = require('../config/database');

describe('Envase Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all active envases', async () => {
      const mockEnvases = [
        { id_envase: 1, codigo_interno: 'CIL-001', gas: 'Oxigeno', estado: 'Vacio' },
        { id_envase: 2, codigo_interno: 'CIL-002', gas: 'Acetileno', estado: 'Lleno' },
      ];
      db.query.mockResolvedValue({ rows: mockEnvases });

      const result = await Envase.getAll();
      expect(result).toEqual(mockEnvases);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should handle empty result', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await Envase.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getByCodigo', () => {
    it('should return envase by codigo', async () => {
      const mockEnvase = { id_envase: 1, codigo_interno: 'CIL-001', gas: 'Oxigeno' };
      db.query.mockResolvedValue({ rows: [mockEnvase] });

      const result = await Envase.getByCodigo('CIL-001');
      expect(result).toEqual(mockEnvase);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE e.codigo_interno = $1'), ['CIL-001']);
    });

    it('should return undefined if not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await Envase.getByCodigo('INEXISTENTE');
      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create new envase', async () => {
      const newEnvase = {
        codigo_interno: 'CIL-NEW',
        id_producto: 1,
        capacidad: 50,
        propiedad: 'Propiedad_empresa',
        estado: 'Disponible',
      };
      db.query.mockResolvedValue({ rows: [{ ...newEnvase, id_envase: 10 }] });

      const result = await Envase.create(newEnvase);
      expect(result.id_envase).toBe(10);
      expect(result.codigo_interno).toBe('CIL-NEW');
    });
  });

  describe('update', () => {
    it('should update envase without changing gas (id_producto)', async () => {
      const updateData = {
        codigo_interno: 'CIL-001',
        capacidad: 60,
        propiedad: 'Propiedad_cliente',
        id_propietario: 1,
        estado: 'Vacio',
        observaciones_generales: 'Test',
      };
      const mockUpdated = { ...updateData, id_envase: 1, id_producto: 1 };
      db.query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await Envase.update(1, updateData);
      expect(result.capacidad).toBe(60);
      // Verify id_producto is NOT in the update query
      const queryCall = db.query.mock.calls[0][0];
      expect(queryCall).not.toContain('id_producto');
    });

    it('should update prueba_hidraulica and set fecha_prueba_hidraulica when approved', async () => {
      const updateData = {
        prueba_hidraulica: 'Aprobado',
        requiere_pintura: false,
      };
      db.query.mockResolvedValue({ rows: [{ id_envase: 1, ...updateData }] });

      await Envase.update(1, updateData);
      const queryCall = db.query.mock.calls[0][0];
      expect(queryCall).toContain('fecha_prueba_hidraulica');
      expect(queryCall).toContain('Aprobado');
    });
  });

  describe('updateEstado', () => {
    it('should update only estado field', async () => {
      db.query.mockResolvedValue({ rows: [{ id_envase: 1, estado: 'Lleno' }] });
      const result = await Envase.updateEstado(1, 'Lleno');
      expect(result.estado).toBe('Lleno');
      expect(db.query).toHaveBeenCalledWith('UPDATE envases SET estado=$1 WHERE id_envase=$2 RETURNING *', ['Lleno', 1]);
    });
  });

  describe('getParaLlenado', () => {
    it('should return cylinders pending fill', async () => {
      const mockCilindros = [
        { id_envase: 1, codigo_interno: 'CIL-001', estado: 'Vacio' },
      ];
      db.query.mockResolvedValue({ rows: mockCilindros });
      const result = await Envase.getParaLlenado();
      expect(result).toEqual(mockCilindros);
    });
  });

  describe('getPendientesEntrega', () => {
    it('should return cylinders pending delivery', async () => {
      const mockCilindros = [
        { id_envase: 1, codigo_interno: 'CIL-001', situacion: 'Listo para despacho' },
      ];
      db.query.mockResolvedValue({ rows: mockCilindros });
      const result = await Envase.getPendientesEntrega();
      expect(result).toEqual(mockCilindros);
    });
  });
});