'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Center, Loader } from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ForWhomSection } from '@/components/landing/ForWhomSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { DemoSection } from '@/components/landing/DemoSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

export function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Авторизованных пользователей сразу отправляем в дашборд
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (user) return null;

  return (
    <Box>
      <LandingHeader />
      <HeroSection />
      <ForWhomSection />
      <HowItWorksSection />
      <FeaturesSection />
      <StatsSection />
      <DemoSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </Box>
  );
}
