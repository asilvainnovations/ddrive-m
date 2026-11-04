import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, Role } from '@/lib/roles';
import {
  Member, listMembers, addOrUpdateMember, removeMember, getRiskThresholds, setRiskThresholds,
  WatchArea, listWatchAreas, addWatchArea, removeWatchArea,
} from '@/lib/actions';
import { needsRole } from '@/lib/roles';
import { useOfficialAlerts } from '@/hooks/useOfficialAlerts';

// Members, roles and risk criteria for the active organisation.
// Everyone sees the member list; only administrators can change it. The database enforces the same.
const OrganisationSettings: React.FC = () => {
  const { user, activeTenant, can, refresh } = useAuth();
  const isAdmin = can('tenant_admin');
  const canWatch = can('drrm_officer');
  const { alerts, refetch: refetchAlerts } = useOfficialAlerts();
  const tenantId = activeTenant?.tenant_id ?? null;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('viewer');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState({ critical: 20, high: 12, medium: 6 });
  const [areas, setAreas] = useState<WatchArea[]>([]);
  const [areaLabel, setAreaLabel] = useState('');
  const [areaCode, setAreaCode] = useState('');

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [{ data, error }, th, wa] = await Promise.all([listMembers(tenantId), getRiskThresholds(tenantId), listWatchAreas(tenantId)]);
    if (error) toast.error(error);
    setMembers(data);
    if (th) setThresholds(th);
    setAreas(wa);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  if (!activeTenant || !tenantId) return null;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await addOrUpdateMember(tenantId, email, newRole);
    if (error) { toast.error(error); return; }
    toast.success(`${email} is now ${ROLE_LABELS[newRole]}`);
    setEmail('');
    void load();
  };

  const changeRole = async (m: Member, role: Role) => {
    if (!m.email) return;
    const { error } = await addOrUpdateMember(tenantId, m.email, role);
    if (error) { toast.error(error); return; }
    toast.success(`${m.full_name ?? m.email} is now ${ROLE_LABELS[role]}`);
    void load();
  };

  const remove = async (m: Member) => {
    if (confirmRemove !== m.user_id) { setConfirmRemove(m.user_id); return; }
    setConfirmRemove(null);
    const { error } = await removeMember(tenantId, m.user_id);
    if (error) { toast.error(error); return; }
    toast.success(`${m.full_name ?? m.email} was removed`);
    if (m.user_id === user?.id) { await refresh(); return; }
    void load();
  };

  // Province names and codes exactly as PAGASA writes them in alerts now in force, as suggestions.
  const suggestions = new Map<string, string>();
  alerts.forEach((a) => a.area_names.forEach((n, i) => { if (!suggestions.has(n)) suggestions.set(n, a.area_codes[i] ?? ''); }));
  const watched = new Set(areas.map((w) => w.label.trim().toLowerCase()));

  const addArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = areaCode.trim() || suggestions.get(areaLabel.trim()) || '';
    const { error } = await addWatchArea(areaLabel, code || null);
    if (error) { toast.error(error); return; }
    toast.success(`Now watching ${areaLabel.trim()}`);
    setAreaLabel(''); setAreaCode('');
    await load(); void refetchAlerts();
  };

  const dropArea = async (w: WatchArea) => {
    const { error } = await removeWatchArea(w.id);
    if (error) { toast.error(error); return; }
    toast.success(`Stopped watching ${w.label}`);
    await load(); void refetchAlerts();
  };

  const saveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await setRiskThresholds(tenantId, thresholds.critical, thresholds.high, thresholds.medium);
    if (error) { toast.error(error); return; }
    toast.success('Risk criteria saved. Existing risks were re-graded.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-montserrat font-bold text-lg">{activeTenant.tenant_name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your role here: <strong>{ROLE_LABELS[activeTenant.role]}</strong>. {ROLE_DESCRIPTIONS[activeTenant.role]}
        </p>
      </div>

      <section aria-labelledby="members-heading" className="space-y-3">
        <h4 id="members-heading" className="font-semibold">Members</h4>
        {loading ? (
          <p className="text-sm text-slate-500" role="status">Loading members…</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Members of {activeTenant.tenant_name}</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th scope="col" className="py-2">Name</th>
                <th scope="col" className="py-2">Role</th>
                {isAdmin && <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const self = m.user_id === user?.id;
                return (
                  <tr key={m.user_id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">
                      <span className="font-medium">{m.full_name ?? '—'}</span>
                      {self && <span className="ml-1 text-xs text-slate-500">(you)</span>}
                      <span className="block text-xs text-slate-500">{m.email}</span>
                    </td>
                    <td className="py-2">
                      {isAdmin && !self ? (
                        <select
                          aria-label={`Role for ${m.full_name ?? m.email}`}
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as Role)}
                          className="px-2 py-1 rounded-lg border border-slate-300 bg-transparent text-sm"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      ) : (
                        ROLE_LABELS[m.role]
                      )}
                      {m.status !== 'active' && <span className="ml-2 text-xs text-amber-700">suspended</span>}
                    </td>
                    {isAdmin && (
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove(m)}
                          onBlur={() => setConfirmRemove(null)}
                          className="text-xs font-semibold text-red-700 hover:underline"
                        >
                          {confirmRemove === m.user_id ? 'Select again to remove' : self ? 'Leave' : 'Remove'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!isAdmin && <p className="text-xs text-slate-500">Only administrators can add members or change roles.</p>}
      </section>

      {isAdmin && (
        <form onSubmit={add} className="space-y-2" aria-labelledby="add-member-heading">
          <h4 id="add-member-heading" className="font-semibold">Add a member</h4>
          <p className="text-xs text-slate-500">The person must have signed up already. Enter the email they signed up with.</p>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="member-email">Email</label>
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@organisation.gov.ph"
              className="flex-1 min-w-[14rem] px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm"
            />
            <label className="sr-only" htmlFor="member-role">Role</label>
            <select
              id="member-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm"
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Add member</button>
          </div>
          <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[newRole]}</p>
        </form>
      )}

      <section aria-labelledby="watch-heading" className="space-y-2">
        <h4 id="watch-heading" className="font-semibold">Watch areas</h4>
        <p className="text-xs text-slate-500">
          Provinces whose PAGASA alerts concern this organisation. Their alerts are flagged on the dashboard and in Detection.
          Use the province name as PAGASA writes it; the PSGC code (9 or 10 digits) is optional but makes matching exact.
        </p>
        {areas.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No watch areas yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {areas.map((w) => (
              <li key={w.id} className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-sm">
                <span>{w.label}{w.psgc_code ? <span className="text-xs text-slate-500"> · {w.psgc_code}</span> : null}</span>
                {canWatch && (
                  <button type="button" onClick={() => dropArea(w)} aria-label={`Stop watching ${w.label}`} className="text-xs font-semibold text-red-700">
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canWatch ? (
          <form onSubmit={addArea} className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="watch-label">Province</label>
            <input id="watch-label" list="watch-suggestions" required minLength={2} maxLength={120} value={areaLabel}
              onChange={(e) => setAreaLabel(e.target.value)} placeholder="Province, e.g. Leyte"
              className="flex-1 min-w-[12rem] px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
            <datalist id="watch-suggestions">
              {[...suggestions.keys()].filter((n) => !watched.has(n.toLowerCase())).sort().map((n) => <option key={n} value={n} />)}
            </datalist>
            <label className="sr-only" htmlFor="watch-code">PSGC code (optional)</label>
            <input id="watch-code" inputMode="numeric" pattern="[0-9]{9,10}" value={areaCode} onChange={(e) => setAreaCode(e.target.value)}
              placeholder="PSGC code (optional)" className="w-44 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Add watch area</button>
          </form>
        ) : (
          <p className="text-xs text-slate-500">{needsRole('drrm_officer')}</p>
        )}
      </section>

      <form onSubmit={saveThresholds} className="space-y-2" aria-labelledby="criteria-heading">
        <h4 id="criteria-heading" className="font-semibold">Risk criteria</h4>
        <p className="text-xs text-slate-500">
          A risk's score is likelihood × impact (each 1 to 5, so 1 to 25). These thresholds set its level. Changing
          them re-grades every risk in this organisation.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {(['critical', 'high', 'medium'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <span className="capitalize">{k} from</span>
              <input
                type="number"
                min={k === 'medium' ? 2 : 3}
                max={25}
                required
                disabled={!isAdmin}
                value={thresholds[k]}
                onChange={(e) => setThresholds({ ...thresholds, [k]: Number(e.target.value) })}
                className="w-16 px-2 py-1 rounded-lg border border-slate-300 bg-transparent"
              />
            </label>
          ))}
          <span className="self-center text-slate-500">Below medium is Low.</span>
        </div>
        {isAdmin && (
          <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Save risk criteria</button>
        )}
      </form>
    </div>
  );
};

export default OrganisationSettings;
