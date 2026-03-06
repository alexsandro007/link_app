export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  category_id: string | null;
  url: string;
  title: string;
  description: string | null;
  notes: string | null;
  place: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  image_urls: string[];
  favicon_url: string | null;
  tags: string[];
  is_public: boolean;
  is_archived: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  user_id: string;
  card_id: string | null;
  original_url: string | null;
  storage_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  created_at: string;
}

// ---- Request body types ----

export interface CreateCardBody {
  url?: string;
  title: string;
  description?: string;
  notes?: string;
  place?: string;
  price?: number | null;
  currency?: string;
  image_url?: string;
  image_urls?: string[];
  favicon_url?: string;
  tags?: string[];
  category_id?: string;
  is_public?: boolean;
}

export interface UpdateCardBody {
  url?: string;
  title?: string;
  description?: string | null;
  notes?: string | null;
  place?: string | null;
  price?: number | null;
  currency?: string;
  image_url?: string | null;
  image_urls?: string[];
  favicon_url?: string | null;
  tags?: string[];
  category_id?: string | null;
  is_public?: boolean;
  is_archived?: boolean;
}

export interface CreateCategoryBody {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  is_public?: boolean;
}

export interface UpdateCategoryBody {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_public?: boolean;
}

// ---- API Response helpers ----

// ---- Profile types ----

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  avatar_type: 'upload' | 'preset' | null;
  avatar_preset_id: number | null;
  phone: string | null;
  updated_at: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  avatar_type: 'upload' | 'preset' | null;
  avatar_preset_id: number | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  stats: {
    total_cards: number;
    archived_cards: number;
    public_cards: number;
    total_categories: number;
    last_activity: string | null;
  };
}

export interface UpdateProfileBody {
  nickname?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatar_type?: 'upload' | 'preset';
  avatar_preset_id?: number | null;
}

// ---- API Response helpers ----

export interface ApiError {
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
}
