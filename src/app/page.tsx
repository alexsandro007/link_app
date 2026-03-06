import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'Linkery — личная коллекция находок из интернета',
  description:
    'Сохраняйте товары, ссылки, статьи с ценами, фото и тегами. Быстрый поиск, полная приватность, экспорт данных.',
  openGraph: {
    title: 'Linkery — личная коллекция находок',
    description: 'Ваша приватная база интернет-находок',
    siteName: 'Linkery',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linkery',
    description: 'Сохраняйте, организуйте и находите интернет-находки',
  },
};

export default function HomePage() {
  return <LandingPage />;
}
