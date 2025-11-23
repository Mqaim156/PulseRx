import React, { useState } from 'react';
import PatientView from './components/PatientView';
import PharmacistDashboard from './components/PharmacistDashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import { LogOut, ShieldCheck, User } from 'lucide-react';
import { DEFAULT_DAILY_PLAN } from './constants';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [userRole, setUserRole] = useState<'patient' | 'pharmacist' | null>(null);

  // Shared Data State (To demonstrate Pharmacist editing Patient Plan)
  // In a real app, this would be fetched per patient ID.
  // We are using a single shared state here to demo the interaction for "John Smith"
  const [sharedDailyPlan, setSharedDailyPlan] = useState<string[]>(DEFAULT_DAILY_PLAN);

  const handleLogin = (role: 'patient' | 'pharmacist') => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setAuthView('login');
  };

  // Render Login or Signup if not authenticated
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <Signup onLogin={handleLogin} onNavigateLogin={() => setAuthView('login')} />;
    }
    return <Login onLogin={handleLogin} onNavigateSignup={() => setAuthView('signup')} />;
  }

  // Render Main App if authenticated
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-purple-500/30 animate-in fade-in">
      
      {/* Navigation Header */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  PulseRx
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium hidden sm:block">
                  Pharmacy-Led Chronic Disease Care
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Role Badge */}
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                  {userRole === 'pharmacist' ? (
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  ) : (
                    <User className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="text-xs font-medium text-slate-300">
                    {userRole === 'pharmacist' ? 'Pharmacist Portal' : 'Patient Portal'}
                  </span>
                </div>
                
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm font-medium group"
                    title="Sign Out"
                >
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Sign Out</span>
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {userRole === 'patient' ? (
          <PatientView dailyPlan={sharedDailyPlan} />
        ) : (
          <PharmacistDashboard />
        )}
      </main>
    </div>
  );
};

export default App;