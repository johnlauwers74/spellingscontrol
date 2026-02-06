
import React, { useState, useEffect } from 'react';
import { Settings, ClipboardCheck, FileBarChart, GraduationCap, BookOpen, Loader2, LogOut, Layers } from 'lucide-react';
import { Student, SpellingRule, Word, AssessmentRecord, ViewType, TestRound } from './types';
import SetupView from './components/SetupView';
import ScoringView from './components/ScoringView';
import ReportView from './components/ReportView';
import AuthView from './components/AuthView';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeView, setActiveView] = useState<ViewType>('setup');
  const [loading, setLoading] = useState(true);
  
  const [testRounds, setTestRounds] = useState<TestRound[]>([]);
  const [activeTestRound, setActiveTestRound] = useState<TestRound | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [rules, setRules] = useState<SpellingRule[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persistent Global Data (Rounds & Rules)
  useEffect(() => {
    if (!session) return;

    const fetchGlobals = async () => {
      const userId = session.user.id;
      const [
        { data: rulesData },
        { data: roundsData }
      ] = await Promise.all([
        supabase.from('rules').select('*').eq('user_id', userId).order('code'),
        supabase.from('test_rounds').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (rulesData) setRules(rulesData);
      if (roundsData) {
        setTestRounds(roundsData);
        if (!activeTestRound && roundsData.length > 0) {
          setActiveTestRound(roundsData[0]);
        }
      }
      setLoading(false);
    };

    fetchGlobals();
  }, [session]);

  // Round-specific Data (Students, Words, Assessments)
  useEffect(() => {
    if (!session || !activeTestRound) {
      setStudents([]);
      setWords([]);
      setAssessments([]);
      return;
    }

    const fetchRoundData = async () => {
      const userId = session.user.id;
      const roundId = activeTestRound.id;

      const [
        { data: studentsData },
        { data: wordsData },
        { data: assessmentsData }
      ] = await Promise.all([
        supabase.from('students').select('*').eq('test_round_id', roundId).eq('user_id', userId),
        supabase.from('words').select('*').eq('test_round_id', roundId).eq('user_id', userId),
        supabase.from('assessments').select('*').eq('test_round_id', roundId).eq('user_id', userId)
      ]);

      if (studentsData) setStudents(studentsData.map(s => ({ ...s, test_round_id: s.test_round_id })));
      if (wordsData) setWords(wordsData.map(w => ({ ...w, ruleIds: w.rule_ids, test_round_id: w.test_round_id })));
      if (assessmentsData) {
        setAssessments(assessmentsData.map(a => ({
          studentId: a.student_id,
          wordId: a.word_id,
          testRoundId: a.test_round_id,
          ruleResults: a.rule_results,
          isAttempted: a.is_attempted,
          user_id: a.user_id
        })));
      }
    };

    fetchRoundData();
  }, [session, activeTestRound?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setStudents([]);
    setRules([]);
    setWords([]);
    setAssessments([]);
    setTestRounds([]);
    setActiveTestRound(null);
    setActiveView('setup');
  };

  if (!session) return <AuthView />;

  if (loading && testRounds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Bezig met laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row print:block">
      {/* Sidebar */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 no-print">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ClipboardCheck className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">VCLB Spelling</h1>
          </div>
          
          <div className="space-y-1 mb-6">
            <NavItem 
              active={activeView === 'setup'} 
              onClick={() => setActiveView('setup')}
              icon={<Settings size={20} />}
              label="Input & Beheer"
            />
            <NavItem 
              active={activeView === 'scoring'} 
              onClick={() => setActiveView('scoring')}
              icon={<ClipboardCheck size={20} />}
              label="Scoren & Afvinken"
            />
            <NavItem 
              active={activeView === 'report'} 
              onClick={() => setActiveView('report')}
              icon={<FileBarChart size={20} />}
              label="Analyse & Rapporten"
            />
          </div>

          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Geselecteerde Ronde</p>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select 
                value={activeTestRound?.id || ''}
                onChange={(e) => {
                  const round = testRounds.find(r => r.id === e.target.value);
                  setActiveTestRound(round || null);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {testRounds.length === 0 && <option value="">Geen rondes</option>}
                {testRounds.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={16} className="text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">{students.length} Leerlingen</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">{words.length} Woorden</span>
            </div>
          </div>
          
          <div className="text-xs text-center text-slate-400 truncate px-2 mb-2" title={session.user.email}>
            {session.user.email}
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-600 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut size={16} /> Log uit
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 print:overflow-visible print:h-auto print:block">
        <div className="max-w-6xl mx-auto">
          {activeView === 'setup' && (
            <SetupView 
              students={students} setStudents={setStudents}
              rules={rules} setRules={setRules}
              words={words} setWords={setWords}
              testRounds={testRounds} setTestRounds={setTestRounds}
              activeTestRound={activeTestRound} setActiveTestRound={setActiveTestRound}
              userId={session.user.id}
            />
          )}
          {activeView === 'scoring' && (
            <ScoringView 
              students={students}
              words={words}
              rules={rules}
              assessments={assessments}
              setAssessments={setAssessments}
              activeTestRound={activeTestRound}
              userId={session.user.id}
            />
          )}
          {activeView === 'report' && (
            <ReportView 
              students={students}
              words={words}
              rules={rules}
              assessments={assessments}
            />
          )}
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
  >
    {icon}
    <span className="font-semibold">{label}</span>
  </button>
);

export default App;
