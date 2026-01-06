import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar'; // ✅ ici
import MesInitiatives from './components/MesInitiatives';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import FormInput from './components/FormInput';
import CartoModule from './components/CartoModule';
import AdminDashboard from './components/AdminDashboard';
import UserList from './components/UserList';
import EditInitiative from './components/EditInitiatives';
import LandingPage from './components/LandingPage';
import ConfirmEmail from './components/ConfirmEmail';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import TestRegister from './components/TestRegister.jsx';
import RequestReset from './components/RequestReset';
import ResetPassword from './components/ResetPassword';
import FormFieldsManager from './components/FormFieldsManager';
import Footer from './components/Footer';
import TableView from './components/TableView';

function App() {
  return (
    <Router>
      <div className="pb-16 pt-16">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/map" element={<CartoModule />} />
          <Route path="/table" element={<TableView />} />
          <Route path="/submit" element={
            <ProtectedRoute>
              <FormInput />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/confirm-email/:token" element={<ConfirmEmail />} />
          <Route path="/forgot-password" element={<RequestReset />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/users" element={
            <AdminRoute>
              <UserList />
            </AdminRoute>
          } />
          <Route path="/form-fields" element={
            <AdminRoute>
              <FormFieldsManager />
            </AdminRoute>
          } />
          <Route path="/edit/:id" element={
            <ProtectedRoute>
              <EditInitiative />
            </ProtectedRoute>
          } />
          <Route path="/my-initiatives" element={
            <ProtectedRoute>
              <MesInitiatives />
            </ProtectedRoute>
          } />
          <Route path="/test-register" element={<TestRegister />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
