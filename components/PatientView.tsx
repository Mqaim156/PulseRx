import React, { useState } from 'react';
import { Check, AlertCircle, Plus, Trash2, Tag, Pill, FileText, Activity, AlertTriangle, Search } from 'lucide-react';
import { MEDICATION_HISTORY } from '../constants';

interface PatientViewProps {
  dailyPlan: string[];
}

interface Assessment {
  title: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  erAdvice: string;
  selfCare: string[];
}

const PatientView: React.FC<PatientViewProps> = ({ dailyPlan }) => {
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  
  // Updated state to hold objects with time, label, and taken status
  const [alerts, setAlerts] = useState<{time: string; label: string; taken: boolean}[]>([
    { time: '09:00', label: 'Lisinopril 10mg', taken: false },
    { time: '21:00', label: 'Metformin 500mg', taken: false }
  ]);

  // Symptom Checker State
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptomText, setOtherSymptomText] = useState('');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  
  const SYMPTOMS = ['Headache', 'Dizziness', 'Chest Pressure', 'Fatigue', 'Cough', 'Wheezing', 'Other'];

  const handleCheckSymptoms = () => {
    if (selectedSymptoms.length === 0) return;

    // Logic to generate assessment based on selection
    if (selectedSymptoms.includes('Chest Pressure') || selectedSymptoms.includes('Wheezing')) {
        setAssessment({
            title: 'RESPIRATORY ALERT',
            level: 'HIGH',
            erAdvice: 'Go to ER if you have difficulty breathing, cannot speak in full sentences, or lips turn blue.',
            selfCare: [
                'Use your rescue inhaler if you have an Asthma Action Plan.',
                'Sit upright to help with breathing.',
                'Monitor for fever.'
            ]
        });
    } else if (selectedSymptoms.includes('Dizziness') || selectedSymptoms.includes('Headache')) {
         setAssessment({
            title: 'BP / NEURO ALERT',
            level: 'MEDIUM',
            erAdvice: 'Seek immediate care if you have slurred speech, facial drooping, or severe vision changes.',
            selfCare: [
                'Sit or lie down immediately in a quiet room.',
                'Check your blood pressure if possible.',
                'Hydrate and avoid bright lights.'
            ]
        });
    } else {
        setAssessment({
            title: 'GENERAL SYMPTOM ADVICE',
            level: 'LOW',
            erAdvice: 'Go to urgent care if symptoms worsen significantly or persist for > 24 hours.',
            selfCare: [
                'Rest and maintain hydration.',
                'Monitor your temperature and log symptoms.',
                'Contact your pharmacist if you have questions about your meds.'
            ]
        });
    }
  };

  const addAlert = () => {
    setAlerts([...alerts, { time: '12:00', label: 'New Medication', taken: false }]);
  };

  const removeAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index));
  };

  const updateAlert = (index: number, field: 'time' | 'label', value: string) => {
    const newAlerts = [...alerts];
    // @ts-ignore
    newAlerts[index] = { ...newAlerts[index], [field]: value };
    setAlerts(newAlerts);
  };

  const toggleTaken = (index: number) => {
    const newAlerts = [...alerts];
    newAlerts[index] = { ...newAlerts[index], taken: !newAlerts[index].taken };
    setAlerts(newAlerts);
  };

  const toggleSymptom = (symptom: string) => {
    // Reset assessment when changing selection to force re-check
    setAssessment(null);
    
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const clearSymptoms = () => {
      setSelectedSymptoms([]);
      setAssessment(null);
      setOtherSymptomText('');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Daily Plan Card */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Today’s Plan / Daily Health Log</h2>
        </div>

        <div className="space-y-4 mb-8">
          {dailyPlan.map((item, idx) => (
            <label key={idx} className="flex items-center space-x-3 cursor-pointer group">
              <input type="checkbox" className="peer hidden" />
              <div className="w-6 h-6 rounded border-2 border-slate-600 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 group-hover:border-purple-500 transition-colors flex items-center justify-center">
                 <Check className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-slate-300 group-hover:text-white transition-colors peer-checked:text-slate-500 peer-checked:line-through">{item}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Systolic (Top)</label>
            <input
              type="number"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diastolic (Bottom)</label>
            <input
              type="number"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98]">
          Log Today's Reading
        </button>
      </div>

      {/* Medication Reminder */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg transition-all duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className={`w-5 h-5 ${reminderEnabled ? 'text-blue-400' : 'text-slate-500'}`} />
            <h3 className="text-lg font-semibold text-white">Medication Reminder</h3>
          </div>
          <button 
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${reminderEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
            onClick={() => setReminderEnabled(!reminderEnabled)}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${reminderEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </button>
        </div>
        
        {reminderEnabled && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
             {alerts.map((alert, index) => (
                <div key={index} className="flex items-center gap-3 group">
                   {/* Checkbox for Taken Status */}
                   <button 
                      onClick={() => toggleTaken(index)}
                      className={`w-10 h-10 rounded-lg border-2 flex flex-shrink-0 items-center justify-center transition-all ${
                        alert.taken 
                          ? 'bg-emerald-500 border-emerald-500' 
                          : 'bg-slate-900/50 border-slate-600 hover:border-blue-500'
                      }`}
                      title={alert.taken ? "Mark as untaken" : "Mark as taken"}
                   >
                      {alert.taken && <Check className="w-6 h-6 text-white" />}
                   </button>

                   {/* Inputs Container */}
                   <div className={`flex-1 bg-slate-900/50 rounded-lg p-2 flex items-center gap-3 border transition-all ${alert.taken ? 'border-emerald-500/30 opacity-75' : 'border-slate-700/50 focus-within:border-blue-500/50'}`}>
                      
                      {/* Label Input */}
                      <div className="flex-1 flex items-center gap-2 px-2 border-r border-slate-700">
                        <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <input 
                           type="text" 
                           value={alert.label}
                           onChange={(e) => updateAlert(index, 'label', e.target.value)}
                           placeholder="Medication Name"
                           className={`w-full bg-transparent text-sm outline-none placeholder-slate-600 ${alert.taken ? 'text-slate-400 line-through' : 'text-white'}`}
                        />
                      </div>

                      {/* Time Input */}
                      <div className="flex items-center space-x-2 px-2">
                        <span className="text-slate-500 text-xs font-bold uppercase">At</span>
                        <input 
                           type="time" 
                           value={alert.time}
                           onChange={(e) => updateAlert(index, 'time', e.target.value)}
                           className={`bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono text-sm outline-none [color-scheme:dark] cursor-pointer focus:border-blue-500 ${alert.taken ? 'opacity-50' : ''}`}
                        />
                      </div>
                   </div>

                   {/* Delete Button */}
                   <button 
                      onClick={() => removeAlert(index)}
                      className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                      title="Remove alert"
                      disabled={alerts.length === 1 && index === 0}
                      style={{ opacity: alerts.length === 1 ? 0.3 : 1, cursor: alerts.length === 1 ? 'not-allowed' : 'pointer' }}
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
             ))}

             <button 
               onClick={addAlert}
               className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center space-x-2 text-sm font-medium group"
             >
               <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
               <span>Add Medication Reminder</span>
             </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="p-1 bg-purple-500/20 rounded">
                  <Activity className="w-4 h-4 text-purple-400" />
                </span>
                Medication History
            </h3>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">Last 7 Days</span>
        </div>

        <div className="space-y-1">
            {MEDICATION_HISTORY.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-3 hover:bg-slate-700/20 rounded-lg transition-colors">
                    <div className="w-24 text-right">
                      <span className="text-slate-500 text-xs font-bold uppercase">{log.date}</span>
                      <div className="text-slate-400 text-[10px]">{log.label}</div>
                    </div>
                    
                    <div className="relative flex flex-col items-center h-full">
                         <div className={`w-3 h-3 rounded-full z-10 ${log.status === 'Taken' ? 'bg-emerald-500' : log.status === 'Missed' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                         <div className="absolute top-3 bottom-[-12px] w-0.5 bg-slate-700/50 -z-0"></div>
                    </div>

                    <div className="flex-1 bg-slate-900/30 rounded-lg border border-slate-700/30 p-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <Pill className="w-4 h-4 text-slate-500" />
                           <span className="text-slate-200 text-sm font-medium">{log.medicationName}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            log.status === 'Taken' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : log.status === 'Missed' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                            {log.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Symptom Checker */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Symptom Checker</h3>
          </div>
          <p className="text-slate-400 text-sm mb-6 pl-12">Select any symptoms you are currently experiencing to get advice.</p>

          {/* Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {SYMPTOMS.map((symptom) => (
                  <button
                      key={symptom}
                      onClick={() => toggleSymptom(symptom)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          selectedSymptoms.includes(symptom)
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                          : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                      }`}
                  >
                      {symptom}
                  </button>
              ))}
          </div>

          {/* Conditional Text Input for 'Other' */}
          {selectedSymptoms.includes('Other') && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block pl-1">Specify Other Symptom</label>
               <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={otherSymptomText}
                    onChange={(e) => setOtherSymptomText(e.target.value)}
                    placeholder="E.g. Knee pain, Nausea..."
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
               </div>
            </div>
          )}
          
          {/* Action or Result */}
          {!assessment ? (
            <button 
                onClick={handleCheckSymptoms}
                disabled={selectedSymptoms.length === 0}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors shadow-lg"
            >
                Check Symptoms
            </button>
          ) : (
            <div className={`border rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 ${
                assessment.level === 'HIGH' ? 'border-red-500/50' : assessment.level === 'MEDIUM' ? 'border-amber-500/50' : 'border-blue-500/30'
            }`}>
                {/* Assessment Header */}
                <div className="bg-slate-900/80 p-4 border-b border-slate-700 flex flex-wrap gap-4 justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Assessment</span>
                    <span className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-2 ${
                        assessment.level === 'HIGH' ? 'bg-red-500 text-white' : assessment.level === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                        {assessment.level !== 'LOW' && <AlertTriangle className="w-3 h-3 fill-current" />}
                        {assessment.title}
                    </span>
                </div>

                {/* Assessment Body */}
                <div className="p-6 bg-slate-900/30 grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">When to go to ER</h4>
                          <p className="text-white text-sm font-medium leading-relaxed">
                            {assessment.erAdvice}
                          </p>
                      </div>
                      
                      <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Self-Care Advice</h4>
                          <ul className="space-y-2">
                              {assessment.selfCare.map((advice, i) => (
                                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></span>
                                      {advice}
                                  </li>
                              ))}
                          </ul>
                      </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700/50">
                      <button onClick={clearSymptoms} className="text-xs text-slate-500 hover:text-slate-300 underline decoration-slate-600 underline-offset-2">
                          Clear Selection
                      </button>
                </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default PatientView;