import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import JobTracker from './pages/JobTracker';
import CreateJobPage from './pages/CreateJobPage';
import JobDetailPage from './pages/JobDetailPage';
import EquipmentOverview from './pages/EquipmentOverview';
import ReportsPage from './pages/ReportsPage';
import UserManagement from './pages/UserManagement';
import AdminPage from './pages/AdminPage';
import TechnicianManagement from './pages/TechnicianManagement';
import ProfilePage from './pages/ProfilePage';
import ProductionPlanningHub from './pages/ProductionPlanningHub';
import InventoryDashboard from './pages/Inventory/InventoryDashboard';
import ConsumptionReport from './pages/Inventory/ConsumptionReport';

const PrivateRoute = ({ children, adminOnly }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', borderRadius: '10px', background: '#fff', color: '#111827', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="jobs" element={<JobTracker />} />
            <Route path="jobs/new" element={<CreateJobPage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />
            <Route path="equipment" element={<EquipmentOverview />} />
            <Route path="inventory" element={<InventoryDashboard />} />
            <Route path="inventory/report" element={<ConsumptionReport />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="production-planning" element={<ProductionPlanningHub />} />
            <Route path="users" element={<PrivateRoute adminOnly><UserManagement /></PrivateRoute>} />
            <Route path="admin" element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
            <Route path="admin/technicians" element={<PrivateRoute adminOnly><TechnicianManagement /></PrivateRoute>} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
