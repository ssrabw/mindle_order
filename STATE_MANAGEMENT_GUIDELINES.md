# State Management Architecture Guidelines

This document defines the architectural principles for state management in this project. All future implementations must strictly adhere to these guidelines to ensure scalability, maintainability, and performance.

## 🎯 Core Principle: Separation of Concerns
State should be categorized by its **source** and **scope** to prevent unnecessary re-renders and complex data synchronization issues.

---

## 🛠️ 1. UI Control (Local State)
**Purpose:** Managing transient, visual states that are only relevant to a single component or its immediate children.

- **Target Data:**
  - Modal open/close states
  - Input field typing (form values)
  - Dropdown menu visibility
  - Tab switching
  - Hover/Active UI states
- **Tools:** `useState`, `useReducer` (React built-in Hooks).
- **Constraint:** Do **NOT** lift this state to a global store unless it is explicitly required by a distant sibling component.

## 🌐 2. App-wide Shared State (Global State)
**Purpose:** Managing essential data that is accessed by many disparate parts of the application.

- **Target Data:**
  - Authentication status & User profile (core identity)
  - Theme settings (Dark/Light mode)
  - Shopping Cart (if not managed via server-side sync)
  - Global configuration/settings
- **Tools:** **`Zustand`** (Preferred for its lightweight and intuitive API).
- **Constraint:** Keep the store **minimal**. Only include data that truly represents the "global context" of the application.

## 📡 3. Backend API Data (Server State)
**Purpose:** Managing data fetched from external servers/APIs.

- **Target Data:**
  - Product lists, detail information
  - User posts, comments
  - Any data that resides in a database and is fetched via HTTP.
- **Tools:** **`TanStack Query (React Query)`**.
- **Constraint:** 
  - **DO NOT** copy API data into a global state (Zustand/Redux).
  - Use React Query's built-in caching, `isLoading`, `isError` states, and `invalidateQueries` for data synchronization.
  - Treat the server as the single source of truth.

---

## ✅ Summary Table

| Category | Scope | Tool | Example |
| :--- | :--- | :--- | :--- |
| **UI Control** | Component-level | `useState` | `isModalOpen` |
| **Global State** | Application-level | `Zustand` | `userToken`, `theme` |
| **Server State** | Remote/API-level | `React Query` | `productList`, `userDetail` |
