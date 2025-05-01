import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Callback from "./pages/Callback";
import ProtectedRoute from "./components/ProtectedRoute";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import ManageProducts from "./pages/admin/ManageProducts";
import ManageOrders from "./pages/admin/ManageOrders";
import AdminOrderDetail from "./pages/admin/OrderDetail";
import ManageCustomers from "./pages/admin/ManageCustomers";
import StoreSettings from "./pages/admin/StoreSettings";
import TeamMembers from "./pages/admin/TeamMembers";
import Join from "./pages/Join";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/callback" element={<Callback />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/products" 
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/product/:id" 
        element={
          <ProtectedRoute>
            <ProductDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cart" 
        element={
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/checkout" 
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orders" 
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orders/:id" 
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        } 
      />
      {/* Admin Routes */}
      <Route 
        path="/admin/products" 
        element={
          <ProtectedRoute>
            <ManageProducts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/orders" 
        element={
          <ProtectedRoute>
            <ManageOrders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/orders/:id" 
        element={
          <ProtectedRoute>
            <AdminOrderDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/customers" 
        element={
          <ProtectedRoute>
            <ManageCustomers />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute>
            <StoreSettings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/team" 
        element={
          <ProtectedRoute>
            <TeamMembers />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
