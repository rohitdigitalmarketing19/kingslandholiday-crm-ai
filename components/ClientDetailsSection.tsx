import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Check,
  Send,
  RefreshCw,
  Power,
  Calendar,
  UserCheck,
  User,
  Users,
  Clock,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  ShieldCheck,
  Share2,
  X
} from 'lucide-react';
import {
  fetchClientDetails,
  generateClientDetailsLink,
  toggleClientDetailsLink,
  updateLeadTravellersByAdmin,
  LeadTraveller,
  ClientDetailsAdminResponse
} from '../services/apiService';

interface ClientDetailsSectionProps {
  leadId: string;
  leadTripId?: string;
  leadName?: string;
  leadPhone?: string;
  isAdmin?: boolean;
  onTravellersUpdated?: (travellers: LeadTraveller[]) => void;
}

export const ClientDetailsSection: React.FC<ClientDetailsSectionProps> = ({
  leadId,
  leadTripId,
  leadName,
  leadPhone,
  isAdmin = true,
  onTravellersUpdated
}) => {
  const [data, setData] = useState<ClientDetailsAdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Expiry date input
  const [expiryDate, setExpiryDate] = useState<string>('');

  // Editing Travellers State
  const [isEditingTravellers, setIsEditingTravellers] = useState(false);
  const [editList, setEditList] = useState<LeadTraveller[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetchClientDetails(leadId);
      setData(res);
      if (res.link?.expires_at) {
        setExpiryDate(res.link.expires_at.split('T')[0]);
      }
      if (onTravellersUpdated) {
        onTravellersUpdated(res.travellers || []);
      }
    } catch (err: any) {
      console.error('Failed to load client details:', err);
      setErrorMsg(err.message || 'Failed to load client details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadData();
    }
  }, [leadId]);

  // Construct full public URL
  const getFullPublicUrl = (token: string) => {
    if (typeof window === 'undefined') return `/client-details/${token}`;
    return `${window.location.origin}/client-details/${token}`;
  };

  // Generate or Regenerate Link
  const handleGenerateLink = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await generateClientDetailsLink(leadId, expiryDate || null);
      setSuccessMsg(res.message || 'New link generated successfully.');
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate link.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active / disabled
  const handleToggleActive = async () => {
    if (!data?.link) return;
    setActionLoading(true);
    try {
      const newStatus = !data.link.is_active;
      await toggleClientDetailsLink(leadId, newStatus, expiryDate || null);
      setSuccessMsg(newStatus ? 'Link re-activated.' : 'Link disabled successfully.');
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle link.');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = () => {
    if (!data?.link) return;
    const url = getFullPublicUrl(data.link.token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (!data?.link) return;
    const url = getFullPublicUrl(data.link.token);
    const guestName = data.lead.name || leadName || 'Valued Guest';
    const message = `Hello ${guestName}! 🙏 Warm greetings from Kingsland Holidays.\n\nTo ensure smooth hotel check-ins, vehicle permits, and voucher issuance for your upcoming trip to *${data.lead.destination}* (Ref #${data.lead.trip_id || leadTripId}), please submit your traveller details securely using this official link:\n\n🔗 ${url}\n\nTakes less than 2 minutes. Feel free to reply if you need any assistance!`;

    const rawPhone = leadPhone || data.lead.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = waPhone
      ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  // Start editing travellers
  const handleStartEdit = () => {
    if (data?.travellers && data.travellers.length > 0) {
      setEditList(data.travellers.map(t => ({ ...t })));
    } else {
      // Pre-fill primary from lead
      setEditList([
        {
          type: 'adult',
          name: data?.lead.name || leadName || '',
          mobile: data?.lead.phone || leadPhone || '',
          email: data?.lead.email || '',
          is_primary: true
        }
      ]);
    }
    setIsEditingTravellers(true);
  };

  const handleAddEditRow = () => {
    setEditList(prev => [
      ...prev,
      {
        type: 'adult',
        name: '',
        mobile: '',
        email: '',
        is_primary: false
      }
    ]);
  };

  const handleRemoveEditRow = (idx: number) => {
    if (idx === 0) return; // Cannot remove Traveller 1
    setEditList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTravellers = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await updateLeadTravellersByAdmin(leadId, editList);
      setSuccessMsg('Traveller list updated successfully.');
      setIsEditingTravellers(false);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update travellers.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted font-bold">
        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-ink" />
        Loading client details & link state...
      </div>
    );
  }

  const link = data?.link;
  const isExpired = link?.expires_at ? new Date(link.expires_at).getTime() < Date.now() : false;
  const travellers = data?.travellers || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-danger-soft border border-danger-line flex items-start gap-3 text-danger-ink text-sm animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-danger-ink hover:text-danger-ink">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-success-soft border border-success-line flex items-start gap-3 text-success-ink text-sm animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-success-ink hover:text-success-ink">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Shareable Link Management Card */}
      <div className="bg-surface p-6 rounded-xl border border-line shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <LinkIcon size={16} className="text-brand-ink " />
              <h3 className="text-base font-semibold text-content dark:text-zinc-100 tracking-tight">
                Client Details Shareable Link
              </h3>
              {link && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-sm font-semibold uppercase tracking-wider ${
                    !link.is_active
                      ? 'bg-subtle text-secondary border border-line '
                      : isExpired
                      ? 'bg-danger-soft text-danger-ink border border-danger-line '
                      : link.submitted_at
                      ? 'bg-success-soft text-success-ink border border-success-line '
                      : 'bg-warning-soft text-warning-ink border border-warning-line '
                  }`}
                >
                  {!link.is_active
                    ? 'Disabled'
                    : isExpired
                    ? 'Expired'
                    : link.submitted_at
                    ? 'Submitted by Client ✓'
                    : 'Awaiting Client Submission'}
                </span>
              )}
            </div>
            <p className="text-sm text-secondary mt-0.5">
              Send this secure, unguessable link to the client so they can fill in all traveller names and mobile numbers.
            </p>
          </div>

          {/* Top Action */}
          <div>
            {!link ? (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-brand hover:bg-brand text-white rounded-xl text-sm font-semibold uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Generate Link</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-subtle hover:bg-hover text-content dark:text-zinc-200 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Generate a fresh link and invalidate the old one"
                >
                  <RefreshCw size={13} className={actionLoading ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={actionLoading}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    link.is_active
                      ? 'bg-danger-soft hover:bg-danger-soft text-danger-ink border-danger-line '
                      : 'bg-success-soft hover:bg-success-soft text-success-ink border-success-line '
                  }`}
                >
                  <Power size={13} />
                  <span>{link.is_active ? 'Disable' : 'Enable'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Link Box Display */}
        {link ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 truncate">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                    Public Client Submission URL:
                  </span>
                  <div className="font-mono text-sm font-bold text-brand-ink truncate bg-surface dark:bg-black/60 p-2.5 rounded-xl border border-line select-all">
                    {getFullPublicUrl(link.token)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-inverse hover:bg-inverse text-white rounded-xl text-sm font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-brand-ink" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-sm font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Expiry and Metadata */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-secondary border-t border-line/60 ">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock size={12} className="text-muted" />
                    <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                  </div>

                  {link.submitted_at && (
                    <div className="flex items-center gap-1 text-xs text-success-ink font-bold">
                      <CheckCircle2 size={12} />
                      <span>Submitted: {new Date(link.submitted_at).toLocaleDateString()} at {new Date(link.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {/* Optional Expiry Input */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">Optional Expiry:</span>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={async e => {
                      const val = e.target.value;
                      setExpiryDate(val);
                      try {
                        await toggleClientDetailsLink(leadId, link.is_active, val || null);
                      } catch (_e) {}
                    }}
                    className="bg-surface border border-line rounded-lg px-2.5 py-1 text-sm font-bold text-content dark:text-zinc-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-line rounded-xl p-6">
            <p className="text-sm text-secondary font-medium max-w-md mx-auto mb-3">
              No shareable link has been generated yet for this booking. Click "Generate Link" to create a unique URL to send to the client.
            </p>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-brand hover:bg-brand text-white rounded-xl text-sm font-semibold uppercase tracking-wider shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} />
              <span>Generate Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Submitted Travellers Card */}
      <div className="bg-surface p-6 rounded-xl border border-line shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-brand-ink " />
              <h3 className="text-base font-semibold text-content dark:text-zinc-100 tracking-tight">
                Traveller Roster ({travellers.length})
              </h3>
              <span className="text-sm text-muted">
                (Expected: {data?.lead.expected_adults || 2} Adults, {data?.lead.expected_children || 0} Children)
              </span>
            </div>
            <p className="text-sm text-secondary mt-0.5">
              Passenger list for hotels, permits, driver coordination, and voucher generation.
            </p>
          </div>

          {isAdmin && !isEditingTravellers && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-3.5 py-1.5 bg-subtle hover:bg-hover text-content dark:text-zinc-200 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Edit2 size={13} />
              <span>{travellers.length > 0 ? 'Edit Travellers' : 'Add Travellers Manually'}</span>
            </button>
          )}
        </div>

        {/* Travellers Table / Roster */}
        {!isEditingTravellers ? (
          travellers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase text-xs font-semibold tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Mobile (+91)</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-medium">
                  {travellers.map((trv, idx) => (
                    <tr key={trv.id || idx} className="hover:bg-canvas ">
                      <td className="py-3 px-3 font-mono text-muted">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${
                            trv.type === 'child'
                              ? 'bg-warning-soft text-warning-ink border border-warning-line '
                              : 'bg-brand-soft text-brand-ink border border-brand-line '
                          }`}
                        >
                          {trv.type === 'child' ? 'Child' : 'Adult'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-content dark:text-zinc-100">
                        {trv.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-content dark:text-zinc-300">
                        {trv.mobile ? `+91 ${trv.mobile}` : <span className="text-muted italic">None</span>}
                      </td>
                      <td className="py-3 px-3 text-secondary ">
                        {trv.email || <span className="text-muted italic">None</span>}
                      </td>
                      <td className="py-3 px-3">
                        {trv.is_primary ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success-ink border border-success-line ">
                            Primary Contact
                          </span>
                        ) : (
                          <span className="text-muted text-xs">Co-Traveller</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-line rounded-xl p-6">
              <div className="w-10 h-10 bg-subtle text-muted mx-auto rounded-xl flex items-center justify-center mb-2">
                <Users size={20} />
              </div>
              <p className="text-sm font-bold text-content dark:text-zinc-300">
                No travellers submitted yet
              </p>
              <p className="text-xs text-muted max-w-sm mx-auto mt-0.5 mb-3">
                Send the shareable link to the client, or manually enter passenger names now.
              </p>
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-4 py-2 bg-brand-soft hover:bg-brand-soft text-brand-ink rounded-xl text-sm font-bold transition-all"
              >
                + Add Travellers Manually
              </button>
            </div>
          )
        ) : (
          /* Inline Traveller Editor (Admin) */
          <div className="space-y-4 bg-canvas p-5 rounded-xl border border-line animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-line ">
              <span className="text-sm font-semibold uppercase tracking-wider text-content dark:text-zinc-100">
                Edit Travellers Roster
              </span>
              <button
                type="button"
                onClick={handleAddEditRow}
                className="px-3 py-1 bg-brand hover:bg-brand text-white rounded-lg text-sm font-bold transition-all flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Add Row</span>
              </button>
            </div>

            <div className="space-y-3">
              {editList.map((trv, idx) => (
                <div
                  key={idx}
                  className="bg-surface p-3.5 rounded-xl border border-line grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-sm"
                >
                  <div className="sm:col-span-1 font-mono text-muted font-bold">
                    #{idx + 1}
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      value={trv.type}
                      onChange={e => {
                        const val = e.target.value as 'adult' | 'child';
                        const updated = [...editList];
                        updated[idx].type = val;
                        setEditList(updated);
                      }}
                      className="w-full bg-canvas border border-line rounded-lg px-2 py-1.5 text-sm font-bold text-content dark:text-zinc-100 outline-none"
                    >
                      <option value="adult">Adult</option>
                      <option value="child">Child</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={trv.name}
                      onChange={e => {
                        const updated = [...editList];
                        updated[idx].name = e.target.value;
                        setEditList(updated);
                      }}
                      className="w-full bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-sm font-bold text-content dark:text-zinc-100 outline-none"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <div className="flex items-center bg-canvas border border-line rounded-lg overflow-hidden">
                      <span className="px-2 py-1.5 bg-hover text-xs font-bold text-secondary select-none">
                        +91
                      </span>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder={trv.type === 'adult' ? '10-Digit Mobile *' : 'Mobile (Optional)'}
                        value={trv.mobile || ''}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          const updated = [...editList];
                          updated[idx].mobile = val;
                          setEditList(updated);
                        }}
                        className="w-full bg-transparent px-2 py-1.5 text-sm font-mono font-bold text-content dark:text-zinc-100 outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between gap-1">
                    {idx === 0 ? (
                      <span className="text-xs font-semibold uppercase text-success-ink bg-success-soft px-2 py-1 rounded">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveEditRow(idx)}
                        className="p-1.5 hover:bg-danger-soft text-muted hover:text-danger-ink rounded-lg transition-colors ml-auto"
                        title="Remove traveller"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingTravellers(false)}
                className="px-4 py-2 rounded-xl border border-line text-sm font-bold text-secondary dark:text-zinc-300 hover:bg-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTravellers}
                disabled={actionLoading}
                className="px-6 py-2 bg-success-strong hover:bg-success-strong text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Roster</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailsSection;
