# PlantHub 🌿

A Thai-language online marketplace for plants and flowers. Sellers open their own shop and manage products, orders, and coupons. Customers browse, order, track delivery status, and chat with shops. Admins manage users, orders, and support chats.

**Live demo:** https://plant-hub-project-group.vercel.app/

> Group project. Contributors: [dolvolo](https://github.com/DolVolo), tonpor888

---

## About

PlantHub is a multi-vendor e-commerce web app for three kinds of users:

| Role | What they can do |
|---|---|
| **Customer** | Browse and search plants, add to cart, check out with saved addresses and coupons, track order status in real time, chat with sellers or admin |
| **Seller** | Add and edit products, manage stock, update order status, create discount coupons, view a sales summary, reply to customer chats |
| **Admin** | Dashboard with live stats, manage users and roles, manage products and orders, approve pending orders, support chat, activity logs |

The app is built with Next.js (App Router) and talks directly to Firebase from the client. Firebase Authentication handles sign-in, Cloud Firestore stores users, orders, coupons, chats, and logs, and Firebase Realtime Database stores products.

---

## Features

### Customer
- Product listing with debounced search, category filter, and sorting (newest, price, popularity)
- Product detail page with seller info, view counter, **Add to cart** and **Buy now**
- Persistent shopping cart (Zustand + `localStorage`) with an animated floating cart button
- Checkout with saved addresses, coupon codes, and payment method selection (COD, card, PromptPay, bank transfer)
- "My orders" page that updates in real time when a seller changes the status
- Downloadable PDF receipt in Thai, generated in the browser (jsPDF + embedded Sarabun font)
- Seller storefront page (`/shop/[sellerId]`)
- Profile page: personal info, profile image URL, multiple saved addresses

### Seller
- My Shop dashboard: product list, inline edit, show/hide, delete, stock tracking
- Add product form
- Order management with status updates
- Coupon management (percentage or fixed discount, minimum purchase, validity period)
- Sales summary (total sales, order count, average order value)

### Chat (real time)
- Floating chat panel available on every page
- Customer ↔ seller and customer ↔ admin conversations
- Start a chat from a product page or an order (the order number is shown in the chat title)
- Unread message badge, shop search, close and delete conversations

### Admin
- Dashboard with live counts of users, products, orders, and sales
- User management: change role, delete, create user, send password reset email
- Product and order management, pending-order approval
- Best-selling products ranking
- Activity log (login, logout, register, role change, user created/deleted)

### Authentication
- Email and password sign-up with email verification
- Google sign-in with a role selection step (customer / seller)
- Forgot password flow
- Role-based page guards on the client and role-based Firestore security rules (`firestore.rules`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack), React 19.1 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4.1, lucide-react icons, responsive layout |
| State | Zustand 5 (cart, persisted to `localStorage`) |
| Backend (BaaS) | Firebase 10.14: Authentication, Cloud Firestore, Realtime Database |
| Other libraries | jsPDF (invoice), date-fns, react-hot-toast |
| Linting | ESLint 9 + `eslint-config-next` |
| Hosting | Vercel |

---

## Screenshots

<!-- Add screenshots to docs/screenshots/ and update the paths below -->

| Home | Product detail |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Product](docs/screenshots/product.png) |

| Checkout | Chat panel |
|---|---|
| ![Checkout](docs/screenshots/checkout.png) | ![Chat](docs/screenshots/chat.png) |

| Seller: My Shop | Admin dashboard |
|---|---|
| ![My Shop](docs/screenshots/my-shop.png) | ![Admin](docs/screenshots/admin-dashboard.png) |

---

## How to run

### Prerequisites
- Node.js 18.18 or later (required by Next.js 15)
- npm
- A Firebase project with Authentication (Email/Password and Google), Cloud Firestore, and Realtime Database enabled

### 1. Clone and install
```bash
git clone https://github.com/DolVolo/PlantHub_ProjectGroup.git
cd PlantHub_ProjectGroup
npm install
```

### 2. Configure Firebase
The Firebase web config is in `src/lib/firebaseClient.ts`. To use your own project, replace the values in `firebaseConfig` with the ones from **Firebase Console → Project settings → Your apps**.

### 3. Deploy Firestore rules and indexes
```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Start the dev server
```bash
npm run dev
```
Open http://localhost:3000.

### 5. Create an admin account
Admin access comes from the `role` field of the user's document in Firestore. Security rules stop users from giving themselves the admin role, so the first admin is set up by hand:

1. Register a normal account at `/register` and verify the email.
2. In **Firebase Console → Firestore → users → {your uid}**, change `role` to `admin`.
3. Sign in at `/admin/login`. After that, admins can promote other users from **Admin → Users**.

### Scripts
| Command | Description |
|---|---|
| `npm run dev` | Start the development server (Turbopack) |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## Project structure

```
src/
├── app/                    # Next.js App Router: one folder per route
│   ├── admin/              # Admin panel (dashboard, users, orders, chat, logs, ...)
│   ├── my-shop/            # Seller area (products, orders, coupons, reports, chat)
│   ├── components/         # Header, Footer, FloatingCart, ChatPanel, ...
│   ├── providers/          # AuthProvider (React Context)
│   └── ...                 # Customer pages: product, cart, checkout, orders, profile, auth
├── services/firebase/      # Data access: auth, chat, orders, coupons, logs
├── store/cartStore.ts      # Zustand cart store
├── lib/                    # Firebase client setup, PDF receipt builder
└── types/                  # Shared TypeScript types
public/fonts/               # Sarabun Thai font for PDF receipts (SIL Open Font License)
firestore.rules             # Firestore security rules
firestore.indexes.json      # Firestore composite indexes
```

---

## Known limitations

- Payments are not connected to a real payment gateway. PromptPay and bank transfer ask for a payment-slip URL.
- The sales chart on the seller reports page and the admin settings page are placeholders.
- There are no automated tests yet.
