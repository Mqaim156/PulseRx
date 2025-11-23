import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, User, Briefcase } from 'lucide-react';

const API_BASE = (
  window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://pulserx.onrender.com'
).replace(/\/$/, ''); // Remove trailing slash if exists

interface SignupProps {
  onLogin: (role: 'patient' | 'pharmacist') => void;
  onNavigateLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onLogin, onNavigateLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'pharmacist'>('patient');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // If a patient is signing up, also create a patient record
        if (role === 'patient') {
        await fetch(`${API_BASE}/api/patients`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            name: name.trim(),
            // You don't have condition in the signup form yet, so default it
            condition: 'Unknown',
            }),
        });
        }

        // “Log them in” (your current mock auth)
        onLogin(role);
    } catch (err) {
        alert(
        'Error during signup: ' +
            (err instanceof Error ? err.message : 'Unknown error')
        );
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">PulseRx</h1>
                <p className="text-slate-400">Create your account</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                        <input 
                            type="text" 
                            required
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                        <input 
                            type="email" 
                            required
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                        <input 
                            type="password" 
                            required
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">I am a...</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setRole('patient')}
                            className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                                role === 'patient' 
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            <User className="w-6 h-6" />
                            <span className="text-sm font-medium">Patient</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('pharmacist')}
                            className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                                role === 'pharmacist' 
                                ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            <Briefcase className="w-6 h-6" />
                            <span className="text-sm font-medium">Pharmacist</span>
                        </button>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? (
                        <span>Creating Account...</span>
                    ) : (
                        <>
                            <span>Create Account</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-700 text-center">
                <p className="text-slate-400 text-sm">
                    Already have an account?{' '}
                    <button onClick={onNavigateLogin} className="text-purple-400 hover:text-purple-300 font-medium">
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    </div>
  );
}

export default Signup;