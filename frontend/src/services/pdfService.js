import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// En pdfmake v0.3+, vfs_fonts exporta el VFS directamente
pdfMake.vfs = pdfFonts.vfs || pdfFonts.pdfMake?.vfs || pdfFonts.default?.vfs || pdfFonts.default?.pdfMake?.vfs;

// ============================================
// UTILIDADES
// ============================================
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const headerTable = (title, subtitle = '') => ({
    columns: [
        {
            stack: [
                { text: 'PROMINER', style: 'companyName' },
                { text: 'Control de Envases y Llenado de Gases', style: 'companySubtitle' },
            ],
        },
        {
            stack: [
                { text: title, style: 'docTitle', alignment: 'right' },
                { text: subtitle, style: 'docSubtitle', alignment: 'right' },
            ],
        },
    ],
    margin: [0, 0, 0, 15],
});

const infoRow = (label, value) => ({
    columns: [
        { text: label + ':', style: 'label', width: 130 },
        { text: value || '-', style: 'value' },
    ],
    margin: [0, 2],
});

const sectionTitle = (text) => ({
    text: text,
    style: 'sectionTitle',
    margin: [0, 10, 0, 5],
});

const tableStyle = {
    headerRows: 1,
    margin: [0, 5, 0, 10],
    widths: '*',
};

const defaultStyles = {
    companyName: { fontSize: 20, bold: true, color: '#1e3a5f' },
    companySubtitle: { fontSize: 9, color: '#64748b' },
    docTitle: { fontSize: 16, bold: true, color: '#1e3a5f' },
    docSubtitle: { fontSize: 9, color: '#64748b' },
    sectionTitle: { fontSize: 11, bold: true, color: '#1e3a5f', decoration: 'underline' },
    label: { fontSize: 9, bold: true, color: '#334155' },
    value: { fontSize: 9, color: '#1e293b' },
    tableHeader: { bold: true, fontSize: 8, fillColor: '#1e3a5f', color: 'white', alignment: 'center' },
    tableCell: { fontSize: 8, color: '#1e293b' },
    tableCellCenter: { fontSize: 8, color: '#1e293b', alignment: 'center' },
    footer: { fontSize: 7, color: '#94a3b8', alignment: 'center', margin: [0, 20, 0, 0] },
    small: { fontSize: 7, color: '#64748b' },
};

// ============================================
// GUÍA DE DESPACHO
// ============================================
export const generateGuiaDespachoPDF = (guia, cilindro, cliente, planta) => {
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto' },
        styles: defaultStyles,
        content: [
            headerTable('GUÍA DE DESPACHO', `N° ${guia.numero_guia}`),

            // Datos principales
            {
                columns: [
                    {
                        stack: [
                            infoRow('Fecha Envío', formatDateTime(guia.fecha_envio)),
                            infoRow('Chofer', guia.chofer),
                            infoRow('Patente', guia.patente_vehiculo),
                        ],
                    },
                    {
                        stack: [
                            infoRow('Estado', guia.estado),
                            infoRow('Prueba Hidráulica', guia.prueba_hidraulica_resultado || 'Pendiente'),
                            infoRow('Fecha Recepción Planta', formatDateTime(guia.fecha_recepcion_planta)),
                            infoRow('Cantidad Llenada (L)', guia.cantidad_llenada != null ? String(guia.cantidad_llenada) : '-'),
                            infoRow('Fecha Retorno', formatDateTime(guia.fecha_retorno)),
                        ],
                    },
                ],
            },

            sectionTitle('DATOS DEL CLIENTE'),
            {
                columns: [
                    { stack: [infoRow('Razón Social', cliente?.razon_social), infoRow('RUT', cliente?.rut)] },
                    { stack: [infoRow('Dirección', cliente?.direccion), infoRow('Comuna', cliente?.comuna)] },
                ],
            },

            sectionTitle('DATOS DE LA PLANTA EXTERNA'),
            {
                columns: [
                    { stack: [infoRow('Razón Social', planta?.razon_social), infoRow('RUT', planta?.rut)] },
                    { stack: [infoRow('Dirección', planta?.direccion), infoRow('Contacto', planta?.persona_contacto)] },
                    { stack: [infoRow('Teléfono', planta?.telefono), infoRow('Email', planta?.email)] },
                ],
            },

            sectionTitle('DETALLE DEL CILINDRO'),
            {
                table: {
                    ...tableStyle,
                    widths: ['22%', '20%', '18%', '20%', '20%'],
                    body: [
                        [
                            { text: 'Código', style: 'tableHeader' },
                            { text: 'Gas', style: 'tableHeader' },
                            { text: 'Capacidad (L)', style: 'tableHeader' },
                            { text: 'Cantidad a llenar (L)', style: 'tableHeader' },
                            { text: 'Propiedad', style: 'tableHeader' },
                        ],
                        [
                            { text: cilindro?.codigo_interno, style: 'tableCellCenter' },
                            { text: cilindro?.gas, style: 'tableCell' },
                            { text: cilindro?.capacidad, style: 'tableCellCenter' },
                            { text: cilindro?.cantidad, style: 'tableCellCenter' },
                            { text: cilindro?.propiedad, style: 'tableCellCenter' },
                        ],
                    ],
                },
            },

            guia.trabajos_realizados && sectionTitle('TRABAJOS REALIZADOS EN PLANTA EXTERNA'),
            guia.trabajos_realizados && { text: guia.trabajos_realizados, style: 'value', margin: [0, 0, 0, 10] },

            guia.observaciones && sectionTitle('OBSERVACIONES'),
            guia.observaciones && { text: guia.observaciones, style: 'value', margin: [0, 0, 0, 10] },

            // Firmas
            {
                columns: [
                    {
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 180, y2: 5, lineWidth: 1 }] },
                            { text: 'Entregó (PROMINER)', style: 'small', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: 'Nombre / Firma', style: 'small', alignment: 'center' },
                        ],
                    },
                    {
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 180, y2: 5, lineWidth: 1 }] },
                            { text: 'Recibió (Planta Externa)', style: 'small', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: 'Nombre / Firma', style: 'small', alignment: 'center' },
                        ],
                    },
                ],
                margin: [0, 30, 0, 0],
            },

            {
                text: `Documento generado automáticamente - ${new Date().toLocaleString('es-CL')}`,
                style: 'footer',
            },
        ],
    };

    return pdfMake.createPdf(docDefinition);
};

// ============================================
// COMPROBANTE DE RECEPCIÓN
// ============================================
export const generateComprobanteRecepcionPDF = (recepcion, detalle, cliente, recepcionista) => {
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto' },
        styles: defaultStyles,
        content: [
            headerTable('COMPROBANTE DE RECEPCIÓN', `N° ${recepcion.numero_comprobante}`),

            {
                columns: [
                    {
                        stack: [
                            infoRow('Fecha', formatDateTime(recepcion.fecha_recepcion)),
                            infoRow('Recepcionista', recepcionista?.nombre),
                        ],
                    },
                    {
                        stack: [
                            infoRow('Estado', recepcion.estado),
                            infoRow('Observaciones', recepcion.observaciones || '-'),
                        ],
                    },
                ],
            },

            sectionTitle('DATOS DEL CLIENTE'),
            {
                columns: [
                    { stack: [infoRow('Razón Social', cliente?.razon_social), infoRow('RUT', cliente?.rut)] },
                    { stack: [infoRow('Dirección', cliente?.direccion), infoRow('Teléfono', cliente?.telefono)] },
                ],
            },

            sectionTitle('DETALLE DE CILINDROS RECIBIDOS'),
            {
                table: {
                    ...tableStyle,
                    widths: ['8%', '18%', '18%', '14%', '14%', '14%', '14%'],
                    body: [
                        [
                            { text: '#', style: 'tableHeader' },
                            { text: 'Código', style: 'tableHeader' },
                            { text: 'Gas', style: 'tableHeader' },
                            { text: 'Cant. a llenar (L)', style: 'tableHeader' },
                            { text: 'Estado Recibido', style: 'tableHeader' },
                            { text: 'Prueba Hidr.', style: 'tableHeader' },
                            { text: 'Tipo Llenado', style: 'tableHeader' },
                        ],
                        ...detalle.map((d, i) => [
                            { text: String(i + 1), style: 'tableCellCenter' },
                            { text: d.codigo_interno, style: 'tableCellCenter' },
                            { text: d.gas_actual || d.gas_nombre || d.gas_solicitado_nombre, style: 'tableCell' },
                            { text: d.cantidad_llenado != null ? String(d.cantidad_llenado) : '-', style: 'tableCellCenter' },
                            { text: d.estado_recibido, style: 'tableCellCenter' },
                            { text: d.prueba_hidraulica, style: 'tableCellCenter' },
                            { text: d.tipo_llenado, style: 'tableCellCenter' },
                        ]),
                    ],
                },
            },

            {
                columns: [
                    {
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 180, y2: 5, lineWidth: 1 }] },
                            { text: 'Recepcionista', style: 'small', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: recepcionista?.nombre, style: 'small', alignment: 'center' },
                        ],
                    },
                    {
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 180, y2: 5, lineWidth: 1 }] },
                            { text: 'Cliente / Conductor', style: 'small', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: 'Nombre / Firma', style: 'small', alignment: 'center' },
                        ],
                    },
                ],
                margin: [0, 30, 0, 0],
            },

            {
                text: `Documento generado automáticamente - ${new Date().toLocaleString('es-CL')}`,
                style: 'footer',
            },
        ],
    };

    return pdfMake.createPdf(docDefinition);
};

// ============================================
// COMPROBANTE DE ENTREGA
// ============================================
export const generateComprobanteEntregaPDF = (entrega, detalle, cliente, despachador) => {
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto' },
        styles: defaultStyles,
        content: [
            headerTable('COMPROBANTE DE ENTREGA', `N° ${entrega.numero_documento}`),

            {
                columns: [
                    {
                        stack: [
                            infoRow('Fecha', formatDateTime(entrega.fecha_entrega)),
                            infoRow('Despachador', despachador?.nombre),
                            infoRow('Tipo Documento', entrega.tipo_documento),
                        ],
                    },
                    {
                        stack: [
                            infoRow('Patente Vehículo', entrega.patente_vehiculo || '-'),
                            infoRow('Firma Cliente', entrega.firma_cliente || '-'),
                            infoRow('Observaciones', entrega.observaciones || '-'),
                        ],
                    },
                ],
            },

            sectionTitle('DATOS DEL CLIENTE'),
            {
                columns: [
                    { stack: [infoRow('Razón Social', cliente?.razon_social), infoRow('RUT', cliente?.rut)] },
                    { stack: [infoRow('Dirección', cliente?.direccion), infoRow('Comuna', cliente?.comuna)] },
                ],
            },

            sectionTitle('DETALLE DE CILINDROS ENTREGADOS'),
            {
                table: {
                    ...tableStyle,
                    widths: ['10%', '20%', '15%', '15%', '15%', '15%', '10%'],
                    body: [
                        [
                            { text: '#', style: 'tableHeader' },
                            { text: 'Código', style: 'tableHeader' },
                            { text: 'Gas', style: 'tableHeader' },
                            { text: 'Cantidad', style: 'tableHeader' },
                            { text: 'Destino', style: 'tableHeader' },
                            { text: 'Fecha Llenado', style: 'tableHeader' },
                            { text: 'Planta', style: 'tableHeader' },
                        ],
                        ...detalle.map((d, i) => [
                            { text: String(i + 1), style: 'tableCellCenter' },
                            { text: d.codigo_interno, style: 'tableCellCenter' },
                            { text: d.gas || d.gas_nombre, style: 'tableCell' },
                            { text: d.cantidad, style: 'tableCellCenter' },
                            { text: d.destino, style: 'tableCellCenter' },
                            { text: formatDateTime(d.fecha_llenado), style: 'tableCellCenter' },
                            { text: d.planta_externa || 'Local', style: 'tableCellCenter' },
                        ]),
                    ],
                },
            },

            {
                columns: [
                    {
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 180, y2: 5, lineWidth: 1 }] },
                            { text: 'Despachador', style: 'small', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: despachador?.nombre, style: 'small', alignment: 'center' },
                        ],
                    },
                    {
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 180, y2: 5, lineWidth: 1 }] },
                            { text: 'Recibió Cliente', style: 'small', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: 'Nombre / Firma', style: 'small', alignment: 'center' },
                        ],
                    },
                ],
                margin: [0, 30, 0, 0],
            },

            {
                text: `Documento generado automáticamente - ${new Date().toLocaleString('es-CL')}`,
                style: 'footer',
            },
        ],
    };

    return pdfMake.createPdf(docDefinition);
};

// ============================================
// CERTIFICADO DE BAJA DE CILINDRO
// Se emite cuando la prueba hidráulica local resulta RECHAZADA.
// ============================================
export const generateCertificadoBajaPDF = (certificado) => {
    const numOt = certificado.id_orden_trabajo
        ? `OT-${String(certificado.id_orden_trabajo).padStart(5, '0')}`
        : '-';

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto' },
        styles: defaultStyles,
        content: [
            headerTable('CERTIFICADO DE BAJA', `N° ${certificado.numero_certificado}`),

            {
                columns: [
                    {
                        stack: [
                            infoRow('Fecha', formatDateTime(certificado.fecha)),
                            infoRow('N° Cilindro', certificado.codigo_interno),
                            infoRow('Gas', certificado.gas_nombre),
                        ],
                    },
                    {
                        stack: [
                            infoRow('Capacidad', certificado.capacidad != null ? `${certificado.capacidad} L` : '-'),
                            infoRow('Cliente', certificado.cliente_nombre),
                            infoRow('Orden de Trabajo', numOt),
                        ],
                    },
                ],
            },

            sectionTitle('RESULTADO DE LA PRUEBA HIDRÁULICA'),
            {
                table: {
                    headerRows: 1,
                    widths: ['40%', '60%'],
                    margin: [0, 5, 0, 10],
                    body: [
                        [
                            { text: 'Prueba Hidráulica Local', style: 'tableHeader' },
                            { text: 'Resultado', style: 'tableHeader' },
                        ],
                        [
                            { text: 'Realizada en planta', style: 'tableCellCenter' },
                            { text: 'RECHAZADO', style: 'tableCellCenter', bold: true, color: '#b91c1c' },
                        ],
                    ],
                },
            },

            {
                text: `Por medio del presente documento se certifica que el cilindro N° ${certificado.codigo_interno} fue sometido a la prueba hidráulica en la planta local y su resultado fue RECHAZADO. En consecuencia, el cilindro queda DADO DE BAJA y fuera de servicio, no pudiendo ser recepcionado ni llenado nuevamente.`,
                style: 'value',
                margin: [0, 5, 0, 10],
            },

            sectionTitle('GLOSA / DETALLE DEL CERTIFICADO'),
            { text: certificado.glosa || '-', style: 'value', margin: [0, 0, 0, 10] },

            // Pie de firma del responsable
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 240,
                        stack: [
                            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 240, y2: 5, lineWidth: 1 }] },
                            { text: certificado.responsable_nombre || 'Responsable', style: 'small', alignment: 'center', margin: [0, 5, 0, 0], bold: true },
                            { text: certificado.responsable_cargo || 'Responsable Técnico', style: 'small', alignment: 'center' },
                            { text: 'Nombre / Firma Responsable', style: 'small', alignment: 'center' },
                        ],
                    },
                    { width: '*', text: '' },
                ],
                margin: [0, 60, 0, 0],
            },

            {
                text: `Documento generado automáticamente - ${new Date().toLocaleString('es-CL')}`,
                style: 'footer',
            },
        ],
    };

    return pdfMake.createPdf(docDefinition);
};

// ============================================
// LISTADO GENERICO (para reportes)
// ============================================
export const generateListadoPDF = (title, subtitle, columns, data, keyMap) => {
    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: columns.length > 6 ? 'landscape' : 'portrait',
        pageMargins: [30, 50, 30, 50],
        defaultStyle: { font: 'Roboto' },
        styles: defaultStyles,
        content: [
            headerTable(title, subtitle),
            {
                table: {
                    headerRows: 1,
                    margin: [0, 5, 0, 10],
                    widths: Array(columns.length).fill('*'),
                    body: [
                        columns.map(c => ({ text: c, style: 'tableHeader' })),
                        ...data.map(row => keyMap.map(k => ({ text: row[k] || '-', style: 'tableCellCenter' }))),
                    ],
                },
            },
            { text: `Total registros: ${data.length}`, style: 'small', margin: [0, 10, 0, 0] },
            { text: `Generado: ${new Date().toLocaleString('es-CL')}`, style: 'footer' },
        ],
    };
    return pdfMake.createPdf(docDefinition);
};

export default pdfMake;