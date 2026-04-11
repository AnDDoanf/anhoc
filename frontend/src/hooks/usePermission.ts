import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

/**
 * usePermission
 * 
 * A hook to check if the current user has a specific permission.
 * Usage:
 * const canCreateLesson = usePermission('CREATE', 'LESSON');
 */
export function usePermission(action: string, resource: string): boolean {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) return false;

  // 1. Admin bypass: Admin can do anything
  if (user.role === 'admin') return true;

  // 2. Check permissions record
  const permissions = user.permissions || {};
  const resourceKey = resource.toLowerCase();
  const actionKey = action.toLowerCase();

  const resourceActions = permissions[resourceKey] || [];

  // Standard permission match or 'manage' wildcard
  return resourceActions.includes(actionKey) || resourceActions.includes('manage');
}
