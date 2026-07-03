const { createComentariosUseCases } = require('../services/comentariosUseCases');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const fullAccessUser = { id: 1, permissions: ['acceso_total'] };
const assignedUser = { id: 2, permissions: ['sociedades_asignadas', 'documentos_comentar'] };

const createRepoMock = (overrides = {}) => ({
  getFacturaById: jest.fn().mockResolvedValue({ id: 42, sociedad_id: 10 }),
  listByFacturaId: jest.fn().mockResolvedValue([
    { id: 1, factura_id: 42, texto: 'Comentario QA' }
  ]),
  createComentario: jest.fn().mockResolvedValue({
    id: 2,
    factura_id: 42,
    usuario: 'qa@sendadocs.local',
    texto: 'Nuevo comentario'
  }),
  ...overrides
});

describe('comentariosUseCases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('listComentarios valida acceso a la sociedad de la factura', async () => {
    const repo = createRepoMock();
    const useCases = createComentariosUseCases({ comentariosRepo: repo });

    await expect(useCases.listComentarios({
      facturaId: 42,
      user: fullAccessUser
    })).resolves.toEqual([
      { id: 1, factura_id: 42, texto: 'Comentario QA' }
    ]);
    expect(repo.getFacturaById).toHaveBeenCalledWith(42);
    expect(repo.listByFacturaId).toHaveBeenCalledWith(42);
  });

  test('crearComentario inserta solo despues de validar acceso a la factura', async () => {
    const repo = createRepoMock();
    const useCases = createComentariosUseCases({ comentariosRepo: repo });

    await expect(useCases.crearComentario({
      facturaId: 42,
      usuario: 'qa@sendadocs.local',
      texto: 'Nuevo comentario',
      user: fullAccessUser
    })).resolves.toMatchObject({
      id: 2,
      factura_id: 42
    });
    expect(repo.createComentario).toHaveBeenCalledWith({
      facturaId: 42,
      usuario: 'qa@sendadocs.local',
      texto: 'Nuevo comentario'
    });
  });

  test('crearComentario rechaza facturas fuera de sociedades asignadas antes de insertar', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([99]);
    const repo = createRepoMock();
    const useCases = createComentariosUseCases({ comentariosRepo: repo });

    await expect(useCases.crearComentario({
      facturaId: 42,
      usuario: 'qa@sendadocs.local',
      texto: 'No autorizado',
      user: assignedUser
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(repo.createComentario).not.toHaveBeenCalled();
  });
});
