import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { FlaskConical, Play, Users, Clock, Award, Gamepad2, X, ExternalLink, Radio, Shield, Zap } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useScenarios, updateRow, Scenario } from '@/hooks/useDDriveData';

const ValidationModule: React.FC = () => {
  const { data: scenarios, refetch } = useScenarios();
  const [launched, setLaunched] = useState<Scenario | null>(null);
  const [step, setStep] = useState(0);

  const simSteps = [
    'Initial Situation: Typhoon Signal #3 raised. Evacuation ordered.',
    'Activate EOC. Deploy first responders to Zone A.',
    'Coordinate with LGU and DSWD for evacuation centers.',
    'Monitor casualties. Deploy medical teams.',
    'Post-event: Damage assessment and recovery activation.',
  ];

  // External simulation links
  const externalSims = [
    {
      name: 'EOC Simulator',
      url: 'https://asilvainnovations.github.io/ddrive-m/EOCSimulation.html',
      icon: Radio,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/30',
      description: 'Emergency Operations Center'
    },
    {
      name: 'ICS Simulator',
      url: 'https://asilvainnovations.github.io/ddrive-m/ics.html',
      icon: Shield,
      gradient: 'from-blue-500 to-indigo-600',
      glow: 'shadow-blue-500/30',
      description: 'Incident Command System'
    },
    {
      name: 'ICS Simulator 3.0',
      url: 'https://asilvainnovations.github.io/ddrive-m/ics-simulator-3.0.html',
      icon: Zap,
      gradient: 'from-purple-500 to-pink-600',
      glow: 'shadow-purple-500/30',
      description: 'Advanced ICS Training'
    }
  ];

  const totalParticipants = scenarios.reduce((a, s) => a + s.participants, 0);
  const avgCompletion = scenarios.length ? Math.round(scenarios.reduce((a, s) => a + s.completion, 0) / scenarios.length) : 0;

  const completeScenario = async (id: number, currentParticipants: number) => {
    await updateRow('ddrive_scenarios', id, { participants: currentParticipants + 1 });
    toast.success('Simulation completed! Participation logged to Supabase.');
    refetch();
    setLaunched(null);
  };

  const openExternalSim = (url: string, name: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Launching ${name}...`);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Validation Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 5 · 3D Simulation Engine (Supabase-tracked)</p>
          </div>
        </div>
      </GlassCard>

      {/* External Simulation Links Section */}
      <GlassCard className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="font-montserrat font-bold text-lg">Live External Simulators</h3>
          </div>
          <p className="text-sm text-slate-500 font-poppins mb-5">Access advanced simulation environments powered by Asilva Innovations</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {externalSims.map((sim, index) => {
              const Icon = sim.icon;
              return (
                <button
                  key={index}
                  onClick={() => openExternalSim(sim.url, sim.name)}
                  className={`group relative p-5 rounded-2xl bg-gradient-to-br ${sim.gradient} text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:${sim.glow} shadow-lg`}
                >
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-500" />
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

                  <div className="relative z-10 flex flex-col items-start">
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="font-montserrat font-bold text-base mb-1">{sim.name}</p>
                    <p className="text-xs text-white/80 font-poppins">{sim.description}</p>
                  </div>

                  {/* Bottom shine effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Scenarios', val: scenarios.length, icon: Gamepad2, color: 'from-amber-500 to-orange-600' },
          { label: 'Total Participants', val: totalParticipants.toLocaleString(), icon: Users, color: 'from-blue-500 to-cyan-500' },
          { label: 'Hours Logged', val: 8420, icon: Clock, color: 'from-emerald-500 to-teal-500' },
          { label: 'Avg Completion', val: `${avgCompletion}%`, icon: Award, color: 'from-purple-500 to-pink-500' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <GlassCard key={i} className="p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-montserrat font-bold">{s.val}</p>
              <p className="text-xs text-slate-500 font-roboto-condensed uppercase tracking-wider">{s.label}</p>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="p-6">
        <h3 className="font-montserrat font-bold text-lg mb-4">Scenario-Based Simulation Engine</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(s => (
            <div key={s.id} className="p-4 rounded-xl bg-gradient-to-br from-slate-100/80 to-slate-50/80 dark:from-slate-800/60 dark:to-slate-900/60 border border-white/60 dark:border-white/10 hover:shadow-xl hover:-translate-y-1 transition group">
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.difficulty === 'Expert' ? 'bg-red-500/15 text-red-700' :
                  s.difficulty === 'Advanced' ? 'bg-orange-500/15 text-orange-700' :
                  'bg-emerald-500/15 text-emerald-700'
                }`}>{s.difficulty.toUpperCase()}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40">{s.type}</span>
              </div>
              <p className="font-montserrat font-bold text-sm mb-3">{s.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.participants}</span>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Completion</span><span className="font-semibold">{s.completion}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${s.completion}%` }} />
                </div>
              </div>
              <button
                onClick={() => { setLaunched(s); setStep(0); }}
                className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs flex items-center justify-center gap-2 group-hover:shadow-lg"
              >
                <Play className="w-3 h-3" /> Launch 3D Simulation
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {launched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 max-w-2xl w-full border border-amber-500/30 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">3D Simulation Active</span>
                <h3 className="font-montserrat font-bold text-2xl">{launched.name}</h3>
              </div>
              <button onClick={() => setLaunched(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="aspect-video rounded-xl bg-gradient-to-br from-amber-900/50 to-orange-900/50 border border-amber-500/20 flex items-center justify-center relative overflow-hidden mb-4">
              <div className="relative text-center">
                <Gamepad2 className="w-16 h-16 mx-auto text-amber-400 mb-2" />
                <p className="font-montserrat font-bold text-lg">Step {step + 1} of {simSteps.length}</p>
              </div>
            </div>
            <p className="text-sm font-poppins mb-4 p-3 rounded-xl bg-white/10">{simSteps[step]}</p>
            <div className="flex gap-2">
              <button disabled={step === 0} onClick={() => setStep(s => s - 1)} className="flex-1 px-4 py-2 rounded-xl border border-white/20 font-semibold text-sm disabled:opacity-30">Previous</button>
              {step < simSteps.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)} className="flex-1 px-4 py-2 rounded-xl bg-amber-500 text-slate-900 font-semibold text-sm">Next Step</button>
              ) : (
                <button onClick={() => completeScenario(launched.id, launched.participants)} className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-sm">Complete Simulation</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationModule;