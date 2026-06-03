# 📂 Project Structure (Revised)

The project structure has been reorganized to strictly follow the **State Management Architecture Guidelines**.

## 🌲 Directory Tree

```text
.
├── public/                 # Static assets (icons, etc.)
├── src/
│   ├── api/                # 📡 Server State: API client and service definitions
│   │   └── client.ts       # Base API configuration (e.g., Axios instance)
│   ├── assets/             # Visual assets (images, SVGs)
│   ├── components/         # 🛠️ UI Control: Reusable UI components
│   ├── data/               # Mock data for development
│   ├── hooks/               # 📡 Server State: Custom hooks using TanStack Query
│   │   └── useProducts.ts  # Product-related data fetching hooks
│   ├── store/              # 🌐 Global State: Zustand stores
│   │   └── useCartStore.ts # Application-wide shopping cart state
│   ├── types/              # TypeScript definitions
│   ├── App.tsx             # Main Application Component
│   ├── main.tsx            # Entry point
│   └── ...
├── STATE_MANAGEMENT_GUIDELINES.md
└── ...
```

## 🛠️ Architecture Mapping

| Category | Tool | Directory | Responsibility |
| :--- | :--- | :--- | :--- |
| **UI Control** | `useState` / `useReducer` | `src/components/` | Component-level transient states (modals, inputs). |
| **Global State** | **`Zustand`** | `src/store/` | Application-wide shared data (cart, user profile). |
| **Server State** | **`TanStack Query`** | `src/api/` & `src/hooks/` | Remote data fetching, caching, and synchronization. |

## ✅ Summary of Changes
1. **Removed `src/context/`**: Replaced React Context with **Zustand** in `src/store/` to follow the Global State guideline.
2. **Added `src/store/`**: Dedicated directory for lightweight global state management.
3. **Added `src/api/`**: Dedicated directory for API client configuration to support Server State.
4. **Added `src/hooks/`**: Dedicated directory for custom hooks that encapsulate **TanStack Query** logic.
5. **Cleaned up structure**: Organized folders by their architectural role (UI, Global, Server).
