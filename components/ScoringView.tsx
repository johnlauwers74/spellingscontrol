
import React, { useState } from 'react';
import { Check, X, Search, User, AlertCircle, CheckCircle2, Loader2, Info, Layers, MessageSquare } from 'lucide-react';
import { Student, Word, AssessmentRecord, SpellingRule, TestRound } from '../types';
import { supabase } from '../lib/supabase';

interface ScoringViewProps {
  students: Student[];
  words: Word[];
  rules: SpellingRule[];
  assessments: AssessmentRecord[];
  setAssessments: React.Dispatch<React.SetStateAction<AssessmentRecord[]>>;
  activeTestRound: TestRound | null;
  userId: string;
}

const ScoringView: React.FC<ScoringViewProps> = ({ 
  students, words, rules, assessments, setAssessments, activeTestRound, userId 
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    students.length > 0 ? students[0].id : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const syncAssessment = async (record: AssessmentRecord) => {
    if (!activeTestRound) return;
    setSyncing(record.wordId);
    try {
      const { error } = await supabase.from('assessments').upsert({
        student_id: record.studentId,
        word_id: record.wordId,
        test_round_id: activeTestRound.id,
        user_id: userId,
        rule_results: record.ruleResults,
        notes: record.notes || '',
        is_attempted: record.isAttempted
      }, { onConflict: 'student_id, word_id, test_round_id' });
      
      if (error) throw error;
    } catch (err) {
      console.error('Fout bij synchroniseren:', err);
    } finally {
      setSyncing(null);
    }
  };

  const handleRuleToggle = (wordId: string, ruleId: string, isCorrect: boolean) => {
    if (!selectedStudentId || !activeTestRound) return;

    const existingIdx = assessments.findIndex(
      a => a.studentId === selectedStudentId && a.wordId === wordId
    );
    
    const currentRecord = existingIdx > -1 
      ? assessments[existingIdx] 
      : { 
          studentId: selectedStudentId, 
          wordId, 
          testRoundId: activeTestRound.id, 
          ruleResults: {}, 
          notes: '',
          isAttempted: true,
          user_id: userId
        };

    const newResults = { 
      ...currentRecord.ruleResults, 
      [ruleId]: isCorrect 
    };

    const newRecord = { 
      ...currentRecord, 
      ruleResults: newResults,
      isAttempted: true 
    };

    setAssessments(prev => {
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = newRecord;
        return updated;
      }
      return [...prev, newRecord];
    });

    syncAssessment(newRecord);
  };

  const handleNoteChange = (wordId: string, note: string) => {
    if (!selectedStudentId || !activeTestRound) return;

    setAssessments(prev => {
      const idx = prev.findIndex(a => a.studentId === selectedStudentId && a.wordId === wordId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], notes: note };
        return updated;
      } else {
        return [...prev, {
          studentId: selectedStudentId,
          wordId,
          testRoundId: activeTestRound.id,
          ruleResults: {},
          notes: note,
          isAttempted: true,
          user_id: userId
        }];
      }
    });
  };

  const handleQuickPass = (word: Word) => {
    if (!selectedStudentId || !activeTestRound) return;
    
    const existingRecord = assessments.find(a => a.studentId === selectedStudentId && a.wordId === word.id);
    const allCorrect: Record<string, boolean> = {};
    word.ruleIds.forEach((rid: string) => {
      allCorrect[rid] = true;
    });

    const newRecord = { 
      studentId: selectedStudentId, 
      wordId: word.id, 
      testRoundId: activeTestRound.id,
      ruleResults: allCorrect, 
      notes: existingRecord?.notes || '',
      isAttempted: true,
      user_id: userId
    };

    setAssessments(prev => {
      const idx = prev.findIndex(a => a.studentId === selectedStudentId && a.wordId === word.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = newRecord;
        return updated;
      }
      return [...prev, newRecord];
    });

    syncAssessment(newRecord);
  };

  const filteredWords = words.filter(w => w.text.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (!activeTestRound) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Geen actieve testronde</h3>
        <p className="text-slate-500 max-w-sm mx-auto">Selecteer een ronde in de zijbalk of maak een nieuwe aan bij Beheer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-indigo-600" size={18} />
            <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Testronde: {activeTestRound.name}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Scoren & Afvinken</h2>
          <p className="text-slate-500 mt-2">Duid regels aan en voeg eventueel opmerkingen toe per woord.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="relative">
             <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <select 
                value={selectedStudentId || ''} 
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Zoek woord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">{selectedStudent?.name.charAt(0)}</div>
            <div>
              <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Huidige leerling</p>
              <h3 className="font-bold text-lg leading-tight">{selectedStudent?.name}</h3>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Voortgang</p>
             <p className="font-bold text-lg">
              {assessments.filter(a => a.studentId === selectedStudentId).length} / {words.length} <span className="text-sm font-normal text-indigo-100">woorden</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Woord</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Regels & Opmerkingen</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredWords.map(w => {
                const record = assessments.find(a => a.studentId === selectedStudentId && a.wordId === w.id);
                const isSyncing = syncing === w.id;
                
                return (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-6 w-1/5 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-lg">{w.text}</span>
                        {isSyncing && <Loader2 size={14} className="animate-spin text-indigo-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                          {w.ruleIds.map(rid => {
                            const rule = rules.find(r => r.id === rid);
                            const res = record?.ruleResults?.[rid];
                            return (
                              <div key={rid} className="flex flex-col gap-1 min-w-[70px]">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rule?.code || '??'}</span>
                                  {rule?.description && (
                                    <div className="group relative">
                                      <Info size={10} className="text-slate-300 cursor-help" />
                                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                        {rule.description}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden w-fit">
                                  <button onClick={() => handleRuleToggle(w.id, rid, true)} className={`p-1.5 transition-colors ${res === true ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'}`}><Check size={16} strokeWidth={3} /></button>
                                  <div className="w-px bg-slate-100" />
                                  <button onClick={() => handleRuleToggle(w.id, rid, false)} className={`p-1.5 transition-colors ${res === false ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-rose-50 hover:text-rose-500'}`}><X size={16} strokeWidth={3} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="relative group">
                          <MessageSquare size={14} className="absolute left-3 top-3 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                          <input 
                            type="text"
                            placeholder="Extra opmerking voor dit woord..."
                            value={record?.notes || ''}
                            onChange={(e) => handleNoteChange(w.id, e.target.value)}
                            onBlur={() => {
                              const updatedRecord = assessments.find(a => a.studentId === selectedStudentId && a.wordId === w.id);
                              if (updatedRecord) syncAssessment(updatedRecord);
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all italic"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center align-top">
                      <button 
                        onClick={() => handleQuickPass(w)} 
                        title="Alles correct"
                        className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm"
                      >
                        <CheckCircle2 size={24} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScoringView;
