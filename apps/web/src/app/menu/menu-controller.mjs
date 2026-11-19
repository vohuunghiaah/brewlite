import { fetchProducts, fetchProductById } from './products.mjs';

export const AVAILABLE_SIZES = [
  { id: 'SMALL', name: 'Nhỏ (S)', surcharge: 0 },
  { id: 'MEDIUM', name: 'Vừa (M)', surcharge: 5000 },
  { id: 'LARGE', name: 'Lớn (L)', surcharge: 10000 },
];

export const AVAILABLE_TOPPINGS = [
  { name: 'Kem cheese', price: 10000 },
  { name: 'Trân châu trắng', price: 8000 },
  { name: 'Thạch đào', price: 8000 },
  { name: 'Sốt caramel', price: 6000 },
  { name: 'Thạch sương sáo', price: 6000 },
];

export const SIZE_PRICE_MODIFIERS = {
  SMALL: 0,
  MEDIUM: 5000,
  LARGE: 10000,
};

export const TOPPING_PRICES = {
  'Kem cheese': 10000,
  'Trân châu trắng': 8000,
  'Thạch đào': 8000,
  'Sốt caramel': 6000,
  'Thạch sương sáo': 6000,
};

export const AVAILABLE_ICE_LEVELS = ['Không đá', 'Ít đá', 'Đá đầy'];
export const AVAILABLE_SUGAR_LEVELS = ['0%', '30%', '70%', '100%'];

/**
 * Kết hợp mức đá, mức đường và ghi chú tự do thành một chuỗi duy nhất,
 * tránh trùng lặp, bảo toàn thông tin và khống chế tối đa 255 ký tự (DB constraint).
 */
export function combineItemNote(ice = 'Đá đầy', sugar = '100%', customNote = '') {
  const parts = [];
  if (ice) {
    parts.push(ice);
  }
  if (sugar) {
    parts.push(`${sugar} đường`);
  }
  const trimmed = (customNote || '').trim();
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    const isIceDuplicate = ice && lower === ice.toLowerCase();
    const isSugarDuplicate = sugar && lower === `${sugar} đường`.toLowerCase();
    if (!isIceDuplicate && !isSugarDuplicate) {
      parts.push(trimmed);
    }
  }
  const combined = parts.join(', ');
  return combined.slice(0, 255);
}

export function calculateItemPrice(basePrice, size = 'SMALL', toppings = []) {
  const sizeMod = SIZE_PRICE_MODIFIERS[size] ?? 0;
  const toppingTotal = (toppings || []).reduce((sum, t) => sum + (TOPPING_PRICES[t] ?? 0), 0);
  return Math.max(0, Number(basePrice || 0) + sizeMod + toppingTotal);
}

export function buildCartItemKey(productId, size = 'SMALL', toppings = [], note = '') {
  const sortedTops = (toppings || []).slice().sort().join('+');
  return `${productId}__${size}__${sortedTops}__${(note || '').trim().toLowerCase()}`;
}

/**
 * Phân loại đồ uống tự động dựa trên tên và mô tả sản phẩm
 */
export function getCategory(product) {
  const details = `${product.name} ${product.description || ''}`.toLocaleLowerCase();
  if (/trà|tea|đào|cam/.test(details)) return 'Trà trái cây';
  if (/cold brew|espresso|americano/.test(details)) return 'Cold Brew & Espresso';
  if (/cà phê|latte|cappuccino/.test(details)) return 'Cà phê truyền thống';
  if (/bánh|cake/.test(details)) return 'Bánh ngọt';
  return 'Khác';
}

/**
 * Lọc danh sách sản phẩm theo từ khóa tìm kiếm và danh mục
 */
export function filterProducts(products, search, selectedCategory) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return products.filter((product) => {
    const searchText = `${product.name} ${product.description || ''}`.toLocaleLowerCase();
    const matchesSearch = !normalizedSearch || searchText.includes(normalizedSearch);
    const matchesCategory =
      selectedCategory === 'Tất cả' ||
      getCategory(product) === selectedCategory;
    return matchesSearch && matchesCategory;
  });
}

/**
 * Controller quản lý trạng thái Product Detail Modal
 * Khắc phục triệt để các tình huống bất đồng bộ:
 * - Hủy request cũ bằng AbortController khi đóng modal hoặc chuyển sản phẩm.
 * - Kiểm soát sequence ID (requestId) ngăn chặn response cũ ghi đè dữ liệu mới.
 * - Tuyệt đối không tự động mở lại modal sau khi người dùng đã đóng.
 * - Bắt lỗi kết nối mạng và hỗ trợ trạng thái lỗi kèm nút thử lại.
 */
export function createMenuModalController({
  apiUrl = 'http://localhost:3001',
  fetchDetailFn = fetchProductById,
} = {}) {
  let state = {
    selectedProduct: null,
    loadingDetail: false,
    detailError: '',
    isOpen: false,
  };

  let listeners = [];
  let currentController = null;
  let currentRequestId = 0;
  let currentProductId = null;

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  function emit() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  async function openProductDetail(product) {
    if (!product) return;

    // 1. Hủy bỏ bất kỳ request chi tiết nào đang trong quá trình thực thi
    if (currentController) {
      currentController.abort();
      currentController = null;
    }

    const requestId = ++currentRequestId;
    currentProductId = product.id;
    const controller = new AbortController();
    currentController = controller;

    // 2. Mở modal ngay lập tức với dữ liệu xem trước từ thẻ sản phẩm
    state = {
      selectedProduct: product,
      loadingDetail: true,
      detailError: '',
      isOpen: true,
    };
    emit();

    try {
      const freshDetail = await fetchDetailFn(apiUrl, product.id, controller.signal);

      // 3. Kiểm tra tính hợp lệ: Request phải là mới nhất, cùng product.id, và modal vẫn đang mở
      if (
        requestId === currentRequestId &&
        currentProductId === product.id &&
        state.isOpen &&
        !controller.signal.aborted
      ) {
        state = {
          ...state,
          selectedProduct: freshDetail,
          loadingDetail: false,
          detailError: '',
        };
        emit();
      }
    } catch (err) {
      // Bỏ qua nếu request bị hủy có chủ đích (đóng modal hoặc chuyển sản phẩm)
      if (controller.signal.aborted || requestId !== currentRequestId || !state.isOpen) {
        return;
      }
      state = {
        ...state,
        loadingDetail: false,
        detailError: err instanceof Error ? err.message : 'Không thể tải chi tiết sản phẩm',
      };
      emit();
    } finally {
      if (
        requestId === currentRequestId &&
        state.isOpen &&
        !controller.signal.aborted &&
        state.loadingDetail
      ) {
        state = {
          ...state,
          loadingDetail: false,
        };
        emit();
      }
    }
  }

  function closeProductDetail() {
    // 1. Hủy bỏ request đang chạy
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
    // 2. Tăng requestId để vô hiệu hóa response muộn
    currentRequestId++;
    currentProductId = null;

    // 3. Đóng modal và reset trạng thái
    state = {
      selectedProduct: null,
      loadingDetail: false,
      detailError: '',
      isOpen: false,
    };
    emit();
  }

  function handleEscape() {
    if (state.isOpen) {
      closeProductDetail();
      return true;
    }
    return false;
  }

  return {
    getState,
    subscribe,
    openProductDetail,
    closeProductDetail,
    handleEscape,
  };
}

/**
 * Controller quản lý vòng đời Menu (Loading, Empty, Error & Retry)
 */
export function createMenuLifecycleController({
  apiUrl = 'http://localhost:3001',
  fetchProductsFn = fetchProducts,
} = {}) {
  let state = {
    products: [],
    loading: true,
    error: '',
    search: '',
    selectedCategory: 'Tất cả',
  };

  let listeners = [];
  let currentController = null;

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  function emit() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  async function loadProducts() {
    if (currentController) {
      currentController.abort();
    }
    const controller = new AbortController();
    currentController = controller;

    state = {
      ...state,
      loading: true,
      error: '',
    };
    emit();

    try {
      const data = await fetchProductsFn(apiUrl, controller.signal);
      if (!controller.signal.aborted) {
        state = {
          ...state,
          products: data,
          loading: false,
          error: '',
        };
        emit();
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      state = {
        ...state,
        loading: false,
        error: err instanceof Error ? err.message : 'Không thể tải danh sách đồ uống',
      };
      emit();
    } finally {
      if (!controller.signal.aborted && state.loading) {
        state = { ...state, loading: false };
        emit();
      }
    }
  }

  function setSearch(query) {
    state = { ...state, search: query };
    emit();
  }

  function setSelectedCategory(category) {
    state = { ...state, selectedCategory: category };
    emit();
  }

  function getFilteredProducts() {
    return filterProducts(state.products, state.search, state.selectedCategory);
  }

  return {
    getState,
    subscribe,
    loadProducts,
    setSearch,
    setSelectedCategory,
    getFilteredProducts,
  };
}

/**
 * Controller quản lý phiên xác thực JWT (Auth Session)
 * Tương thích hoàn toàn với Next.js SSR và React useSyncExternalStore
 */
export function createAuthController() {
  const initial = { token: null, user: null };
  let state = initial;
  let initialized = false;
  let listeners = [];

  function getState() {
    if (!initialized && typeof window !== 'undefined') {
      initialized = true;
      try {
        const savedToken = localStorage.getItem('brewlite_access_token');
        const savedUser = localStorage.getItem('brewlite_user');
        if (savedToken && savedUser) {
          state = { token: savedToken, user: JSON.parse(savedUser) };
        }
      } catch {
        // Bỏ qua lỗi storage
      }
    }
    return state;
  }

  function getServerSnapshot() {
    return initial;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  function emit() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function setSession(token, user) {
    state = { token, user };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('brewlite_access_token', token);
        localStorage.setItem('brewlite_user', JSON.stringify(user));
      }
    } catch {
      // Bỏ qua lỗi storage
    }
    emit();
  }

  function clearSession() {
    state = { token: null, user: null };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('brewlite_access_token');
        localStorage.removeItem('brewlite_user');
      }
    } catch {
      // Bỏ qua lỗi storage
    }
    emit();
  }

  return {
    getState,
    getServerSnapshot,
    subscribe,
    setSession,
    clearSession,
  };
}

/**
 * Tạo khóa Idempotency duy nhất cho giao dịch thanh toán (UC-10 / FR-08)
 */
export function generatePaymentIdempotencyKey(orderId) {
  return `idem-${orderId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
