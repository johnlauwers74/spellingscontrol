
import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, BookOpen, AlertCircle, Bookmark, X, Layers, Info } from 'lucide-react';
import { Student, SpellingRule, Word, TestRound } from '../types';
import { supabase } from '../lib/supabase';

interface SetupViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  rules: SpellingRule[];
  setRules: React.Dispatch<React.SetStateAction<SpellingRule[]>>;
  words: Word[];
  setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  testRounds: TestRound[];
  setTestRounds: React.Dispatch<React.SetStateAction<TestRound[]>>;
  activeTestRound: TestRound | null;
  setActiveTestRound: React.Dispatch<React.SetStateAction<TestRound | null>>;
  userId: string;
}

const SetupView: React.FC<SetupViewProps> = ({ 
  students, setStudents, 
  rules, setRules, 
  words, setWords,
  testRounds, setTestRounds,
  activeTestRound, setActiveTestRound,
  userId
}) => {
  const [newStudent, setNewStudent] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [newRoundName, setNewRoundName] = useState('');
  const [newRuleCode, setNewRuleCode] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newWord, setNewWord] = useState('');
  const [selectedRulesForWord, setSelectedRulesForWord] = useState<string[]>([]);

  const addTestRound = async () => {
    if (!newRoundName.trim()) return;
    const round = { id: crypto.randomUUID(), name: newRoundName.trim(), user_id: userId };
    const { error } = await supabase.from('test_rounds').insert([round]);
    if (!error) {
      setTestRounds([round as any, ...testRounds]);
      setActiveTestRound(round as any);
      setNewRoundName('');
    }
  };

  const addStudent = async () => {
    if (!newStudent.trim() || !activeTestRound) return;
    setLoading(true);
    const newStudentObj = { 
      id: crypto.randomUUID(), 
      name: newStudent.trim(), 
      user_id: userId,
      test_round_id: activeTestRound.id 
    };
    const { error } = await supabase.from('students').insert([newStudentObj]);
    if (!error) {
      setStudents([...students, newStudentObj]);
      setNewStudent('');
    }
    setLoading(false);
  };

  const processBulkStudents = async () => {
    if (!activeTestRound) return;
    const lines = bulkText.split(/\n/);
    const newStudentsList: Student[] = [];
    lines.forEach(line => {
      const name = line.trim();
      if (name && !students.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        newStudentsList.push({ 
          id: crypto.randomUUID(), 
          name: name, 
          user_id: userId,
          test_round_id: activeTestRound.id 
        });
      }
    });

    if (newStudentsList.length > 0) {
      setLoading(true);
      const { error } = await supabase.from('students').insert(newStudentsList);
      if (!error) {
        setStudents([...students, ...newStudentsList]);
        setBulkText('');
        setIsBulkMode(false);
      }
      setLoading(false);
    }
  };

  const addRule = async () => {
    if (!newRuleCode.trim() || !newRuleDesc.trim()) return;
    const rule = { id: crypto.randomUUID(), code: newRuleCode, description: newRuleDesc, user_id: userId };
    const { error } = await supabase.from('rules').insert([rule]);
    if (!error) {
      setRules([...rules, rule]);
      setNewRuleCode('');
      setNewRuleDesc('');
    }
  };

  const addWord = async () => {
    if (!newWord.trim() || selectedRulesForWord.length === 0 || !activeTestRound) return;
    const word = { 
      id: crypto.randomUUID(), 
      text: newWord, 
      rule_ids: selectedRulesForWord, 
      user_id: userId,
      test_round_id: activeTestRound.id 
    };
    const { error } = await supabase.from('words').insert([word]);
    if (!error) {
      setWords([...words, { ...word, ruleIds: selectedRulesForWord } as any]);
      setNewWord('');
      setSelectedRulesForWord([]);
    }
  };

  const deleteRound = async (id: string) => {
    const { error } = await supabase.from('test_rounds').delete().eq('id', id).eq('user_id', userId);
    if (!error) {
      setTestRounds(testRounds.filter(r => r.id !== id));
      if (activeTestRound?.id === id) setActiveTestRound(testRounds[0] || null);
    }
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id).eq('user_id', userId);
    if (!error) setStudents(students.filter(s => s.id !== id));
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('rules').delete().eq('id', id).eq('user_id', userId);
    if (!error) setRules(rules.filter(r => r.id !== id));
  };

  const deleteWord = async (id: string) => {
    const { error } = await supabase.from('words').delete().eq('id', id).eq('user_id', userId);
    if (!error) setWords(words.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-12 pb-20">
      <header>
        <h2 className="text-3xl font-extrabold text-slate-900">Beheer & Configuratie</h2>
        <p className="text-slate-500 mt-2">Gegevens worden veilig opgeslagen per gebruiker en per testronde.</p>
      </header>

      {/* Testronde Sectie */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-6 text-indigo-600">
          <Layers size={24} />
          <h3 className="text-xl font-bold">Stap 1: Testronde aanmaken of selecteren</h3>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newRoundName}
            onChange={(e) => setNewRoundName(e.target.value)}
            placeholder="Bijv: Klas 4A - Januari 2024..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button onClick={addTestRound} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all">
            Nieuwe Ronde
          </button>
        </div>
        
        {!activeTestRound && testRounds.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-700 text-sm">
            <AlertCircle size={16} /> Selecteer een ronde in de zijbalk om leerlingen of woorden toe te voegen.
          </div>
        )}

        {testRounds.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {testRounds.map(r => (
              <div key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${activeTestRound?.id === r.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <span className="text-sm font-semibold">{r.name}</span>
                <button onClick={() => deleteRound(r.id)} className="hover:text-rose-400"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${!activeTestRound ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Leerlingen Sectie */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <UserPlus size={24} />
              <h3 className="text-xl font-bold">Leerlingen ({activeTestRound?.name || '...'})</h3>
            </div>
            <button onClick={() => setIsBulkMode(!isBulkMode)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
              {isBulkMode ? 'Annuleren' : 'Bulk Toevoegen'}
            </button>
          </div>

          {!activeTestRound && <p className="text-xs text-rose-500 font-bold mb-4">Maak eerst een ronde aan!</p>}

          {isBulkMode ? (
            <div className="space-y-4">
              <textarea 
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Naam 1&#10;Naam 2..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              />
              <button onClick={processBulkStudents} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700">Importeer Lijst</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <input type="text" value={newStudent} onChange={(e) => setNewStudent(e.target.value)} placeholder="Naam leerling..." className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button onClick={addStudent} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={24} /></button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {students.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl group">
                    <span className="text-sm font-medium text-slate-700">{s.name}</span>
                    <button onClick={() => deleteStudent(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Spellingsregels Sectie */}
        <section className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${!activeTestRound ? 'opacity-100 pointer-events-auto' : ''}`}>
          <div className="flex items-center gap-2 mb-6 text-emerald-600">
            <Bookmark size={24} />
            <h3 className="text-xl font-bold">Spellingsregels (Bibliotheek)</h3>
          </div>
          <div className="space-y-2 mb-4">
            <input type="text" value={newRuleCode} onChange={(e) => setNewRuleCode(e.target.value)} placeholder="Code (B1)..." className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
            <div className="flex gap-2">
              <input type="text" value={newRuleDesc} onChange={(e) => setNewRuleDesc(e.target.value)} placeholder="Omschrijving..." className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none" />
              <button onClick={addRule} className="bg-emerald-600 text-white p-2 rounded-xl"><Plus size={24} /></button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {rules.map(r => (
              <div key={r.id} className="p-2.5 bg-slate-50 rounded-xl group flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{r.code}</span>
                  <span className="text-sm text-slate-700">{r.description}</span>
                </div>
                <button onClick={() => deleteRule(r.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Woorden Sectie */}
        <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-amber-600">
            <BookOpen size={24} />
            <h3 className="text-xl font-bold">Woordenlijst ({activeTestRound?.name || '...'})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-4 rounded-xl">
              <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Testwoord..." className="w-full px-4 py-2 rounded-xl border border-slate-200 mb-4 outline-none" />
              <div className="flex flex-wrap gap-1.5 mb-4">
                {rules.map(r => (
                  <button key={r.id} onClick={() => setSelectedRulesForWord(prev => prev.includes(r.id) ? prev.filter(i => i !== r.id) : [...prev, r.id])} className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedRulesForWord.includes(r.id) ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                    {r.code}
                  </button>
                ))}
              </div>
              <button onClick={addWord} disabled={!newWord || selectedRulesForWord.length === 0} className="w-full bg-amber-600 text-white font-bold py-2 rounded-xl disabled:opacity-50">Voeg Woord Toe</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-48 pr-2">
              {words.map(w => (
                <div key={w.id} className="p-2.5 bg-white border border-slate-100 rounded-xl group flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{w.text}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.ruleIds.map(rid => <span key={rid} className="text-[8px] bg-slate-50 px-1 py-0.5 rounded border border-slate-200 text-slate-500">{rules.find(r => r.id === rid)?.code}</span>)}
                    </div>
                  </div>
                  <button onClick={() => deleteWord(w.id)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SetupView;
