import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import './index.css';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';

const router = createBrowserRouter([
  { path: '/', element: <Home/> },
  { path: '/register', element: <Register/> },
  { 
    path: '/admin', 
    element: <Admin/>,
    children: [
      { path: 'reports', element: <Admin/> },
      { path: 'robot-dashboard', element: <Admin/> },
      { path: 'settings', element: <Admin/> },
      { path: 'workshops', element: <Admin/> }
    ]
  },
]);

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);