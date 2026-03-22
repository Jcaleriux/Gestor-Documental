import { useMemo } from 'react';
import { buildDashboardViewModel } from '../../components/dashboard/dashboardViewModel.js';

export const useDashboardViewModel = ({
  stats,
  recentDocs,
  authUser = null,
  userPermissions = [],
  selectedSociedadName = '',
} = {}) => (
  useMemo(
    () => buildDashboardViewModel({
      stats,
      recentDocs,
      authUser,
      userPermissions,
      selectedSociedadName,
    }),
    [authUser, recentDocs, selectedSociedadName, stats, userPermissions],
  )
);
