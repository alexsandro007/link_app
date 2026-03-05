import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CardList, CardListWindow } from './CardList';
import type { Card, Category } from '@/types/database';

// ── Mock данные ────────────────────────────────────────────────────────────────

const mockCategories: Record<string, Category> = {
  'cat-1': { id: 'cat-1', user_id: 'u1', name: 'Игры', slug: 'games', description: null, color: '#339af0', icon: null, is_public: false, created_at: '', updated_at: '' },
  'cat-2': { id: 'cat-2', user_id: 'u1', name: 'Техника', slug: 'tech', description: null, color: '#51cf66', icon: null, is_public: false, created_at: '', updated_at: '' },
  'cat-3': { id: 'cat-3', user_id: 'u1', name: 'Разработка', slug: 'dev', description: null, color: '#f03e3e', icon: null, is_public: false, created_at: '', updated_at: '' },
};

function makeCard(overrides: Partial<Card> & { id: string }): Card {
  return {
    user_id: 'u1',
    category_id: null,
    url: 'https://example.com',
    title: 'Пример карточки',
    description: null,
    notes: null,
    place: null,
    price: null,
    currency: 'USD',
    image_url: null,
    favicon_url: null,
    tags: [],
    is_public: false,
    is_archived: false,
    click_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const mockCards: Card[] = [
  makeCard({
    id: '1',
    title: 'Next.js 16 — Release Notes',
    url: 'https://nextjs.org/blog/next-16',
    favicon_url: 'https://nextjs.org/favicon.ico',
    image_url: 'https://picsum.photos/seed/next/400/220',
    notes: 'Изучить App Router и Turbopack изменения в 16 версии.',
    tags: ['nextjs', 'react', 'frontend'],
    category_id: 'cat-3',
    price: null,
  }),
  makeCard({
    id: '2',
    title: 'Sony WH-1000XM5 — Наушники с ANC',
    url: 'https://www.sony.com/headphones/wh1000xm5',
    image_url: 'https://picsum.photos/seed/sony/400/220',
    place: 'Sony Store',
    price: 28990,
    currency: 'RUB',
    tags: ['наушники', 'Sony', 'ANC'],
    category_id: 'cat-2',
  }),
  makeCard({
    id: '3',
    title: 'Elden Ring — обзор на Metacritic',
    url: 'https://www.metacritic.com/game/elden-ring',
    image_url: 'https://picsum.photos/seed/elden/400/220',
    notes: 'Рейтинг 96. Обязательно пройти.',
    tags: ['игра', 'FromSoftware', 'souls'],
    category_id: 'cat-1',
    price: 1999,
    currency: 'RUB',
  }),
  makeCard({
    id: '4',
    title: 'Keychron Q1 Mechanical Keyboard',
    url: 'https://www.keychron.com/products/keychron-q1',
    image_url: 'https://picsum.photos/seed/key/400/220',
    place: 'Keychron Official',
    price: 149,
    currency: 'USD',
    tags: ['клавиатура', 'механика', 'Keychron'],
    category_id: 'cat-2',
  }),
  makeCard({
    id: '5',
    title: 'Supabase — Open Source Firebase',
    url: 'https://supabase.com',
    favicon_url: 'https://supabase.com/favicon.ico',
    notes: 'Postgres + Auth + Storage. Используем в проекте Linkery.',
    tags: ['supabase', 'database', 'backend'],
    category_id: 'cat-3',
  }),
  makeCard({
    id: '6',
    title: 'Cyberpunk 2077 — Phantom Liberty DLC',
    url: 'https://store.steampowered.com/app/2138330',
    image_url: 'https://picsum.photos/seed/cyber/400/220',
    place: 'Steam',
    price: 1799,
    currency: 'RUB',
    tags: ['игра', 'RPG', 'CDPR'],
    category_id: 'cat-1',
  }),
  makeCard({
    id: '7',
    title: 'TypeScript 5.8 — What\'s New',
    url: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-8',
    notes: 'Новые фичи: erasableSyntax, satisfies improvements.',
    tags: ['typescript', 'javascript', 'microsoft'],
    category_id: 'cat-3',
    is_archived: true,
  }),
  makeCard({
    id: '8',
    title: 'LG OLED C3 — лучший телевизор 2024',
    url: 'https://www.rtings.com/tv/reviews/lg/c3-oled',
    image_url: 'https://picsum.photos/seed/lg/400/220',
    place: 'М.Видео',
    price: 89990,
    currency: 'RUB',
    tags: ['телевизор', 'OLED', 'LG', '4K', 'gaming'],
    category_id: 'cat-2',
  }),
];

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof CardListWindow> = {
  title: 'Cards/CardList',
  component: CardListWindow,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Сетка карточек с поддержкой infinite scroll (IntersectionObserver). ' +
          'Содержит встроенный виртуализатор строк (`@tanstack/react-virtual`), ' +
          'адаптивное число колонок и состояния: loading, error, empty.',
      },
    },
  },
  argTypes: {
    onEdit:     { action: 'edit' },
    onDelete:   { action: 'delete' },
    onArchive:  { action: 'archive' },
    onLoadMore: { action: 'loadMore' },
    onRetry:    { action: 'retry' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardListWindow>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — список карточек',
  args: {
    cards: mockCards,
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: true,
    categoriesMap: mockCategories,
  },
  parameters: {
    docs: { description: { story: '8 карточек, разные категории, цены, теги. Одна карточка в архиве.' } },
  },
};

export const Loading: Story = {
  name: 'Loading — первая загрузка',
  args: {
    cards: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: false,
    categoriesMap: {},
  },
  parameters: {
    docs: { description: { story: 'Отображает сетку skeleton-заглушек пока данные загружаются.' } },
  },
};

export const LoadingMore: Story = {
  name: 'LoadingMore — подгрузка страницы',
  args: {
    cards: mockCards,
    loading: false,
    loadingMore: true,
    error: null,
    hasMore: true,
    categoriesMap: mockCategories,
  },
  parameters: {
    docs: { description: { story: 'Основной список отображён, внизу — индикатор загрузки следующей страницы.' } },
  },
};

export const Empty: Story = {
  name: 'Empty — нет карточек',
  args: {
    cards: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    categoriesMap: {},
    filters: {},
  },
  parameters: {
    docs: { description: { story: 'Пустое состояние без фильтров — приглашение создать первую карточку.' } },
  },
};

export const EmptyFiltered: Story = {
  name: 'EmptyFiltered — поиск без результата',
  args: {
    cards: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    categoriesMap: {},
    filters: { q: 'несуществующийзапрос', categoryId: 'cat-1' },
  },
  parameters: {
    docs: { description: { story: 'Пустое состояние при активных фильтрах — предложение изменить запрос.' } },
  },
};

export const Error: Story = {
  name: 'Error — ошибка загрузки',
  args: {
    cards: [],
    loading: false,
    loadingMore: false,
    error: 'Сетевая ошибка: не удалось подключиться к серверу',
    hasMore: false,
    categoriesMap: {},
  },
  parameters: {
    docs: { description: { story: 'Отображает Alert с текстом ошибки и кнопкой «Повторить».' } },
  },
};

export const NoMore: Story = {
  name: 'NoMore — все карточки загружены',
  args: {
    cards: mockCards,
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    categoriesMap: mockCategories,
  },
  parameters: {
    docs: { description: { story: 'Список загружен полностью — внизу текст «Показаны все карточки».' } },
  },
};

export const WithoutImages: Story = {
  name: 'WithoutImages — без превью',
  args: {
    cards: mockCards.map((c) => ({ ...c, image_url: null })),
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    categoriesMap: mockCategories,
  },
  parameters: {
    docs: { description: { story: 'Карточки без поля image_url — секция превью скрыта, компактный вид.' } },
  },
};
