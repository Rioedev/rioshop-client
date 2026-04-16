# Rioshop Client (Frontend)

Frontend cho dự án Rioshop, xây dựng bằng React + TypeScript + Vite.

## 1. Công nghệ chính

- React 19
- TypeScript
- Vite
- React Router
- Zustand (state management)
- Axios (HTTP client)
- Socket.IO Client (realtime)
- Ant Design + Tailwind CSS + SCSS
- React Hook Form + Yup
- Tiptap (rich text editor cho phần quản trị)

## 2. Các phân hệ hiện có

- Storefront: trang chủ, sản phẩm, chi tiết sản phẩm, giỏ hàng, checkout, đơn hàng, tài khoản, wishlist, blog, flash sale
- Auth: login/register/forgot password cho user, login cho admin
- Admin: dashboard, đơn hàng, sản phẩm, tồn kho, coupon, review, flash sale, analytics event, category, collection, users, admin accounts, brand config, blogs
- Notification realtime qua Socket.IO

## 3. Cấu trúc thư mục

```text
client/
├── public/
├── src/
│   ├── app/            # Router + bootstrap auth
│   ├── components/     # Component dùng chung
│   ├── features/       # auth/admin/store modules
│   ├── layouts/        # Layout storefront/admin
│   ├── services/       # API services + socket client
│   ├── stores/         # Zustand stores
│   ├── styles/         # SCSS themes/sections
│   └── utils/
├── index.html
├── vite.config.ts
└── package.json
```

## 4. Cài đặt

```bash
cd client
npm install
```

## 5. Biến môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Nội dung tối thiểu:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

Giải thích:

- `VITE_API_BASE_URL`: base URL backend API (axios client dùng biến này)
- `VITE_SOCKET_URL`: base URL Socket.IO (nếu để trống sẽ fallback về `VITE_API_BASE_URL`)

## 6. Chạy project

### Chế độ phát triển

```bash
npm run dev
```

Mặc định Vite chạy tại `http://localhost:5173`.

### Build production

```bash
npm run build
```

### Preview bản build

```bash
npm run preview
```

### Kiểm tra lint

```bash
npm run lint
```

## 7. Router chính

Theo `src/app/router.tsx`:

- Public auth: `/login`, `/register`, `/forgot-password`
- Admin auth: `/admin/login`
- Storefront: `/`, `/products`, `/products/:slug`, `/blog`, `/flash-sales`, `/cart`, `/wishlist`, `/checkout`, `/orders`, `/account`, ...
- Admin app: `/admin/dashboard`, `/admin/orders`, `/admin/products`, `/admin/inventories`, `/admin/coupons`, `/admin/reviews`, `/admin/flash-sales`, `/admin/analytics-events`, `/admin/categories`, `/admin/collections`, `/admin/users`, `/admin/admin-accounts`, `/admin/brand-config`, `/admin/blogs`

## 8. Kết nối với backend

- Backend mặc định: `http://localhost:5000`
- Frontend gọi API qua các service trong `src/services`
- Token auth được gắn tự động qua interceptor trong `apiClient`
- Realtime notification/order/inventory/flash sale dùng `src/services/socketClient.ts`

## 9. Luồng chạy local đề xuất

Mở 2 terminal:

1. Terminal 1

```bash
cd server
npm run dev
```

2. Terminal 2

```bash
cd client
npm run dev
```

Sau đó truy cập `http://localhost:5173`.
