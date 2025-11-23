'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader, Center, Container } from '@mantine/core';

export interface WithAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = '/auth/signin', requireAuth = true } = options;

  return function ProtectedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (requireAuth && !user) {
          router.push(redirectTo);
        } else if (!requireAuth && user) {
          // Если пользователь залогинен, но страница для незалогиненных (например, signin)
          router.push('/');
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <Container>
          <Center style={{ minHeight: '100vh' }}>
            <Loader size="xl" />
          </Center>
        </Container>
      );
    }

    if (requireAuth && !user) {
      return null;
    }

    if (!requireAuth && user) {
      return null;
    }

    return <Component {...props} />;
  };
}
