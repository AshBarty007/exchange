import { useLocation } from 'react-router-dom';
import { portals } from '@/config/portalConfig';

/**
 * Returns the current portal's base path (e.g. "/admin", "/bank").
 * Falls back to "" if not inside a portal.
 */
export function usePortalBase(): string {
  const location = useLocation();
  for (const portal of portals) {
    if (location.pathname.startsWith(portal.basePath + '/') || location.pathname === portal.basePath) {
      return portal.basePath;
    }
  }
  return '';
}
