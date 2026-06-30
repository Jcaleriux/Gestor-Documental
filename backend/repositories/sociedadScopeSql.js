const normalizeSociedadIds = (sociedadIds) => (
  [...new Set(
    (Array.isArray(sociedadIds) ? sociedadIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )]
);

const addSociedadScopeClause = ({
  params,
  clauses,
  column,
  sociedadId,
  sociedadIds
}) => {
  if (sociedadId) {
    params.push(sociedadId);
    clauses.push(`${column} = $${params.length}`);
    return;
  }

  if (Array.isArray(sociedadIds)) {
    const normalizedSociedadIds = normalizeSociedadIds(sociedadIds);
    if (normalizedSociedadIds.length === 0) {
      clauses.push('1 = 0');
      return;
    }

    params.push(normalizedSociedadIds);
    clauses.push(`${column} = ANY($${params.length}::int[])`);
  }
};

module.exports = {
  addSociedadScopeClause,
  normalizeSociedadIds
};
