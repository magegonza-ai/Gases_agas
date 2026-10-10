const db = require('../config/database');

// Mock the database module
jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: {
    on: jest.fn(),
  },
}));

const Llenado = require('../models/Llenado');

describe('Llenado Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getClient.mockReset();
    db.query.mockReset();
  });

  // Helper to create a mock client with sequential responses
  const createMockClient = (responses) => {
    let callCount = 0;
    return {
      query: jest.fn(() => {
        const response = responses[callCount] || { rows: [] };
        callCount++;
        return Promise.resolve(response);
      }),
      release: jest.fn(),
    };
  };

  describe('create', () => {
    it('should create llenado and validate gas matches cylinder', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id_llenado: 1 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
        release: jest.fn(),
      };
      db.getClient.mockResolvedValue(mockClient);

      const llenadoData = {
        id_detalle_recepcion: 1,
        id_envase: 1,
        id_llenador: 1,
        gas_llenado: 1,
        cantidad: 50,
        destino: 'Retiro inmediato',
      };

      const result = await Llenado.create(llenadoData);
      expect(result).toHaveProperty('id_llenado', 1);
    });

    it('should reject if gas_llenado does not match cylinder gas', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id_producto: 2 }] }),
        release: jest.fn(),
      };
      db.getClient.mockResolvedValue(mockClient);

      const llenadoData = {
        id_detalle_recepcion: 1,
        id_envase: 1,
        id_llenador: 1,
        gas_llenado: 1,
        cantidad: 50,
        destino: 'Retiro inmediato',
      };

      await expect(Llenado.create(llenadoData)).rejects.toThrow('El gas a llenar no coincide con el gas del cilindro');
    });

    it('should update guia_despacho when returning from planta externa', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id_llenado: 1 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
        release: jest.fn(),
      };
      db.getClient.mockResolvedValue(mockClient);

      const llenadoData = {
        id_detalle_recepcion: 1,
        id_envase: 1,
        id_llenador: 1,
        gas_llenado: 1,
        cantidad: 50,
        destino: 'Retiro inmediato',
        id_planta_externa: 1,
      };

      const result = await Llenado.create(llenadoData);
      expect(result).toHaveProperty('id_llenado', 1);

      const guiaCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('UPDATE guias_despacho')
      );
      expect(guiaCall).toBeDefined();
      expect(guiaCall[0]).toContain('estado');
      expect(guiaCall[0]).toContain('Devuelta');
    });
  });

  describe('getPendientesLlenado', () => {
    it('should return cylinders ready for filling', async () => {
      const mockPendientes = [
        { id_detalle: 1, codigo_interno: 'CIL-001', gas_solicitado_nombre: 'Oxigeno' },
      ];
      db.query.mockResolvedValue({ rows: mockPendientes });

      const result = await Llenado.getPendientesLlenado();
      expect(result).toEqual(mockPendientes);
    });
  });

  describe('getEnTransito', () => {
    it('should return cylinders in transit to external plants', async () => {
      const mockEnTransito = [
        { id_guia: 1, numero_guia: 'GUIA-001', estado: 'Enviada' },
      ];
      db.query.mockResolvedValue({ rows: mockEnTransito });

      const result = await Llenado.getEnTransito();
      expect(result).toEqual(mockEnTransito);
    });
  });

  describe('getHistorial', () => {
    it('should return fill history with all details', async () => {
      const mockHistorial = [
        { id_llenado: 1, codigo_interno: 'CIL-001', gas_nombre: 'Oxigeno', cliente: 'Cliente A' },
      ];
      db.query.mockResolvedValue({ rows: mockHistorial });

      const result = await Llenado.getHistorial();
      expect(result).toEqual(mockHistorial);
    });
  });
});