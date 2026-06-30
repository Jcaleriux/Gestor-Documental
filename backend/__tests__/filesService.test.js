const {
  createFilesHandlers,
  sendFile,
  authorizeFileAccess,
  inferKindFromPath,
  isRequestAbortedError
} = require('../services/filesService');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

describe('filesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('isRequestAbortedError detecta abortos de cliente', () => {
    expect(isRequestAbortedError({ code: 'ECONNABORTED', message: 'Request aborted' })).toBe(true);
    expect(isRequestAbortedError({ code: 'ECONNRESET', message: 'socket hang up' })).toBe(true);
    expect(isRequestAbortedError({ code: 'ENOENT', message: 'no such file' })).toBe(false);
  });

  test('sendFile no hace log cuando el cliente aborta', async () => {
    const res = {
      type: jest.fn(),
      setHeader: jest.fn(),
      sendFile: jest.fn((_, callback) => callback({
        code: 'ECONNABORTED',
        message: 'Request aborted'
      }))
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendFile(res, '/tmp/demo.pdf', {
      logMessage: 'Error sending PDF file:'
    })).rejects.toMatchObject({
      status: 499,
      message: 'Client aborted request'
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('sendFile hace log y devuelve 404 para errores reales de archivo', async () => {
    const res = {
      type: jest.fn(),
      setHeader: jest.fn(),
      sendFile: jest.fn((_, callback) => callback({
        code: 'ENOENT',
        message: 'Not found'
      }))
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendFile(res, '/tmp/missing.pdf', {
      logMessage: 'Error sending PDF file:'
    })).rejects.toMatchObject({
      status: 404,
      message: 'File not found'
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('inferKindFromPath trata XML como xml y el resto como pdf', () => {
    expect(inferKindFromPath('documentos/factura.xml')).toBe('xml');
    expect(inferKindFromPath('documentos/factura.pdf')).toBe('pdf');
  });

  test('authorizeFileAccess permite recurso de sociedad asignada', async () => {
    const documentResourceRepoImpl = {
      listDocumentResourcesByPath: jest.fn().mockResolvedValue([
        { resource_type: 'factura_pdf', resource_id: 12, sociedad_id: 10 }
      ])
    };
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10]);

    await expect(authorizeFileAccess({
      user: { id: 5, permissions: ['sociedades_asignadas', 'documentos_ver'] },
      rawPath: 'documentos/factura.pdf',
      kind: 'pdf',
      baseDir: 'C:/storage',
      documentResourceRepoImpl
    })).resolves.toMatchObject({
      resource_type: 'factura_pdf',
      sociedad_id: 10
    });
  });

  test('authorizeFileAccess rechaza recurso no registrado', async () => {
    const documentResourceRepoImpl = {
      listDocumentResourcesByPath: jest.fn().mockResolvedValue([])
    };

    await expect(authorizeFileAccess({
      user: { id: 5, permissions: ['acceso_total'] },
      rawPath: 'documentos/no-registrado.pdf',
      kind: 'pdf',
      baseDir: 'C:/storage',
      resolvePendingPdfAccessImpl: jest.fn().mockResolvedValue(null),
      documentResourceRepoImpl
    })).rejects.toMatchObject({
      status: 404,
      message: 'File not found'
    });
  });

  test('authorizeFileAccess rechaza recurso de sociedad no asignada', async () => {
    const documentResourceRepoImpl = {
      listDocumentResourcesByPath: jest.fn().mockResolvedValue([
        { resource_type: 'factura_pdf', resource_id: 12, sociedad_id: 99 }
      ])
    };
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10]);

    await expect(authorizeFileAccess({
      user: { id: 5, permissions: ['sociedades_asignadas', 'documentos_ver'] },
      rawPath: 'documentos/factura.pdf',
      kind: 'pdf',
      baseDir: 'C:/storage',
      documentResourceRepoImpl
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
  });

  test('getPdf autoriza antes de resolver y enviar el archivo', async () => {
    const authorizeFileAccessImpl = jest.fn().mockResolvedValue({ sociedad_id: 10 });
    const getPdfFile = jest.fn(() => ({ fullPath: 'C:/docs/factura.pdf', filename: 'factura.pdf' }));
    const handlers = createFilesHandlers('C:/storage', {
      createFilesUseCasesImpl: () => ({ getPdfFile }),
      authorizeFileAccessImpl
    });
    const req = {
      user: { id: 1, permissions: ['acceso_total'] },
      query: { path: 'documentos/factura.pdf' }
    };
    const res = {
      sendFile: jest.fn((_, callback) => callback()),
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    await handlers.getPdf(req, res);

    expect(authorizeFileAccessImpl).toHaveBeenCalledWith(expect.objectContaining({
      user: req.user,
      rawPath: 'documentos/factura.pdf',
      kind: 'pdf'
    }));
    expect(getPdfFile).toHaveBeenCalledWith({ rawPath: 'documentos/factura.pdf' });
    expect(res.sendFile).toHaveBeenCalledWith('C:/docs/factura.pdf', expect.any(Function));
  });
});
