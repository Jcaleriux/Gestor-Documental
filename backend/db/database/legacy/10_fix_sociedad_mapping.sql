-- Backfill con normalizacion de cedulas (solo numeros)
UPDATE facturas f
SET sociedad_id = s.id
FROM sociedades s
WHERE f.sociedad_id IS NULL
  AND regexp_replace(f.receptor->'Identificacion'->>'Numero', '\D', '', 'g')
      = regexp_replace(s.cedula_juridica, '\D', '', 'g');

UPDATE notas_credito n
SET sociedad_id = s.id
FROM sociedades s
WHERE n.sociedad_id IS NULL
  AND regexp_replace(n.xml_completo->'Receptor'->'Identificacion'->>'Numero', '\D', '', 'g')
      = regexp_replace(s.cedula_juridica, '\D', '', 'g');

UPDATE mensajes_hacienda m
SET sociedad_id = s.id
FROM sociedades s
WHERE m.sociedad_id IS NULL
  AND regexp_replace(m.xml_completo->>'NumeroCedulaReceptor', '\D', '', 'g')
      = regexp_replace(s.cedula_juridica, '\D', '', 'g');
