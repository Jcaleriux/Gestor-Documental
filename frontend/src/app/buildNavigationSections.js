export const buildNavigationSections = ({
  canManageSociedades,
  canManageUsers,
  canUseOrdenesCompra,
  canUseReservas,
  canUseTablasPago,
  canViewTramites,
  canEditContabilizacion,
}) => {
  const sections = [
    {
      id: 'general',
      label: 'General',
      icon: 'general',
      items: [
        { id: 'dashboard', label: 'Dashboard', to: '/', icon: 'general', visible: true },
      ],
    },
    {
      id: 'compras',
      label: 'Compras',
      icon: 'compras',
      items: [
        { id: 'facturas', label: 'Facturas', to: '/facturas', icon: 'facturas', visible: true },
        {
          id: 'retenciones-pendientes',
          label: 'Retenciones pendientes',
          to: '/retenciones-pendientes',
          icon: 'retenciones',
          visible: true,
        },
        {
          id: 'notas-credito',
          label: 'Notas de credito',
          to: '/notas-credito',
          icon: 'notas',
          visible: true,
        },
        {
          id: 'tiquetes-electronicos',
          label: 'Tiquetes electronicos',
          to: '/tiquetes-electronicos',
          icon: 'tiquetes',
          visible: true,
        },
        {
          id: 'contabilizacion-masiva',
          label: 'Contabilizacion masiva',
          to: '/contabilizacion-masiva',
          icon: 'facturas',
          visible: canEditContabilizacion,
        },
      ],
    },
    {
      id: 'tesoreria',
      label: 'Tesoreria',
      icon: 'tesoreria',
      items: [
        {
          id: 'tramites',
          label: 'Tramites de pago',
          to: '/tramites',
          icon: 'tramites',
          visible: canViewTramites,
        },
      ],
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: 'ventas',
      items: [
        {
          id: 'reservas',
          label: 'Reservas',
          to: '/reservas',
          icon: 'reservas',
          visible: canUseReservas,
        },
      ],
    },
    {
      id: 'ingenieria',
      label: 'Ingenieria',
      icon: 'ingenieria',
      items: [
        {
          id: 'tablas-pago',
          label: 'Tablas de pago',
          to: '/tablas-pago',
          icon: 'tablasPago',
          visible: canUseTablasPago,
        },
        {
          id: 'ordenes-compra',
          label: 'Ordenes de compra',
          to: '/ordenes-compra',
          icon: 'ordenesCompra',
          visible: canUseOrdenesCompra,
        },
      ],
    },
    {
      id: 'administracion',
      label: 'Administracion',
      icon: 'administracion',
      items: [
        { id: 'sociedades', label: 'Sociedades', to: '/sociedades', icon: 'sociedades', visible: canManageSociedades },
        { id: 'usuarios', label: 'Usuarios', to: '/usuarios', icon: 'usuarios', visible: canManageUsers },
        {
          id: 'proveedores',
          label: 'Proveedores',
          to: '/proveedores',
          icon: 'proveedores',
          visible: canManageUsers,
        },
        {
          id: 'centros-costo',
          label: 'Centros de costo',
          to: '/centros-costo',
          icon: 'centrosCosto',
          visible: canManageUsers,
        },
      ],
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.visible),
    }))
    .filter((section) => section.items.length > 0);
};
