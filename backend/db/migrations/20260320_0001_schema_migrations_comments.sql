COMMENT ON TABLE public.schema_migrations IS
  'Registro canonico de migraciones versionadas aplicadas sobre el schema runtime de Proyecto Novogar.';

COMMENT ON COLUMN public.schema_migrations.version IS
  'Version unica de la migracion con formato YYYYMMDD_NNNN.';

COMMENT ON COLUMN public.schema_migrations.name IS
  'Nombre legible e inmutable de la migracion.';

COMMENT ON COLUMN public.schema_migrations.checksum IS
  'Hash SHA-256 del archivo aplicado o marcador especial para baseline.';

COMMENT ON COLUMN public.schema_migrations.source IS
  'Origen del registro: bootstrap para baseline, migration para archivos versionados.';

COMMENT ON COLUMN public.schema_migrations.execution_ms IS
  'Duracion medida por el runner para la ejecucion de la migracion.';

COMMENT ON COLUMN public.schema_migrations.metadata IS
  'Metadatos auxiliares del runner, como filename y tipo de migracion.';
