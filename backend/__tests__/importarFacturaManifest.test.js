const fs = require('fs');
const os = require('os');
const path = require('path');

const toPortablePath = (filePath) => filePath.replace(/\\/g, '/');

const buildFacturaData = ({ clave, numeroConsecutivo, receptor }) => ({
  Clave: clave,
  NumeroConsecutivo: numeroConsecutivo,
  FechaEmision: '2026-06-23T12:13:05',
  Emisor: { Nombre: 'Proveedor QA' },
  Receptor: { Identificacion: { Numero: receptor } },
  ResumenFactura: { TotalComprobante: 100 },
});

const buildMensajeHaciendaData = ({ clave, receptor }) => ({
  Clave: clave,
  NumeroCedulaReceptor: receptor,
  Mensaje: '1',
  EstadoMensaje: 'Aceptado',
  DetalleMensaje: 'Aceptado',
});

const loadImporterWithMocks = (xmlResponses) => {
  jest.resetModules();

  const parseXML = jest.fn((xml) => {
    const response = xmlResponses[xml];
    if (!response) {
      throw new Error(`XML de prueba no registrado: ${xml}`);
    }
    return response;
  });
  const serviceMock = {
    insertarFactura: jest.fn().mockResolvedValue({ status: 'inserted', id: 1 }),
    insertarTiqueteElectronico: jest.fn().mockResolvedValue({ status: 'inserted', id: 2 }),
    insertarMensajeHacienda: jest.fn().mockResolvedValue({ status: 'inserted', id: 3 }),
    insertarNotaCredito: jest.fn().mockResolvedValue({ status: 'inserted', id: 4 }),
  };

  jest.doMock('../utils/xmlParser', () => ({ parseXML }));
  jest.doMock('../services/factura.service', () => serviceMock);

  return {
    ...require('../scripts/importarFacturaManifest'),
    parseXML,
    serviceMock,
  };
};

describe('importarFacturaManifest', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-import-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    jest.resetModules();
    jest.dontMock('../utils/xmlParser');
    jest.dontMock('../services/factura.service');
  });

  test('ubica PDF, XML, RH y manifest por receptor en lotes mixtos con PDFs fuera de orden', async () => {
    const ingestionId = '20260623_121305_B300074DEA08450000';
    const receptor258 = '3101873996';
    const receptor259 = '3101820946';
    const carpetaEntrada = path.join(tempRoot, 'recibidas');
    const carpetaProcesados = path.join(tempRoot, 'procesadas');
    fs.mkdirSync(carpetaEntrada, { recursive: true });
    fs.mkdirSync(carpetaProcesados, { recursive: true });

    const manifestPath = path.join(carpetaEntrada, `${ingestionId}.manifest.json`);
    const attachments = [
      {
        type: 'DOC',
        savedAs: `${ingestionId}.DOC.1.xml`,
        originalName: '50622062600310161668800100001010000000258199999999.xml',
      },
      {
        type: 'DOC',
        savedAs: `${ingestionId}.DOC.2.xml`,
        originalName: '50622062600310161668800100001010000000259199999999.xml',
      },
      {
        type: 'RH',
        savedAs: `${ingestionId}.RH.1.xml`,
        originalName: '50622062600310161668800100001010000000258199999999_Respuesta.xml',
      },
      {
        type: 'RH',
        savedAs: `${ingestionId}.RH.2.xml`,
        originalName: '50622062600310161668800100001010000000259199999999_Respuesta.xml',
      },
      {
        type: 'PDF',
        savedAs: `${ingestionId}.PDF.1.pdf`,
        originalName: `FAC.259.${receptor259}.pdf`,
      },
      {
        type: 'PDF',
        savedAs: `${ingestionId}.PDF.2.pdf`,
        originalName: `FAC.258.${receptor258}.pdf`,
      },
    ];
    fs.writeFileSync(manifestPath, JSON.stringify({ ingestion_id: ingestionId, attachments_saved: attachments }));

    fs.writeFileSync(path.join(carpetaEntrada, `${ingestionId}.DOC.1.xml`), 'DOC_258');
    fs.writeFileSync(path.join(carpetaEntrada, `${ingestionId}.DOC.2.xml`), 'DOC_259');
    fs.writeFileSync(path.join(carpetaEntrada, `${ingestionId}.RH.1.xml`), 'RH_258');
    fs.writeFileSync(path.join(carpetaEntrada, `${ingestionId}.RH.2.xml`), 'RH_259');
    fs.writeFileSync(path.join(carpetaEntrada, `${ingestionId}.PDF.1.pdf`), 'PDF_259');
    fs.writeFileSync(path.join(carpetaEntrada, `${ingestionId}.PDF.2.pdf`), 'PDF_258');

    const { procesarManifest, serviceMock } = loadImporterWithMocks({
      DOC_258: {
        tipo: 'FacturaElectronica',
        data: buildFacturaData({
          clave: 'clave-258',
          numeroConsecutivo: '00100001010000000258',
          receptor: receptor258,
        }),
      },
      DOC_259: {
        tipo: 'FacturaElectronica',
        data: buildFacturaData({
          clave: 'clave-259',
          numeroConsecutivo: '00100001010000000259',
          receptor: receptor259,
        }),
      },
      RH_258: {
        tipo: 'MensajeHacienda',
        data: buildMensajeHaciendaData({ clave: 'clave-258', receptor: receptor258 }),
      },
      RH_259: {
        tipo: 'MensajeHacienda',
        data: buildMensajeHaciendaData({ clave: 'clave-259', receptor: receptor259 }),
      },
    });

    await procesarManifest(manifestPath, {
      baseDir: tempRoot,
      carpetaEntrada,
      carpetaProcesados,
    });

    const dir258 = path.join(carpetaProcesados, receptor258, ingestionId);
    const dir259 = path.join(carpetaProcesados, receptor259, ingestionId);
    const rel = (...parts) => toPortablePath(path.join('procesadas', ...parts));

    expect(serviceMock.insertarFactura).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ NumeroConsecutivo: '00100001010000000258' }),
      rel(receptor258, ingestionId, `${ingestionId}.DOC.1.xml`),
      rel(receptor258, ingestionId, `${ingestionId}.PDF.2.pdf`)
    );
    expect(serviceMock.insertarFactura).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ NumeroConsecutivo: '00100001010000000259' }),
      rel(receptor259, ingestionId, `${ingestionId}.DOC.2.xml`),
      rel(receptor259, ingestionId, `${ingestionId}.PDF.1.pdf`)
    );
    expect(serviceMock.insertarMensajeHacienda).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ Clave: 'clave-258' }),
      rel(receptor258, ingestionId, `${ingestionId}.RH.1.xml`)
    );
    expect(serviceMock.insertarMensajeHacienda).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ Clave: 'clave-259' }),
      rel(receptor259, ingestionId, `${ingestionId}.RH.2.xml`)
    );

    expect(fs.existsSync(path.join(dir258, `${ingestionId}.DOC.1.xml`))).toBe(true);
    expect(fs.existsSync(path.join(dir258, `${ingestionId}.PDF.2.pdf`))).toBe(true);
    expect(fs.existsSync(path.join(dir258, `${ingestionId}.RH.1.xml`))).toBe(true);
    expect(fs.existsSync(path.join(dir258, `${ingestionId}.manifest.json`))).toBe(true);

    expect(fs.existsSync(path.join(dir259, `${ingestionId}.DOC.2.xml`))).toBe(true);
    expect(fs.existsSync(path.join(dir259, `${ingestionId}.PDF.1.pdf`))).toBe(true);
    expect(fs.existsSync(path.join(dir259, `${ingestionId}.RH.2.xml`))).toBe(true);
    expect(fs.existsSync(path.join(dir259, `${ingestionId}.manifest.json`))).toBe(true);

    expect(fs.existsSync(manifestPath)).toBe(false);
  });
});
