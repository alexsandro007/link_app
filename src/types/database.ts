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
