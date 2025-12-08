import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPageV4'
import MetricsPage from './pages/MetricsPage'
import ReadingRoomPage from './pages/ReadingRoomPage'
import ReferencePage from './pages/ReferencePage'
import AIAssistantPage from './pages/AIAssistantPage'
import TumorBoardPage from './pages/TumorBoardPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="reading" element={<ReadingRoomPage />} />
        <Route path="reference" element={<ReferencePage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="tumor-board" element={<TumorBoardPage />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
