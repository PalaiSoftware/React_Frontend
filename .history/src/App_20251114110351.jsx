import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layout/MainLayout";
import AuthLayout from "./layout/AuthLayout";
import Contact from "./pages/Contact";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import ProductInfo from "./pages/ProductInfo";
import Vendor from "./pages/Vendor";
import DueRecord from "./pages/DueRecord";
import User from "./pages/User";
import Sales from "./pages/Sales";
import Purchase from "./pages/Purchase";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Logout from "./pages/Logout";

import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";

function App() {
  return (
    <Router>
      <Routes>

        {/* Public / Auth pages (only for guests) */}
        <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Admin page can remain public or you can protect it later */}
        <Route path="/admin" element={<Admin />} />

        {/* Protected ERP area (checks only token) */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product-info" element={<ProductInfo />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/due-record" element={<DueRecord />} />
          <Route path="/inventory/sales" element={<Sales />} />
          <Route path="/inventory/purchase" element={<Purchase />} />
          <Route path="/management/user" element={<User />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
