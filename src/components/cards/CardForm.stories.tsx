import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within, expect } from 'storybook/test';
import { CardForm } from '@/components/cards/CardForm';
import type { CardFormValues } from '@/components/cards/CardForm';
import type { FileWithPath } from '@mantine/dropzone';

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof CardForm> = {
  title: 'Cards/CardForm',
  component: CardForm,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Форма создания/редактирования карточки. Переиспользуется для режимов `create` и `edit`.',
      },
    },
  },
  argTypes: {
    mode: {
      control: 'radio',
      options: ['create', 'edit'],
      description: 'Режим формы',
    },
    onSubmit: { action: 'submitted' },
    onCancel: { action: 'cancelled' },
  },
};

export default meta;
type Story = StoryObj<typeof CardForm>;

// ── Общие категории для историй ───────────────────────────────────────────────

const sampleCategories = [
  { id: 'cat-1', name: 'Игры' },
  { id: 'cat-2', name: 'Техника' },
  { id: 'cat-3', name: 'Книги' },
  { id: 'cat-4', name: 'Разработка' },
];

// ── Быстрый обработчик-заглушка ───────────────────────────────────────────────

const noop = async (_v: CardFormValues, _f: FileWithPath[], _r: string[]) => {
  await new Promise((res) => setTimeout(res, 800));
};

// ──────────────────────────────────────────────────────────────────────────────
// Story: Empty
// Пустая форма — состояние по умолчанию при создании новой карточки.
// ──────────────────────────────────────────────────────────────────────────────

export const Empty: Story = {
  name: 'Empty — пустая форма',
  args: {
    mode: 'create',
    categories: sampleCategories,
    onSubmit: noop,
    onCancel: undefined,
  },
  parameters: {
    docs: {
      description: { story: 'Форма создания карточки без предзаполненных данных.' },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Story: Filled
// Форма для редактирования — все поля заполнены начальными значениями.
// ──────────────────────────────────────────────────────────────────────────────

export const Filled: Story = {
  name: 'Filled — заполненная форма (Edit)',
  args: {
    mode: 'edit',
    categories: sampleCategories,
    initialValues: {
      title: 'Sony WH-1000XM5 — обзор',
      url: 'https://www.rtings.com/headphones/reviews/sony/wh-1000xm5',
      place: 'Sony Store / Яндекс Маркет',
      price: 28990,
      currency: 'RUB',
      notes:
        'Лучшие беспроводные наушники с ANC. Отличный звук, 30 ч работы. Минус — складных нет.',
      tags: ['наушники', 'ANC', 'Sony', 'аудио'],
      category_id: 'cat-2',
      is_public: false,
    },
    onSubmit: noop,
    onCancel: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Форма в режиме редактирования, все поля предзаполнены.',
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Story: WithImages
// Форма с уже загруженными изображениями (редактирование существующей карточки).
// ──────────────────────────────────────────────────────────────────────────────

export const WithImages: Story = {
  name: 'WithImages — с изображениями',
  args: {
    mode: 'edit',
    categories: sampleCategories,
    initialValues: {
      title: 'Механическая клавиатура Keychron Q1',
      url: 'https://www.keychron.com/products/keychron-q1',
      place: 'Keychron Official',
      price: 149,
      currency: 'USD',
      notes: 'Алюминиевый корпус, RGB, hotswap. Брать с Gateron G Pro Red.',
      tags: ['клавиатура', 'keychron', 'механика'],
      category_id: 'cat-4',
      is_public: false,
    },
    // Плейсхолдеры изображений Picsum
    initialImages: [
      'https://picsum.photos/seed/kb1/400/300',
      'https://picsum.photos/seed/kb2/400/300',
      'https://picsum.photos/seed/kb3/400/300',
    ],
    onSubmit: noop,
    onCancel: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          'Форма с тремя уже загруженными изображениями. Каждое можно удалить, нажав иконку корзины.',
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Story: Loading
// Форма в состоянии загрузки — onSubmit висит, кнопка показывает спиннер.
// Используем play() чтобы автоматически нажать «Создать карточку».
// ──────────────────────────────────────────────────────────────────────────────

export const Loading: Story = {
  name: 'Loading — состояние отправки',
  args: {
    mode: 'create',
    categories: sampleCategories,
    initialValues: {
      title: 'Тест загрузки',
      url: 'https://example.com',
    },
    // Promise никогда не резолвится → кнопка остаётся в состоянии загрузки
    onSubmit: () => new Promise(() => {}),
    onCancel: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          '`onSubmit` возвращает Promise, который не завершается. Это симулирует ожидание ответа сервера — кнопка показывает спиннер, поля заблокированы.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Ждём рендера формы
    const submitBtn = await canvas.findByRole('button', { name: /создать карточку/i });

    // Клик по кнопке запускает onSubmit → форма уходит в loading
    await userEvent.click(submitBtn);

    // Убеждаемся, что кнопка перешла в состояние loading (aria-disabled)
    await expect(submitBtn).toBeDisabled();
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Story: WithValidationErrors
// Демонстрация ошибок валидации — пробуем отправить пустую форму.
// ──────────────────────────────────────────────────────────────────────────────

export const WithValidationErrors: Story = {
  name: 'WithValidationErrors — ошибки валидации',
  args: {
    mode: 'create',
    categories: sampleCategories,
    onSubmit: noop,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Нажимает «Создать карточку» с незаполненными обязательными полями — показывает ошибку валидации под полем `Название`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Нажимаем Submit без заполнения полей
    const submitBtn = await canvas.findByRole('button', { name: /создать карточку/i });
    await userEvent.click(submitBtn);

    // Ожидаем появление сообщения об ошибке
    await expect(
      await canvas.findByText(/название обязательно/i),
    ).toBeInTheDocument();
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Story: NoCategories
// Форма без категорий — Select категорий скрыт.
// ──────────────────────────────────────────────────────────────────────────────

export const NoCategories: Story = {
  name: 'NoCategories — без категорий',
  args: {
    mode: 'create',
    categories: [],
    onSubmit: noop,
  },
  parameters: {
    docs: {
      description: {
        story: 'Список категорий пуст — блок выбора категории не отображается.',
      },
    },
  },
};
