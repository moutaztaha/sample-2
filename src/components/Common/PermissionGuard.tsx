import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGuardProps {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  requireAll?: boolean;
}

/**
 * A component that conditionally renders its children based on user permissions
 * 
 * @param permission - A single permission string or array of permission strings to check
 * @param fallback - Optional content to render if user doesn't have the required permissions
 * @param children - Content to render if user has the required permissions
 * @param requireAll - If true and permission is an array, all permissions are required. Default is false (any permission is sufficient)
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  fallback = null, 
  children,
  requireAll = false
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  
  // Check if user has the required permission(s)
  const hasAccess = () => {
    if (Array.isArray(permission)) {
      return requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
    }
    return hasPermission(permission);
  };

  return hasAccess() ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;