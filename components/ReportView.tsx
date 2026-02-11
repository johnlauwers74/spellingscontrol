
import React, { useMemo, useState } from 'react';
import { Student, Word, SpellingRule, AssessmentRecord } from '../types';
import { TrendingDown, BookOpen, AlertCircle, Sparkles, Users, BarChart3, ListChecks, FileSpreadsheet, Loader2, Info } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';

interface ReportViewProps {
  students: Student[];
  words: Word[];
  rules: SpellingRule[];
  assessments: AssessmentRecord[];
}

type TabType = 'individual' | 'group';

const ReportView: React.FC<ReportViewProps> = ({ students, words, rules, assessments }) => {
  const [activeTab, setActiveTab] = useState<TabType>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState<string | 'all'>(
    students.length > 0 ? students[0].id : 'all'
  );
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // --- Data Calculations ---

  const individualData = useMemo(() => {
    return students.map(student => {
      const studentAssessments = assessments.filter(a => a.studentId === student.id);
      
      const errorStatsByRule = rules.map(rule => {
        const failedInWords: string[] = [];
        studentAssessments.forEach(ass => {
          if (ass.ruleResults[rule.id] === false) {
            const word = words.find(w => w.id === ass.wordId);
            if (word) failedInWords.push(word.text);
          }
        });

        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          ruleDesc: rule.description,
          errorCount: failedInWords.length,
          errorWords: failedInWords
        };
      }).filter(stat => stat.errorCount > 0);

      const totalWordsWithErrors = studentAssessments.filter(ass => 
        Object.values(ass.ruleResults).some(result => result === false)
      ).length;

      const totalCorrectWords = studentAssessments.filter(ass => 
        Object.values(ass.ruleResults).every(result => result === true)
      ).length;

      return {
        student,
        errorStatsByRule,
        totalErrors: totalWordsWithErrors,
        totalCorrect: totalCorrectWords,
        completion: Math.round((studentAssessments.length / Math.max(1, words.length)) * 100)
      };
    });
  }, [students, words, rules, assessments]);

  const groupRuleStats = useMemo(() => {
    return rules.map(rule => {
      const failingStudentNames: string[] = [];
      let totalAttempts = 0;
      let totalErrors = 0;

      assessments.forEach(ass => {
        const word = words.find(w => w.id === ass.wordId);
        if (word?.ruleIds.includes(rule.id)) {
          totalAttempts++;
          if (ass.ruleResults[rule.id] === false) {
            totalErrors++;
            const student = students.find(s => s.id === ass.studentId);
            if (student && !failingStudentNames.includes(student.name)) {
              failingStudentNames.push(student.name);
            }
          }
        }
      });

      const errorRate = totalAttempts > 0 ? (totalErrors / totalAttempts) * 100 : 0;

      return {
        rule,
        totalErrors,
        totalAttempts,
        errorRate,
        failingStudentNames
      };
    }).sort((a, b) => b.errorRate - a.errorRate);
  }, [rules, assessments, words, students]);

  const groupWordStats = useMemo(() => {
    return words.map(word => {
      const wordAssessments = assessments.filter(a => a.wordId === word.id);
      const totalAttempts = wordAssessments.length;
      const errors = wordAssessments.filter(ass => 
        Object.values(ass.ruleResults).some(res => res === false)
      ).length;

      const errorRate = totalAttempts > 0 ? (errors / totalAttempts) * 100 : 0;

      return {
        word,
        totalAttempts,
        errors,
        errorRate
      };
    }).sort((a, b) => b.errorRate - a.errorRate);
  }, [words, assessments]);

  const activeIndividualReports = selectedStudentId === 'all' 
    ? individualData 
    : individualData.filter(d => d.student.id === selectedStudentId);

  // --- Export Functions ---

  const exportToExcel = () => {
    // Gedetailleerde platte lijst: per leerling per woord per regel
    const exportData: any[] = [];

    students.forEach(student => {
      const studentAssessments = assessments.filter(a => a.studentId === student.id);
      
      words.forEach(word => {
        const ass = studentAssessments.find(a => a.wordId === word.id);
        
        // Alleen de regels die bij DIT specifieke woord horen exporteren
        word.ruleIds.forEach(rid => {
          const rule = rules.find(r => r.id === rid);
          if (!rule) return;

          let resultText = 'Niet beoordeeld';
          if (ass && ass.ruleResults) {
            if (ass.ruleResults[rid] === true) resultText = 'Correct';
            else if (ass.ruleResults[rid] === false) resultText = 'Fout';
          }
          
          exportData.push({
            'Leerling': student.name,
            'Woord': word.text,
            'Regel Code': rule.code,
            'Regel Omschrijving': rule.description,
            'Resultaat': resultText,
            'Opmerkingen': ass?.notes || ''
          });
        });
      });
    });

    if (exportData.length === 0) {
      alert("Geen data beschikbaar om te exporteren.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "VCLB Spelling Analyse");
    
    // Kolombreedtes optimaliseren
    worksheet['!cols'] = [
      {wch: 25}, // Leerling
      {wch: 15}, // Woord
      {wch: 12}, // Regel Code
      {wch: 45}, // Regel Omschrijving
      {wch: 18}, // Resultaat
      {wch: 40}  // Opmerkingen
    ];

    XLSX.writeFile(workbook, `VCLB_Spelling_Gedetailleerd_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getSmartFeedback = async () => {
    if (selectedStudentId === 'all') return;
    setLoadingAi(true);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        setAiFeedback("AI feedback is momenteel niet beschikbaar (API sleutel ontbreekt).");
        setLoadingAi(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const currentReport = individualData.find(r => r.student.id === selectedStudentId);
      if (!currentReport) return;

      const prompt = `
        Analyseer de spellingsfouten voor de leerling: ${currentReport.student.name}.
        Fouten per specifieke spellingsregel:
        ${currentReport.errorStatsByRule.map(s => `- Regel ${s.ruleCode} (${s.ruleDesc}): ${s.errorWords.join(', ')}`).join('\n')}
        
        Geef een kort, professioneel advies (max 120 woorden) voor de VCLB-begeleider over welk type oefeningen deze leerling nu nodig heeft.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiFeedback(response.text || "Er kon geen advies worden gegeneerd.");
    } catch (e) {
      console.error("AI Error:", e);
      setAiFeedback("Er is een technische fout opgetreden bij het genereren van het AI advies.");
    } finally {
      setLoadingAi(false);
    }
  };

  if (assessments.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
        <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Nog geen data beschikbaar</h3>
        <p className="text-slate-500">Begin met het scoren van woorden om rapporten te genereren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Analyse & Rapporten</h2>
          <p className="text-slate-500 mt-2">Gedetailleerde inzichten in de spellingsvaardigheden.</p>
        </div>
        
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 rounded-2xl font-bold text-white hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all transform hover:-translate-y-0.5"
        >
          <FileSpreadsheet size={20} />
          Exporteer naar Excel (Gedetailleerd)
        </button>
      </header>

      {/* Navigatie Tabs */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit no-print tabs-container">
        <button 
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ListChecks size={18} />
          Per Leerling
        </button>
        <button 
          onClick={() => setActiveTab('group')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'group' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={18} />
          Groepsoverzicht
        </button>
      </div>

      {activeTab === 'individual' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print">
            <span className="text-sm font-bold text-slate-500">Selecteer leerling:</span>
            <select 
              value={selectedStudentId} 
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setAiFeedback(null);
              }}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Alle leerlingen</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selectedStudentId !== 'all' && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden no-print">
              <Sparkles className="absolute top-4 right-4 text-white/20 w-12 h-12" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-3">AI Behandeladvies</h3>
                {aiFeedback ? (
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-indigo-50 leading-relaxed italic border border-white/10">"{aiFeedback}"</div>
                ) : (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-indigo-100 max-w-lg">Krijg direct een professioneel advies gebaseerd op de specifieke regel-uitval van {students.find(s => s.id === selectedStudentId)?.name}.</p>
                    <button onClick={getSmartFeedback} disabled={loadingAi} className="bg-white text-indigo-700 font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-50 shadow-lg disabled:opacity-50 flex items-center gap-2">
                      {loadingAi ? <Loader2 size={20} className="animate-spin" /> : 'Genereer Advies'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8">
            {activeIndividualReports.map(({ student, errorStatsByRule, totalErrors, totalCorrect, completion }) => (
              <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden break-inside-avoid">
                <div className="p-6 flex flex-col md:flex-row justify-between md:items-center bg-slate-50 border-b border-slate-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">{student.name.charAt(0)}</div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
                      <p className="text-sm text-slate-500">Voltooiing: {completion}%</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center px-4 py-2 bg-rose-50 rounded-xl border border-rose-100"><p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Fout</p><p className="text-xl font-black text-rose-600">{totalErrors}</p></div>
                    <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100"><p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Correct</p><p className="text-xl font-black text-emerald-600">{totalCorrect}</p></div>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Analyse per Spellingsregel</h4>
                  {errorStatsByRule.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <ListChecks size={20} />
                      <span className="font-semibold text-sm">Geen specifieke uitval gedetecteerd. Prima resultaat!</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {errorStatsByRule.map(stat => (
                        <div key={stat.ruleId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md">{stat.ruleCode}</span>
                            <span className="text-rose-500 font-bold text-xs">{stat.errorCount}x fout</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 mb-2 leading-tight">{stat.ruleDesc}</p>
                          <div className="flex flex-wrap gap-1">
                            {stat.errorWords.map((w, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500">{w}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Groeps Statistieken */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 mb-4"><TrendingDown size={24} /></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Grootste struikelblok</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">{groupRuleStats[0]?.rule.code || '-'}</h4>
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{groupRuleStats[0]?.rule.description}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="bg-rose-100 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-600 mb-4"><AlertCircle size={24} /></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Moeilijkste woord</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">{groupWordStats[0]?.word.text || '-'}</h4>
              <p className="text-sm text-slate-500 mt-1">{Math.round(groupWordStats[0]?.errorRate || 0)}% uitval in de groep</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-4"><BarChart3 size={24} /></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Algemene score</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">
                {students.length > 0 ? Math.round(individualData.reduce((acc, curr) => acc + (curr.totalCorrect / Math.max(1, words.length) * 100), 0) / students.length) : 0}%
              </h4>
              <p className="text-sm text-slate-500 mt-1">Gemiddelde van alle leerlingen</p>
            </div>
          </div>

          {/* Regel Analyse Groep */}
          <section className="break-inside-avoid">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-indigo-600 rounded-lg text-white"><BarChart3 size={20} /></div>
              <h3 className="text-2xl font-bold text-slate-800">Regel-uitval (Groep)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupRuleStats.map(stat => (
                <div key={stat.rule.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-1 h-full ${stat.errorRate > 50 ? 'bg-rose-500' : stat.errorRate > 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600 uppercase tracking-wider">{stat.rule.code}</span>
                      <h4 className="text-lg font-bold text-slate-800 mt-2">{stat.rule.description}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{Math.round(stat.errorRate)}%</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Foutmarge</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${stat.errorRate > 50 ? 'bg-rose-500' : stat.errorRate > 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${stat.errorRate}%` }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Leerlingen met uitval ({stat.failingStudentNames.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {stat.failingStudentNames.length > 0 ? (
                        stat.failingStudentNames.map((name, i) => (
                          <span key={i} className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-100">{name}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Geen uitval</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Woord Analyse Tabel */}
          <section className="break-inside-avoid">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-500 rounded-lg text-white"><BookOpen size={20} /></div>
              <h3 className="text-2xl font-bold text-slate-800">Analyse per Testwoord</h3>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Woord</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Gekoppelde Regels</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Uitval</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupWordStats.map(stat => (
                    <tr key={stat.word.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{stat.word.text}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {stat.word.ruleIds.map(rid => {
                            const r = rules.find(rule => rule.id === rid);
                            return r ? <span key={rid} className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded border border-slate-200 uppercase">{r.code}</span> : null;
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${stat.errorRate > 40 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                          {stat.errors} / {stat.totalAttempts} LL
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`text-xs font-bold ${stat.errorRate < 20 ? 'text-emerald-600' : stat.errorRate > 50 ? 'text-rose-600' : 'text-slate-600'}`}>
                            {100 - Math.round(stat.errorRate)}% OK
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${stat.errorRate < 20 ? 'bg-emerald-500' : stat.errorRate > 50 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${100 - stat.errorRate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ReportView;
