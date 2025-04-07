"use client";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, FC } from "react";
import { useUser } from "@/hooks/use-user";
import { USER_ROLES } from "@/enums/resources";

interface WithAuthProps {
  requiredRole?: string;
  requiredPermissions?: string[];
  children?: ReactNode;
}

const withAuth = (Component: FC, options: WithAuthProps) => {
  const AuthComponent: FC = (props) => {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
      const checkPermissions = async () => {
        if (loading) return;

        if (!user) {
          router.push("/");
          return;
        }

        const userData = user;

        if (options.requiredRole && userData.role !== options.requiredRole && userData.role !== USER_ROLES.ADMIN) {
          router.push("/unauthorized");
          return;
        }

        if (
          options.requiredPermissions &&
          options.requiredPermissions.length > 0
        ) {
          const hasPermissions = options.requiredPermissions.every(
            (permission) => {
              const [resource, perm] = permission.split(":");
              return userData.permissions?.[resource]?.[perm];
            }
          );
          if (!hasPermissions) {
            router.push("/unauthorized");
            return;
          }
        }
      };

      checkPermissions();
    }, [
      user,
      loading,
      router,
      options.requiredRole,
      options.requiredPermissions,
    ]);

    if (loading || !user) {
      return <div>Loading...</div>;
    }

    return <Component {...props} />;
  };

  return AuthComponent;
};

export default withAuth;
