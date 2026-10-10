import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateGuiaDespachoPDF, generateComprobanteRecepcionPDF, generateComprobanteEntregaPDF, generateListadoPDF } from './pdfService';

// Mock pdfmake
vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    vfs: {},
    createPdf: vi.fn(() => ({
      download: vi.fn(),
      print: vi.fn(),
      getBuffer: vi.fn(() => Promise.resolve(Buffer.from('mock pdf'))),
      getBase64: vi.fn(() => Promise.resolve('base64string')),
    })),
  },
}));

vi.mock('pdfmake/build/vfs_fonts', () => ({
  pdfMake: { vfs: {} },
}));

describe('pdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateGuiaDespachoPDF', () => {
    it('should create PDF with correct structure', () => {
      const guia = {
        numero_guia: 'GUIA-001',
        fecha_envio: '2026-10-10T10:00:00Z',
        chofer: 'Juan Pérez',
        patente_vehiculo: 'ABC-123',
        estado: 'Enviada',
        prueba_hidraulica_resultado: 'Aprobado',
        observaciones: 'Sin novedad',
        fecha_recepcion_planta: null,
        fecha_retorno: null,
      };
      const cilindro = { codigo_interno: 'CIL-001', gas: 'Oxigeno', capacidad: 50, propiedad: 'Propiedad_empresa' };
      const cliente = { razon_social: 'Cliente Test', rut: '12.345.678-9', direccion: 'Calle 123', comuna: 'Santiago' };
      const planta = { razon_social: 'Planta Externa', rut: '98.765.432-1', direccion: 'Av. Industrial', persona_contacto: 'Contacto', telefono: '+56912345678', email: 'planta@test.cl' };

      const pdf = generateGuiaDespachoPDF(guia, cilindro, cliente, planta);
      expect(pdf).toBeDefined();
      expect(typeof pdf.download).toBe('function');
      expect(typeof pdf.print).toBe('function');
    });

    it('should handle missing optional fields', () => {
      const guia = { numero_guia: 'GUIA-002', fecha_envio: null, chofer: null, patente_vehiculo: null, estado: 'Enviada', prueba_hidraulica_resultado: null, observaciones: null };
      const cilindro = { codigo_interno: 'CIL-002', gas: 'Acetileno', capacidad: 40, propiedad: 'Propiedad_cliente' };
      const cliente = { razon_social: 'Cliente 2', rut: '11.111.111-1', direccion: '', comuna: '' };
      const planta = { razon_social: 'Planta 2', rut: '22.222.222-2', direccion: '', persona_contacto: '', telefono: '', email: '' };

      const pdf = generateGuiaDespachoPDF(guia, cilindro, cliente, planta);
      expect(pdf).toBeDefined();
    });
  });

  describe('generateComprobanteRecepcionPDF', () => {
    it('should create comprobante with detalle', () => {
      const recepcion = { numero_comprobante: 'REC-001', fecha_recepcion: '2026-10-10T10:00:00Z', estado: 'Abierta', observaciones: 'Recepcion normal' };
      const detalle = [
        { codigo_interno: 'CIL-001', gas_actual: 'Oxigeno', gas_solicitado_nombre: 'Oxigeno', estado_recibido: 'Bueno', prueba_hidraulica: 'Pendiente', tipo_llenado: 'Local' },
        { codigo_interno: 'CIL-002', gas_actual: 'Acetileno', gas_solicitado_nombre: 'Acetileno', estado_recibido: 'Regular', prueba_hidraulica: 'Aprobado', tipo_llenado: 'Externo' },
      ];
      const cliente = { razon_social: 'Cliente Test', rut: '12.345.678-9' };
      const recepcionista = { nombre: 'Juan Recepcionista' };

      const pdf = generateComprobanteRecepcionPDF(recepcion, detalle, cliente, recepcionista);
      expect(pdf).toBeDefined();
    });
  });

  describe('generateComprobanteEntregaPDF', () => {
    it('should create comprobante entrega with detalle', () => {
      const entrega = { numero_documento: 'ENT-001', fecha_entrega: '2026-10-10T15:00:00Z', tipo_documento: 'Vale', patente_vehiculo: 'XYZ-789', firma_cliente: 'Cliente Firma', observaciones: 'Entrega OK' };
      const detalle = [
        { codigo_interno: 'CIL-001', gas: 'Oxigeno', cantidad: 50, destino: 'Retiro inmediato', fecha_llenado: '2026-10-10T12:00:00Z', planta_externa: 'Planta Local' },
      ];
      const cliente = { razon_social: 'Cliente Entrega', rut: '12.345.678-9', direccion: '', comuna: '' };
      const despachador = { nombre: 'Pedro Despachador' };

      const pdf = generateComprobanteEntregaPDF(entrega, detalle, cliente, despachador);
      expect(pdf).toBeDefined();
    });
  });

  describe('generateListadoPDF', () => {
    it('should create listado PDF with dynamic columns', () => {
      const columns = ['Código', 'Nombre', 'Estado'];
      const data = [
        { codigo: 'CIL-001', nombre: 'Cilindro 1', estado: 'Vacio' },
        { codigo: 'CIL-002', nombre: 'Cilindro 2', estado: 'Lleno' },
      ];
      const keyMap = ['codigo', 'nombre', 'estado'];

      const pdf = generateListadoPDF('Listado Cilindros', 'Test subtitle', columns, data, keyMap);
      expect(pdf).toBeDefined();
    });
  });
});