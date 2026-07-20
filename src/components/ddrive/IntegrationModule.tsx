import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Network, TrendingUp, ExternalLink, FileText, ClipboardCheck, Search, Building2, ArrowRight, CheckCircle2, Clock, Users, BarChart3, X, ChevronRight, Download, Sparkles } from 'lucide-react';
import { useUndrr } from '@/hooks/useDDriveData';
import { toast } from '@/components/ui/sonner';

interface AssessmentType {
  id: 'preliminary' | 'detailed';
  name: string;
  description: string;
  icon: React.ElementType;
  questions: number;
  scoreRange: string;
  duration: string;
  color: string;
  gradient: string;
  docs: {
    main: string;
    reference: string;
  };
}

const IntegrationModule: React.FC = () => {
  const { data: undrr } = useUndrr();
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'essentials'>('overview');

  const avgScore = undrr.length > 0 ? Math.round(undrr.reduce((a, b) => a + b.score, 0) / undrr.length) : 0;
  const totalImprovement = undrr.reduce((a, b) => a + b.trend, 0);

  const assessments: AssessmentType[] = [
    {
      id: 'preliminary',
      name: 'Preliminary Assessment',
      description: 'High-level survey for rapid resilience evaluation. Ideal for 1-2 day multi-stakeholder workshops.',
      icon: ClipboardCheck,
      questions: 47,
      scoreRange: '0-3 per indicator',
      duration: '1-2 days',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600',
      docs: {
        main: 'https://mcr2030.undrr.org/media/73008/download?startDownload=20260414',
        reference: 'https://mcr2030.undrr.org/media/73012/download?startDownload=20260414'
      }
    },
    {
      id: 'detailed',
      name: 'Detailed Assessment',
      description: 'Comprehensive multi-stakeholder exercise for detailed city resilience action planning.',
      icon: Search,
      questions: 117,
      scoreRange: '0-5 per indicator',
      duration: '1-4 months',
      color: 'blue',
      gradient: 'from-blue-600 to-indigo-600',
      docs: {
        main: 'https://mcr2030.undrr.org/media/73011/download?startDownload=20260414',
        reference: 'https://mcr2030.undrr.org/sites/default/files/2021-08/Ref%20note%20on%20required%20information_Preliminary%20and%20Detailed%20Scorecard%20Assessment_Jan2021.pdf?startDownload=true'
      }
    }
  ];

  const tenEssentials = [
    { id: 1, name: 'Organise for Disaster Resilience', category: 'Governance' },
    { id: 2, name: 'Identify, Understand and Use Current and Future Risk Scenarios', category: 'Risk' },
    { id: 3, name: 'Strengthen Financial Capability for Resilience', category: 'Finance' },
    { id: 4, name: 'Pursue Resilient Urban Development and Design', category: 'Planning' },
    { id: 5, name: 'Safeguard Natural Buffers', category: 'Environment' },
    { id: 6, name: 'Strengthen Institutional Capacity for Resilience', category: 'Institution' },
    { id: 7, name: 'Understand and Strengthen Societal Capacity', category: 'Society' },
    { id: 8, name: 'Increase Infrastructure Resilience', category: 'Infrastructure' },
    { id: 9, name: 'Ensure Effective Disaster Response', category: 'Response' },
    { id: 10, name: 'Expedite Recovery and Build Back Better', category: 'Recovery' }
  ];

  const openExternalLink = (url: string, label: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Opening ${label}...`);
  };

  const startAssessment = (type: AssessmentType) => {
    setSelectedAssessment(type);
    toast.success(`${type.name} selected. Review the guidelines below.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Integration Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 4 · UNDRR 10 Essentials (Supabase persisted)</p>
          </div>
        </div>
      </GlassCard>

      {/* SPARC Organizational Resilience Button */}
      <GlassCard className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-montserrat font-bold text-xl">SPARC Assessment</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Live</span>
              </div>
              <p className="text-sm text-slate-500 font-poppins">Assess organizational resilience through the SPARC framework</p>
            </div>
          </div>
          <button
            onClick={() => openExternalLink('https://asilvainnovations.github.io/ddrive-m/sparc.html', 'SPARC Assessment')}
            className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-[1.02] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
            <span className="relative flex items-center gap-2">
              Access SPARC Tool
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </GlassCard>

      {/* Interactive Assessment Selector */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-montserrat font-bold text-lg">UNDRR Resilience Scorecard</h3>
            <p className="text-sm text-slate-500 font-poppins">Select assessment type to evaluate city disaster resilience</p>
          </div>
          <button
            onClick={() => setShowAssessmentModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Start Assessment
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((assessment) => {
            const Icon = assessment.icon;
            return (
              <div
                key={assessment.id}
                onClick={() => startAssessment(assessment)}
                className={`group p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedAssessment?.id === assessment.id
                    ? `border-${assessment.color}-500 bg-${assessment.color}-50/50 dark:bg-${assessment.color}-900/20`
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${assessment.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-montserrat font-bold text-base">{assessment.name}</h4>
                      {selectedAssessment?.id === assessment.id && (
                        <CheckCircle2 className={`w-5 h-5 text-${assessment.color}-500`} />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{assessment.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {assessment.questions} indicators
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {assessment.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {assessment.scoreRange}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Assessment Details */}
        {selectedAssessment && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-montserrat font-bold text-lg">{selectedAssessment.name} Resources</h4>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => openExternalLink(selectedAssessment.docs.main, `${selectedAssessment.name} Guidelines`)}
                className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Assessment Document</p>
                  <p className="text-xs text-slate-500">Official UNDRR guidelines</p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
              </button>
              <button
                onClick={() => openExternalLink(selectedAssessment.docs.reference, 'Reference Notes')}
                className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Reference Notes</p>
                  <p className="text-xs text-slate-500">Required data & information</p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Score Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6 md:col-span-2 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">Composite Resilience Score</p>
            <div className="flex items-end gap-4 mt-2">
              <span className="font-montserrat text-6xl font-bold">{avgScore}</span>
              <span className="text-xl text-blue-200 mb-2">/100</span>
              <div className="flex items-center gap-1 text-emerald-300 mb-3 ml-auto">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">+{totalImprovement} YoY</span>
              </div>
            </div>
            <p className="text-sm text-blue-100 mt-2">Resilience rating: <strong className="text-amber-300">GOOD</strong> — continuing improvement trajectory.</p>
            <div className="h-3 bg-blue-950/50 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" style={{ width: `${avgScore}%` }} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-montserrat font-bold text-lg mb-3">Year-over-Year</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">2023</span><strong>68/100</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">2024</span><strong>71/100</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">2025</span><strong className="text-emerald-600">{avgScore}/100</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Target 2026</span><strong className="text-blue-600">85/100</strong></div>
          </div>
          <button className="w-full mt-4 px-3 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Generate Gap Analysis</button>
        </GlassCard>
      </div>

      {/* Enhanced Scorecard with Tabs */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="font-montserrat font-bold text-lg">UNDRR 10 Essentials Scorecard</h3>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('essentials')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'essentials'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                10 Essentials
              </button>
            </div>
          </div>
          <span className="text-xs text-slate-500">Making Cities Resilient 2030 Framework</span>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-3">
            {undrr.map(e => (
              <div key={e.id} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-sm shrink-0">{e.id}</span>
                    <span className="font-poppins font-medium text-sm truncate">{e.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      e.status === 'Strong' ? 'bg-emerald-500/15 text-emerald-700' :
                      e.status === 'Good' ? 'bg-blue-500/15 text-blue-700' :
                      'bg-amber-500/15 text-amber-700'
                    }`}>{e.status?.toUpperCase()}</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><TrendingUp className="w-3 h-3" />+{e.trend}</span>
                    <span className="font-montserrat font-bold text-lg w-12 text-right">{e.score}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    e.score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                    e.score >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                    'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`} style={{ width: `${e.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tenEssentials.map((essential) => (
              <div
                key={essential.id}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold shrink-0 group-hover:scale-110 transition-transform">
                    {essential.id}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{essential.category}</span>
                    <p className="font-poppins font-medium text-sm mt-0.5">{essential.name}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 max-w-4xl w-full border border-emerald-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">UNDRR Assessment</span>
                <h3 className="font-montserrat font-bold text-2xl">Choose Assessment Type</h3>
              </div>
              <button onClick={() => setShowAssessmentModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {assessments.map((assessment) => {
                const Icon = assessment.icon;
                return (
                  <button
                    key={assessment.id}
                    onClick={() => {
                      startAssessment(assessment);
                      setShowAssessmentModal(false);
                    }}
                    className={`group p-6 rounded-2xl text-left transition-all duration-300 border-2 ${
                      selectedAssessment?.id === assessment.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${assessment.gradient} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-montserrat font-bold text-lg mb-2">{assessment.name}</h4>
                    <p className="text-sm text-slate-400 mb-4">{assessment.description}</p>
                    <div className="space-y-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>{assessment.questions} indicators</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {assessment.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Scoring: {assessment.scoreRange}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Note:</strong> The Preliminary Assessment is designed for rapid evaluation in workshop settings, 
                while the Detailed Assessment provides comprehensive analysis for city resilience action planning. 
                Both assessments follow the Ten Essentials for Making Cities Resilient framework.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationModule;