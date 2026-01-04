import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import LoginPage from '../views/auth/LoginPage.js';
import RegisterPage from '../views/auth/RegisterPage.js';
import ProtectedRoute from './ProtectedRoute.js';
import AppLayout from '../views/layout/AppLayout.js';

import DashboardPage from '../views/pages/DashboardPage.js';
import CategoriesPage from '../views/pages/CategoriesPage.js';
import ItemsPage from '../views/pages/ItemsPage.js';
import RecordsPage from '../views/pages/RecordsPage.js';
import NoticesPage from '../views/pages/NoticesPage.js';
import UsersPage from '../views/pages/UsersPage.js';
import CommentsPage from '../views/pages/CommentsPage.js';
import PersonPage from '../views/pages/PersonPage.js';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="comments" element={<CommentsPage />} />
        <Route path="person" element={<PersonPage />} />
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
