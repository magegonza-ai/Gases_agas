const Recepcion = require('../models/Recepcion');
const db = require('../config/database');

describe('Recepcion Model', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('create', () => {
    it('should create recepcion with detalle and auto-create OT for rejected prueba_hidraulica', async () => {
      const recepcionData = {
        id_cliente: 1,
        id_recepcionista: 1,
        numero_comprobante: 'REC-20261010-123456',
        observaciones: 'Test recepcion',
      };
      const detalle = [
        {
          id_envase: 1,
          gas_solicitado: 1,
          estado_recibido: 'Bueno',
          requiere_reparacion: false,
          prueba_hidraulica: 'Rechazado',
          requiere_pintura: true,
          tipo_llenado: 'Local',
          id_planta_externa: null,
          fecha_entrega_estimada: '2026-10-15',
          observaciones: 'Cilindro con abolladura',
        },
      ];

      // Mock transaction sequence
      // 1. BEGIN
      // 2. INSERT recepcion
      // 3. INSERT detalle_recepciones (returns id_detalle)
      // 4. UPDATE envases
      // 5. INSERT ordenes_trabajo
      // 6. COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_recepcion: 1, ...recepcionData }] }) // INSERT recepcion
        .mockResolvedValueOnce({ rows: [{ id_detalle: 1 }] }) // INSERT detalle_recepciones
        .mockResolvedValueOnce({ rows: [] }) // UPDATE envases
        .mockResolvedValueOnce({ rows: [] }) // INSERT ordenes_trabajo
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await Recepcion.create(recepcionData, detalle);

      expect(result).toHaveProperty('id_recepcion', 1);
      expect(db.getClient).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create guia_despacho when tipo_llenado is Externo', async () => {
      const recepcionData = {
        id_cliente: 1,
        id_recepcionista: 1,
        numero_comprobante: 'REC-20261010-123456',
      };
      const detalle = [
        {
          id_envase: 1,
          gas_solicitado: 1,
          estado_recibido: 'Bueno',
          prueba_hidraulica: 'Aprobado',
          tipo_llenado: 'Externo',
          id_planta_externa: 1,
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_recepcion: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id_detalle: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }); // INSERT guias_despacho
        // COMMIT handled by the model

      await Recepcion.create(recepcionData, detalle);

      const guiaCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO guias_despacho')
      );
      expect(guiaCall).toBeDefined();
      expect(guiaCall[0]).toContain('prueba_hidraulica_resultado');
    });

    it('should rollback on error', async () => {
      const recepcionData = { id_cliente: 1, id_recepcionista: 1, numero_comprobante: 'REC-TEST' };
      const detalle = [{ id_envase: 999 }]; // Invalid envase to trigger error

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id_recepcion: 1 }] })
        .mockRejectedValueOnce(new Error('Foreign key violation'))
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(Recepcion.create(recepcionData, detalle)).rejects.toThrow('Foreign key violation');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getAll', () => {
    it('should return recepciones with client and recepcionista info', async () => {
      const mockRecepciones = [
        { id_recepcion: 1, numero_comprobante: 'REC-001', cliente: 'Cliente A', recepcionista: 'Juan', total_cilindros: 3 },
      ];
      db.query.mockResolvedValue({ rows: mockRecepciones });

      const result = await Recepcion.getAll();
      expect(result).toEqual(mockRecepciones);
    });
  });
});