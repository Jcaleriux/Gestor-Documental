-- Tabla de sociedades
CREATE TABLE IF NOT EXISTS sociedades (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nombre_proyecto VARCHAR(150),
  razon_social VARCHAR(255) NOT NULL,
  cedula_juridica VARCHAR(20) UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed inicial de sociedades
INSERT INTO sociedades (codigo, nombre_proyecto, razon_social, cedula_juridica)
VALUES
  ('TD', 'T D', 'T Desarrollos, S.A.', '3-101-691342'),
  ('NVG', 'NVG', 'Novogar, S.A.', '3-101-693063'),
  ('VSP', 'VSP (Vistas de San Pablo)', '3-101-695514, S.A.', '3-101-695514'),
  ('STR', 'STR (Senderos de Tres Rios)', '3-101-701438, S.A.', '3-101-701438'),
  ('HPA', 'HPA (Heredia Parks)', '3-101-707610, S.A.', '3-101-707610'),
  ('HME', 'HME (Heredia Metro)', 'Proyectos Altos de Heredia LTYLA, S.A.', '3-101-472368'),
  ('RMO', 'RMO (Reserva Moravia)', '3-101-747864, S. A.', '3-101-747864'),
  ('RGU', 'RGU (Real Guayabos)', 'Propiedades Sena Ba, S.A.', '3-101-737522'),
  ('RTR', 'RTR (Ribera Tres Rios)', '3-101-781386, S.A.', '3-101-781386'),
  ('VSL', 'VSL (Valle San Lorenzo)', 'Gvs Kyra, SRL.', '3-102-670718'),
  ('VSL-VEH', 'Vehiculo VSL', '3-101-786864 SA (vehiculo VSL)', '3-101-786864'),
  (NULL, 'Proyecto Cartago (Paladin)', 'GVS Lilia, S.R.L.', '3-102-670719'),
  (NULL, 'GVS Holding CR S.R.L. (Paladin)', 'GVS Holding CR, S.R.L.', '3-102-670722'),
  ('HHE', 'HHE (Habitat Heredia)', '3-101-781484, S.A.', '3-101-781484'),
  (NULL, 'Propiedad Barva', '3-101-781391, S.A.', '3-101-781391'),
  ('RLI', 'RLI (Lindora)', '3-101-802628, S. A.', '3-101-802628'),
  ('USF', 'USF (Uniko San Francisco)', '3-101-820946, S. A.', '3-101-820946'),
  ('ASF', 'ASF (Arbora San Francisco)', '3-101-861274, S. A.', '3-101-861274'),
  (NULL, 'Novogar Holding', '3-101-861249, S. A.', '3-101-861249'),
  ('NVGR', 'NVGR Maquinaria & Equipo', 'NVGR Maquinaria y Equipos, S. A.', '3-101-861187'),
  ('EMO', 'EMO (Eco Moravia)', '3-101-873996, S. A.', '3-101-873996'),
  ('EDE', 'EDE (Esencia Desamparados)', '3-101-877955, S. A.', '3-101-877955'),
  ('BSP', 'BSP (Bio San Pablo)', '3-101-887961, S. A.', '3-101-887961')
ON CONFLICT (cedula_juridica) DO NOTHING;
