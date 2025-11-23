import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, FileText, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MARIA_BP_DATA } from '../constants';
import { Patient } from '../types';
import VirtualNotetaker from './VirtualNotetaker';

const API_BASE =
  // if you later add env vars for frontend, use them here
  (window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://pulserx.onrender.com');


// --- Types for visits / SOAP note coming from backend ---
interface ClinicalNote {
  patient_summary: string;
  subjective: string[];
  objective: string[];
  assessment: string;
  plan: string[];
}

interface Visit {
  _id: any;
  patient_id: string;
  timestamp: string;
  raw_transcript?: string;
  clinical_note?: ClinicalNote;
  status?: string;
}

const PharmacistDashboard: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [soapAnalyzing, setSoapAnalyzing] = useState(false);
  const [soapRefreshToken, setSoapRefreshToken] = useState(0);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientCondition, setNewPatientCondition] = useState('');
  const [savingPatient, setSavingPatient] = useState(false);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  // Derived counts for stat cards
  const totalPatients = patients.length;
  const highRiskCount = patients.filter((p) => p.riskStatus === 'HIGH').length;
  const mediumRiskCount = patients.filter((p) => p.riskStatus === 'MEDIUM').length;
  const lowRiskCount = patients.filter((p) => p.riskStatus === 'LOW').length;

  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const res = await fetch(`${API_BASE}/api/patients`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed with status ${res.status}`);
        }
        const data = await res.json();
        setPatients(Array.isArray(data.patients) ? data.patients : []);
      } catch (err) {
        setPatientsError(
          err instanceof Error ? err.message : 'Failed to load patients'
        );
      } finally {
        setPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    try {
      setSavingPatient(true);

      const res = await fetch('${API_BASE}/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPatientName.trim(),
          condition: newPatientCondition.trim() || 'N/A',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      const created = data.patient as Patient;

      // Put newest patient at the top
      setPatients((prev) => [created, ...prev]);

      // Reset form
      setNewPatientName('');
      setNewPatientCondition('');
      setShowAddPatient(false);
    } catch (err) {
      alert(
        'Error saving patient: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    } finally {
      setSavingPatient(false);
    }
  };


  // -- Sub-Components --

  const StatCard = ({
    title,
    value,
    type,
  }: {
    title: string;
    value: string;
    type: 'neutral' | 'high' | 'medium' | 'low';
  }) => {
    let borderColor = 'border-slate-700';
    let textColor = 'text-white';

    if (type === 'high') {
      borderColor = 'border-red-500/30';
      textColor = 'text-white';
    }

    return (
      <div
        className={`bg-slate-800 rounded-xl p-5 border ${borderColor} shadow-sm flex flex-col justify-between h-28`}
      >
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            type === 'high'
              ? 'text-red-400'
              : type === 'medium'
              ? 'text-amber-400'
              : type === 'low'
              ? 'text-emerald-400'
              : 'text-slate-400'
          }`}
        >
          {title}
        </span>
        <div className="flex justify-between items-end">
          <span className={`text-3xl font-bold ${textColor}`}>{value}</span>
          {type === 'high' && (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="w-1.5 h-4 bg-red-500 rounded-full"></span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      HIGH: 'bg-red-500/20 text-red-400 border-red-500/20',
      MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
      LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    };
    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
          styles[status as keyof typeof styles] || styles.LOW
        }`}
      >
        {status}
      </span>
    );
  };

  // --- SOAP Notes panel for each patient (unchanged logic, still real data) ---
  const PatientSoapNotes: React.FC<{
    patientName: string;
    isAnalyzing: boolean;
    refreshToken: number;
  }> = ({ patientName, isAnalyzing, refreshToken }) => {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let isMounted = true;

      const loadVisits = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch(
            `${API_BASE}/api/visits?patient_id=${encodeURIComponent(patientName)}`
          );

          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Request failed with status ${res.status}`);
          }
          const data = await res.json();
          if (isMounted) {
            setVisits(Array.isArray(data.visits) ? data.visits : []);
          }
        } catch (err) {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load visits');
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadVisits();

      return () => {
        isMounted = false;
      };
    }, [patientName, refreshToken]);

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI SOAP Notes</h3>
              <p className="text-xs text-slate-500">
                Generated from recorded visits for {patientName}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 uppercase">
            {visits.length} visit{visits.length === 1 ? '' : 's'}
          </span>
        </div>

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-blue-400 mb-3">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Analyzing latest recording and updating SOAP note…</span>
          </div>
        )}

        {loading && (
          <div className="text-xs text-slate-400 italic">Loading visits &amp; notes…</div>
        )}

        {error && !loading && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            Error loading notes: {error}
          </div>
        )}

        {!loading && !error && visits.length === 0 && (
          <div className="text-xs text-slate-500 italic">
            No recorded visits yet for this patient.
          </div>
        )}

        {!loading && !error && visits.length > 0 && (
          <div className="space-y-4 mt-3 max-h-80 overflow-y-auto pr-1">
            {visits.map((visit) => {
              const note = visit.clinical_note;
              const timestamp = visit.timestamp ? new Date(visit.timestamp) : new Date();
              const label = timestamp.toLocaleString();

              return (
                <div
                  key={String(visit._id)}
                  className="border border-slate-700/60 rounded-lg p-3 bg-slate-900/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{label}</span>
                      {visit.status && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-600 text-slate-400">
                          {visit.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {!note ? (
                    <p className="text-xs text-slate-500 italic">
                      SOAP note still processing for this visit.
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs text-slate-200">
                      <div>
                        <span className="font-semibold text-slate-300">Summary: </span>
                        <span className="text-slate-200">
                          {note.patient_summary || '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Subjective
                          </div>
                          <ul className="space-y-0.5">
                            {(note.subjective || []).map((item, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-500 mt-1 flex-shrink-0"></span>
                                <span className="text-slate-200">{item}</span>
                              </li>
                            ))}
                            {(!note.subjective || note.subjective.length === 0) && (
                              <li className="text-slate-500 italic">None captured.</li>
                            )}
                          </ul>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Objective
                          </div>
                          <ul className="space-y-0.5">
                            {(note.objective || []).map((item, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-500 mt-1 flex-shrink-0"></span>
                                <span className="text-slate-200">{item}</span>
                              </li>
                            ))}
                            {(!note.objective || note.objective.length === 0) && (
                              <li className="text-slate-500 italic">None captured.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Assessment (possible conditions)
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap">
                          {note.assessment || '—'}
                        </p>
                      </div>

                      <div className="mt-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Plan
                        </div>
                        <ul className="space-y-0.5">
                          {(note.plan || []).map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                              <span className="text-slate-200">{item}</span>
                            </li>
                          ))}
                          {(!note.plan || note.plan.length === 0) && (
                            <li className="text-slate-500 italic">No plan documented.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- NEW: Patient Timeline based on real visit data ---
  const PatientTimeline: React.FC<{
    patientName: string;
    refreshToken: number;
  }> = ({ patientName, refreshToken }) => {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let isMounted = true;

      const loadVisits = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch(
            `${API_BASE}api/visits?patient_id=${encodeURIComponent(patientName)}`,
          );
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Request failed with status ${res.status}`);
          }
          const data = await res.json();
          if (isMounted) {
            setVisits(Array.isArray(data.visits) ? data.visits : []);
          }
        } catch (err) {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load timeline');
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadVisits();

      return () => {
        isMounted = false;
      };
    }, [patientName, refreshToken]);

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-fit">
        <h3 className="text-lg font-semibold text-white mb-2">Patient Timeline</h3>
        <p className="text-xs text-slate-500 mb-4">
          Built from recorded visits and AI SOAP notes.
        </p>

        {loading && (
          <div className="text-xs text-slate-400 italic">Loading timeline…</div>
        )}

        {error && !loading && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            Error loading timeline: {error}
          </div>
        )}

        {!loading && !error && visits.length === 0 && (
          <div className="text-xs text-slate-500 italic">
            No recorded visits yet for this patient.
          </div>
        )}

        {!loading && !error && visits.length > 0 && (
          <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[7px] before:w-[2px] before:bg-slate-700 pl-2">
            {visits.map((visit, index) => {
              const timestamp = visit.timestamp ? new Date(visit.timestamp) : new Date();
              const dateLabel = timestamp.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const timeLabel = timestamp.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              });

              const note = visit.clinical_note;
              const title =
                (note?.assessment && note.assessment.split('\n')[0]) || 'Visit recorded';

              const summary =
                note?.patient_summary ||
                (visit.raw_transcript
                  ? visit.raw_transcript.slice(0, 120) +
                    (visit.raw_transcript.length > 120 ? '…' : '')
                  : '');

              const isMostRecent = index === 0;

              return (
                <div key={String(visit._id)} className="relative pl-6">
                  <span
                    className={`absolute left-0 top-1.5 rounded-full border-4 border-slate-800 ${
                      isMostRecent ? 'w-4 h-4 bg-blue-500' : 'w-3 h-3 bg-slate-600'
                    }`}
                  ></span>
                  <p
                    className={`text-xs font-bold mb-1 ${
                      isMostRecent ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {isMostRecent ? 'Most recent visit' : dateLabel} • {timeLabel}
                  </p>
                  <p className="text-slate-200 text-sm font-semibold">{title}</p>
                  {summary && (
                    <p className="text-slate-500 text-xs mt-1">{summary}</p>
                  )}
                  {visit.status && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Status: <span className="uppercase">{visit.status}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // -- Main Views --

  const renderPatientList = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Add Patient button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Patients</h2>
        <button
          onClick={() => setShowAddPatient((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showAddPatient ? 'Close' : 'Add Patient'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={String(totalPatients)} type="neutral" />
        <StatCard title="High Risk" value={String(highRiskCount)} type="high" />
        <StatCard title="Medium Risk" value={String(mediumRiskCount)} type="medium" />
        <StatCard title="Low Risk" value={String(lowRiskCount)} type="low" />
      </div>

      {/* Add Patient Form */}
      {showAddPatient && (
        <form
          onSubmit={handleAddPatientSubmit}
          className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">
                Patient Name
              </label>
              <input
                type="text"
                required
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">
                Primary Condition
              </label>
              <input
                type="text"
                value={newPatientCondition}
                onChange={(e) => setNewPatientCondition(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="e.g. Hypertension"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddPatient(false);
                setNewPatientName('');
                setNewPatientCondition('');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPatient}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded"
            >
              {savingPatient ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      )}

      {/* Patient table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-slate-700 bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <div className="col-span-1">Patient Name</div>
          <div className="col-span-1">Condition</div>
          <div className="col-span-1">Adherence</div>
          <div className="col-span-1">Risk Status</div>
          <div className="col-span-1">Last BP</div>
          <div className="col-span-1 text-right">Last Check</div>
        </div>
        <div className="divide-y divide-slate-700">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatientId(patient.id)}
              className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-slate-700/40 cursor-pointer transition-colors"
            >
              <div className="col-span-1 font-medium text-white">{patient.name}</div>
              <div className="col-span-1 text-slate-300 text-sm">
                {patient.condition}
              </div>
              <div className="col-span-1 flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      patient.adherence < 60
                        ? 'bg-red-500'
                        : patient.adherence < 90
                        ? 'bg-emerald-500'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${patient.adherence}%` }}
                  ></div>
                </div>
                <span className="text-xs text-slate-400">{patient.adherence}%</span>
              </div>
              <div className="col-span-1">
                <StatusBadge status={patient.riskStatus} />
              </div>
              <div className="col-span-1 text-slate-300 font-mono text-sm">
                {patient.lastBP}
              </div>
              <div className="col-span-1 text-right text-slate-400 text-sm">
                {patient.lastCheck}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PatientDetail = ({ patient }: { patient: Patient }) => (
    <div className="grid grid-cols-12 gap-6 animate-fade-in">
      {/* Left Column (Main) */}
      <div className="col-span-8 space-y-6">
        {/* Header Card */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setSelectedPatientId(null)}
                className="text-slate-400 hover:text-white mr-2"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
              <StatusBadge status={patient.riskStatus} />
            </div>
            <p className="text-blue-400 font-medium">{patient.condition}</p>
            <div className="flex gap-8 mt-4">
              <div>
                <span className="text-xs text-slate-500 uppercase">
                  Last BP Reading
                </span>
                <p className="text-xl font-bold text-white font-mono">
                  {patient.lastBP}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase">Adherence</span>
                <p className="text-xl font-bold text-white">{patient.adherence}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Virtual Notetaker */}
        <VirtualNotetaker
          patientName={patient.name}
          onAnalysisStatusChange={(status) => {
            setSoapAnalyzing(status === 'processing');
          }}
          onVisitSaved={() => {
            setSoapRefreshToken((prev) => prev + 1);
          }}
        />

        {/* AI SOAP notes for this patient */}
        <PatientSoapNotes
          patientName={patient.name}
          isAnalyzing={soapAnalyzing}
          refreshToken={soapRefreshToken}
        />

        {/* Chart Card */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">
            Blood Pressure Trends (Systolic)
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MARIA_BP_DATA}>
                <defs>
                  <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#f8fafc',
                  }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area
                  type="monotone"
                  dataKey="systolic"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSys)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hints */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-3">
          <div className="p-1">
            <div className="w-5 h-5 rounded-full border-2 border-amber-500/50 flex items-center justify-center">
              <span className="text-amber-500 text-xs font-bold">!</span>
            </div>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-1">
              Medication Optimization Hints
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Review adherence barriers for {patient.name}. Consider switching to
              combination therapy if adherence is low due to pill burden. Collaborate
              with prescriber to adjust dosage if trends persist.
            </p>
          </div>
        </div>
        {/* NOTE: Daily Patient Plan, Disease Pathway, Generated Care Plan,
                 Schedule Appointment, Upcoming Appointments, and
                 Care Transitions & Next Steps have been removed as requested. */}
      </div>

      {/* Right Column (Timeline only, now real data) */}
      <div className="col-span-4 space-y-6">
        <PatientTimeline
          patientName={patient.name}
          refreshToken={soapRefreshToken}
        />
      </div>
    </div>
  );

  return (
  <div className="max-w-7xl mx-auto py-6">
    {selectedPatientId && selectedPatient
      ? <PatientDetail patient={selectedPatient} />
      : renderPatientList()}
  </div>
  );

};

export default PharmacistDashboard;
