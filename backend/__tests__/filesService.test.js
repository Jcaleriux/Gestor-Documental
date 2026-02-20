const { sendFile, isRequestAbortedError } = require('../services/filesService');

describe('filesService', () => {
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
});
