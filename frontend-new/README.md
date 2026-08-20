# Yadotena Frontend - Modern Restaurant Management System

A modern, type-safe Next.js 14+ frontend for the Yadotena restaurant management platform.

## Features

- **Modern Stack**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Role-Based Dashboards**: Dedicated interfaces for Owner, Manager, Waiter, and Chef roles
- **Real-Time Updates**: React Query for efficient data fetching and caching
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions
- **Authentication**: JWT-based authentication with role-based access control
- **Responsive Design**: Mobile-first design using Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **HTTP Client**: Axios
- **Authentication**: JWT tokens with localStorage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontend-new
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend-new/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects based on role)
│   ├── login/              # Login page
│   ├── owner/              # Owner dashboard
│   ├── manager/            # Manager dashboard
│   ├── waiter/             # Waiter dashboard
│   └── chef/               # Chef kitchen display
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
│   ├── useOrders.ts        # Order-related hooks
│   ├── usePayments.ts      # Payment-related hooks
│   ├── useProducts.ts      # Product hooks
│   └── useMenu.ts          # Menu hooks
├── lib/                    # Core libraries
│   ├── api/                # API client
│   ├── auth/               # Authentication context
│   └── providers.tsx       # React Query provider
├── types/                  # TypeScript type definitions
└── config/                 # Configuration files
```

## Role-Based Access

- **Owner**: Full system access, analytics, staff management
- **Manager**: Order management, menu/products oversight
- **Waiter**: Create orders, view active orders
- **Chef**: Kitchen display, update order status

## API Integration

The frontend connects to the Go backend at `http://localhost:8080/api`. Key endpoints:

- `POST /auth/login` - User authentication
- `GET /orders` - List orders
- `POST /orders` - Create order
- `PUT /orders/:id/status` - Update order status
- `GET /products` - List products
- `GET /menu/items` - List menu items

## License

MIT
