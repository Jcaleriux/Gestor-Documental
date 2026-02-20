const withTransaction = async (getClient, handler) => {
  if (!getClient) {
    throw new Error('getClient requerido');
  }
  if (typeof handler !== 'function') {
    throw new Error('handler requerido');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await handler(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { withTransaction };
