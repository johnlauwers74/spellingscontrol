
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, ClipboardCheck, Check, X } from 'lucide-react';

const AuthView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validatie helpers
  const hasMinLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasSymbolsOrNumbers = /[^a-zA-Z]/.test(password);
  const isPasswordValid = hasMinLength && hasLetters && hasSymbolsOrNumbers;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // Validatie check voor registratie
        if (!isPasswordValid) {
          throw new Error('Het wachtwoord voldoet niet aan de veiligheidseisen.');
        }

        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Account aangemaakt! Controleer je e-mail voor de bevestigingslink.');
        setIsRegistering(false); // Terug naar login na succesvolle registratie-initiatie
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-indigo-600 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ClipboardCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold">VCLB Spelling Analyzer</h1>
          <p className="text-indigo-100 text-sm mt-1">Professionele analyse van leerlingresultaten</p>
        </div>
        
        <form onSubmit={handleAuth} className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2">
              <X size={16} />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="je-naam@vclb.be"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Wachtwoord</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
            
            {isRegistering && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Wachtwoord eisen:</p>
                <div className="flex items-center gap-2">
                  {hasMinLength ? <Check size={12} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span className={`text-[11px] ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>Minimaal 8 tekens</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasLetters ? <Check size={12} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span className={`text-[11px] ${hasLetters ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>Bevat letters (a-z)</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasSymbolsOrNumbers ? <Check size={12} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span className={`text-[11px] ${hasSymbolsOrNumbers ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>Bevat cijfers of speciale tekens</span>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || (isRegistering && !isPasswordValid)}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />)}
            {isRegistering ? 'Account Aanmaken' : 'Inloggen'}
          </button>

          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              {isRegistering ? 'Al een account? Log in' : 'Nieuw hier? Registreer account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthView;
