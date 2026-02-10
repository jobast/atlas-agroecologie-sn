import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
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
import RequestReset from './components/RequestReset';
import ResetPassword from './components/ResetPassword';
import FormFieldsManager from './components/FormFieldsManager';
import Footer from './components/Footer';
import TableView from './components/TableView';
import DytaelLayout from './components/DytaelLayout';
import DytaelChooser from './components/DytaelChooser';
import DytaelManager from './components/DytaelManager';
import ProgrammeView from './components/ProgrammeView';
import DytaesRoute from './components/DytaesRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Global auth routes (no slug prefix) */}
        <Route path="/login" element={
          <div className="pb-10 pt-14">
            <Navbar />
            <LoginPage />
            <Footer />
          </div>
        } />
        <Route path="/register" element={
          <div className="pb-10 pt-14">
            <Navbar />
            <RegisterPage />
            <Footer />
          </div>
        } />
        <Route path="/confirm-email/:token" element={
          <div className="pb-10 pt-14">
            <Navbar />
            <ConfirmEmail />
            <Footer />
          </div>
        } />
        <Route path="/forgot-password" element={
          <div className="pb-10 pt-14">
            <Navbar />
            <RequestReset />
            <Footer />
          </div>
        } />
        <Route path="/reset-password/:token" element={
          <div className="pb-10 pt-14">
            <Navbar />
            <ResetPassword />
            <Footer />
          </div>
        } />

        {/* Root: DyTAEL chooser */}
        <Route path="/" element={
          <div className="pb-10 pt-14">
            <Navbar />
            <DytaelChooser />
            <Footer />
          </div>
        } />

        {/* Backward-compat redirects for old URLs */}
        <Route path="/map" element={<Navigate to="/bignona/map" replace />} />
        <Route path="/table" element={<Navigate to="/bignona/table" replace />} />
        <Route path="/admin" element={<Navigate to="/bignona/admin" replace />} />
        <Route path="/users" element={<Navigate to="/bignona/users" replace />} />
        <Route path="/submit" element={<Navigate to="/bignona/submit" replace />} />
        <Route path="/my-initiatives" element={<Navigate to="/bignona/my-initiatives" replace />} />
        <Route path="/form-fields" element={<Navigate to="/bignona/form-fields" replace />} />

        {/* DyTAEL-scoped routes (including 'national') */}
        <Route path="/:slug" element={<DytaelLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="map" element={<CartoModule />} />
          <Route path="table" element={<TableView />} />
          <Route path="submit" element={
            <ProtectedRoute>
              <FormInput />
            </ProtectedRoute>
          } />
          <Route path="my-initiatives" element={
            <ProtectedRoute>
              <MesInitiatives />
            </ProtectedRoute>
          } />
          <Route path="programme/:id" element={<ProgrammeView />} />
          <Route path="edit/:id" element={
            <ProtectedRoute>
              <EditInitiative />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="users" element={
            <AdminRoute>
              <UserList />
            </AdminRoute>
          } />
          <Route path="form-fields" element={
            <AdminRoute>
              <FormFieldsManager />
            </AdminRoute>
          } />
          <Route path="dytaels" element={
            <DytaesRoute>
              <DytaelManager />
            </DytaesRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
