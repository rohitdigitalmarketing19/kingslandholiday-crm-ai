import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  RefreshCw,
  CheckCircle2,
  X,
  AlertCircle,
  Grid3X3,
  Palette,
  Eye,
  Sliders
} from "lucide-react";
import * as api from "../services/apiService";

export interface PdfDesign {
  id: string;
  title: string;
  page_count: number;
  field_mappings: string;
  theme_preset?: string;
  primary_color?: string;
  secondary_color?: string;
  header_banner_url?: string;
  agency_stamp_url?: string;
  signature_url?: string;
  watermark_text?: string;
  font_family?: string;
  cover_style?: string;
  is_active: number;
  created_at: string;
}

const AVAILABLE_FIELDS = [
  { key: "customer_name", label: "Customer Name" },
  { key: "trip_id", label: "Trip / Lead ID" },
  { key: "destination", label: "Destination" },
  { key: "package_title", label: "Package Title" },
  { key: "travel_date", label: "Travel Date" },
  { key: "duration", label: "Duration (Nights/Days)" },
  { key: "travelers", label: "Travelers (Adults/Children)" },
  { key: "total_price", label: "Total Price" },
  { key: "agency_name", label: "Agency Name" },
  { key: "agent_name", label: "Agent Name" },
  { key: "proposal_date", label: "Proposal Date" },
  { key: "validity_date", label: "Valid Until" },
  { key: "hotel_category", label: "Hotel Category" },
  { key: "transport_type", label: "Transport Type" },
  { key: "gst_number", label: "GST Number" },
  { key: "inclusions", label: "Inclusions Summary" },
  { key: "exclusions", label: "Exclusions Summary" },
  { key: "terms", label: "Terms and Conditions" },
];

const THEME_PRESETS = [
  { id: "royal_gold", name: "Royal Heritage & Gold", primary: "#d4af37", secondary: "#1e1b18", font: "Playfair Display" },
  { id: "minimal_dark", name: "Executive Matte Dark & Lime", primary: "#c6f135", secondary: "#161713", font: "Outfit" },
  { id: "royal_burgundy", name: "Royal Burgundy & Gold", primary: "#e11d48", secondary: "#881337", font: "Cinzel" },
  { id: "emerald_alpine", name: "Alpine Emerald Clean", primary: "#059669", secondary: "#064e3b", font: "Inter" },
  { id: "ocean_blue", name: "Sapphire Ocean Blue", primary: "#2563eb", secondary: "#0f172a", font: "Work Sans" },
  { id: "classic_navy", name: "Classic Navy & Slate", primary: "#3A6EA5", secondary: "#12233D", font: "IBM Plex Serif" }
];

export const PdfDesignsView: React.FC = () => {
  const [designs, setDesigns] = useState<PdfDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newDesignName, setNewDesignName] = useState("");
  const [newThemePreset, setNewThemePreset] = useState("royal_gold");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field Mapping Modal
  const [mappingDesign, setMappingDesign] = useState<PdfDesign | null>(null);
  const [mappings, setMappings] = useState<{ key: string; label: string; page?: number }[]>([]);
  const [savingMappings, setSavingMappings] = useState(false);

  // Customization & Style Edit Modal
  const [editingDesign, setEditingDesign] = useState<PdfDesign | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    theme_preset: string;
    primary_color: string;
    secondary_color: string;
    font_family: string;
    watermark_text: string;
    header_banner_url: string;
    agency_stamp_url: string;
    cover_style: string;
  }>({
    title: "",
    theme_preset: "royal_gold",
    primary_color: "#d4af37",
    secondary_color: "#1e1b18",
    font_family: "Playfair Display",
    watermark_text: "KINGSLAND HOLIDAYS",
    header_banner_url: "",
    agency_stamp_url: "",
    cover_style: "Modern Grid"
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Preview Modal
  const [previewDesign, setPreviewDesign] = useState<PdfDesign | null>(null);

  const [actionMsg, setActionMsg] = useState("");

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const all = await api.fetchPdfDesigns();
      if (Array.isArray(all)) setDesigns(all);
    } catch (err) {
      console.error("Error fetching PDF designs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDesigns(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setUploadError("Only PDF files are accepted."); return; }
    if (file.size > 20 * 1024 * 1024) { setUploadError("File must be under 20 MB."); return; }
    setUploadError("");
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!newDesignName.trim()) { setUploadError("Please enter a design name."); return; }
    setUploading(true);
    setUploadError("");
    try {
      let base64 = "";
      if (selectedFile) {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      const preset = THEME_PRESETS.find(p => p.id === newThemePreset) || THEME_PRESETS[0];

      await api.savePdfDesign({
        title: newDesignName.trim(),
        pdf_file_data: base64,
        page_count: 1,
        theme_preset: preset.id,
        primary_color: preset.primary,
        secondary_color: preset.secondary,
        font_family: preset.font,
        watermark_text: "KINGSLAND HOLIDAYS",
        is_active: designs.length === 0,
      });

      setNewDesignName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showMsg("Design created and added successfully!");
      loadDesigns();
    } catch (err) {
      console.error(err);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.activatePdfDesign(id);
      showMsg("Design activated! All new proposal and itinerary PDFs will use this design.");
      loadDesigns();
    } catch {
      showMsg("Failed to activate design.");
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await (api as any).deactivatePdfDesign(id);
      showMsg("Design deactivated.");
      loadDesigns();
    } catch {
      showMsg("Failed to deactivate design.");
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this design? This cannot be undone.")) return;
    try {
      await api.deletePdfDesign(id);
      showMsg("Design removed.");
      loadDesigns();
    } catch {
      showMsg("Failed to remove design.");
    }
  };

  const openMapFields = (design: PdfDesign) => {
    setMappingDesign(design);
    try {
      setMappings(JSON.parse(design.field_mappings || "[]") || []);
    } catch {
      setMappings([]);
    }
  };

  const toggleMapping = (field: { key: string; label: string }) => {
    setMappings(prev => {
      const exists = prev.find(m => m.key === field.key);
      if (exists) return prev.filter(m => m.key !== field.key);
      return [...prev, { key: field.key, label: field.label, page: 1 }];
    });
  };

  const saveMappings = async () => {
    if (!mappingDesign) return;
    setSavingMappings(true);
    try {
      await (api as any).updatePdfDesignMappings(mappingDesign.id, mappings);
      showMsg(`${mappings.length} field${mappings.length !== 1 ? "s" : ""} mapped onto ${mappingDesign.title}.`);
      setMappingDesign(null);
      loadDesigns();
    } catch {
      showMsg("Failed to save mappings.");
    } finally {
      setSavingMappings(false);
    }
  };

  const openEditDesign = (design: PdfDesign) => {
    setEditingDesign(design);
    setEditForm({
      title: design.title || "",
      theme_preset: design.theme_preset || "royal_gold",
      primary_color: design.primary_color || "#d4af37",
      secondary_color: design.secondary_color || "#1e1b18",
      font_family: design.font_family || "Playfair Display",
      watermark_text: design.watermark_text || "KINGSLAND HOLIDAYS",
      header_banner_url: design.header_banner_url || "",
      agency_stamp_url: design.agency_stamp_url || "",
      cover_style: design.cover_style || "Modern Grid"
    });
  };

  const saveEditDesign = async () => {
    if (!editingDesign) return;
    setSavingEdit(true);
    try {
      await api.savePdfDesign({
        id: editingDesign.id,
        ...editForm,
        is_active: editingDesign.is_active === 1
      });
      showMsg(`Design "${editForm.title}" styling updated successfully!`);
      setEditingDesign(null);
      loadDesigns();
    } catch {
      showMsg("Failed to update design styling.");
    } finally {
      setSavingEdit(false);
    }
  };

  const getMappingCount = (design: PdfDesign) => {
    try {
      const arr = JSON.parse(design.field_mappings || "[]");
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <Palette className="w-6 h-6 text-lime-400" />
            PDF & Itinerary Designs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Configure and activate proposal and itinerary PDF designs. The active design will be automatically used when generating customer proposals.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {actionMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: Uploaded designs table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border overflow-hidden shadow-lg" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-lime-400" />
                <h2 className="text-sm font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>Available Itinerary Designs</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-medium">
                {designs.length} Design{designs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3" style={{ color: "var(--text-muted)" }}>
                <RefreshCw className="w-6 h-6 animate-spin text-lime-400" />
                <span className="text-xs font-semibold">Loading designs...</span>
              </div>
            ) : designs.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3" style={{ color: "var(--text-muted)" }}>
                <FileText className="w-10 h-10 opacity-30" />
                <span className="text-sm font-semibold">No designs found. Create or upload your first PDF design.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-900/40" style={{ borderColor: "var(--border)" }}>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Design Name & Theme</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Colors</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Mapping</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {designs.map((design) => {
                      const mappingCount = getMappingCount(design);
                      const isActive = design.is_active === 1;
                      const primaryCol = design.primary_color || "#3A6EA5";
                      const secondaryCol = design.secondary_color || "#12233D";

                      return (
                        <tr key={design.id} className={`transition-colors ${isActive ? 'bg-lime-500/5' : 'hover:bg-slate-800/30'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
                                style={{ background: secondaryCol, borderColor: primaryCol, color: primaryCol }}
                              >
                                🎨
                              </div>
                              <div>
                                <span className="font-bold text-sm block" style={{ color: "var(--text-primary)" }}>{design.title}</span>
                                <span className="text-[11px] font-medium text-slate-400">
                                  {design.font_family || 'Standard Serif'} · {design.watermark_text || 'Kingsland'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full border border-slate-700 shadow-inner" style={{ backgroundColor: secondaryCol }} title={`Header/Base: ${secondaryCol}`} />
                              <span className="w-5 h-5 rounded-full border border-slate-700 shadow-inner" style={{ backgroundColor: primaryCol }} title={`Accent: ${primaryCol}`} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs font-medium">
                            {mappingCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ {mappingCount} fields
                              </span>
                            ) : (
                              <span className="text-slate-500">Auto (18 fields)</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-lime-400/15 text-lime-400 border border-lime-400/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-400 border border-slate-700 bg-slate-800/40">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 text-xs font-semibold">
                              <button
                                onClick={() => openEditDesign(design)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                                title="Customize Theme Colors & Layout"
                              >
                                <Sliders className="w-3.5 h-3.5 text-lime-400" />
                                <span>Style</span>
                              </button>

                              <button
                                onClick={() => openMapFields(design)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                                title="Map dynamic fields"
                              >
                                <Grid3X3 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Fields</span>
                              </button>

                              {isActive ? (
                                <button
                                  onClick={() => handleDeactivate(design.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-pointer transition-all"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(design.id)}
                                  className="px-3 py-1.5 rounded-lg bg-lime-400 text-black font-bold hover:bg-lime-300 cursor-pointer transition-all shadow-xs"
                                >
                                  Activate
                                </button>
                              )}

                              <button
                                onClick={() => handleRemove(design.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                                title="Delete design"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-300">
              <strong className="text-white block mb-0.5">How Itinerary Designs Work:</strong>
              When you click <strong className="text-lime-400">Activate</strong> on a design, all proposal previews and downloaded Itinerary PDFs across the CRM immediately adapt to that design's theme, colors, typography, watermark, and dynamic fields.
            </div>
          </div>
        </div>

        {/* RIGHT: Upload / Create Design form */}
        <div className="rounded-2xl border p-6 space-y-5 shadow-lg" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <Palette className="w-4 h-4 text-lime-400" />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Add / Upload New Design</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Design Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newDesignName}
              onChange={e => setNewDesignName(e.target.value)}
              placeholder="e.g. Royal Heritage 2026"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border transition-all"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Theme Preset
            </label>
            <div className="grid grid-cols-1 gap-2">
              {THEME_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setNewThemePreset(preset.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${newThemePreset === preset.id ? 'border-lime-400 bg-lime-400/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: preset.primary }} />
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{preset.font}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Optional Design PDF Artwork
            </label>
            <p className="text-xs leading-relaxed text-slate-400">
              Upload custom background PDF template (up to 20 MB).
            </p>
            <div className="flex items-center gap-3 mt-2">
              <label
                className="flex items-center px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer bg-slate-800 hover:bg-slate-700 text-white transition-all shadow-xs"
                style={{ borderColor: "var(--border)" }}
              >
                Choose PDF File
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
              <span className="text-xs truncate max-w-[140px] text-slate-400">
                {selectedFile ? selectedFile.name : "No file chosen"}
              </span>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {uploadError}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs uppercase tracking-widest font-black transition-all cursor-pointer disabled:opacity-60 bg-lime-400 hover:bg-lime-300 text-black shadow-lg"
          >
            {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating Design...</> : <><Upload className="w-4 h-4" /> Save & Add Design</>}
          </button>
        </div>
      </div>

      {/* EDIT STYLE MODAL */}
      {editingDesign && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-700 bg-slate-900 text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-lime-400" />
                <h3 className="text-base font-bold text-white">Customize Style — {editingDesign.title}</h3>
              </div>
              <button onClick={() => setEditingDesign(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Design Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white outline-none focus:border-lime-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Primary Accent Color</label>
                  <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-2">
                    <input
                      type="color"
                      value={editForm.primary_color}
                      onChange={e => setEditForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={editForm.primary_color}
                      onChange={e => setEditForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Header / Secondary Color</label>
                  <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-2">
                    <input
                      type="color"
                      value={editForm.secondary_color}
                      onChange={e => setEditForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={editForm.secondary_color}
                      onChange={e => setEditForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Typography / Font Family</label>
                <select
                  value={editForm.font_family}
                  onChange={e => setEditForm(prev => ({ ...prev, font_family: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white outline-none focus:border-lime-400 cursor-pointer"
                >
                  <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                  <option value="Cinzel">Cinzel (Royal Heritage)</option>
                  <option value="Outfit">Outfit (Modern Sans-Serif)</option>
                  <option value="Inter">Inter (Clean Modern)</option>
                  <option value="Work Sans">Work Sans (Corporate Clean)</option>
                  <option value="IBM Plex Serif">IBM Plex Serif (Editorial Classic)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Watermark Text</label>
                <input
                  type="text"
                  value={editForm.watermark_text}
                  onChange={e => setEditForm(prev => ({ ...prev, watermark_text: e.target.value }))}
                  placeholder="e.g. KINGSLAND HOLIDAYS"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white outline-none focus:border-lime-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Header Banner Image URL (Optional)</label>
                <input
                  type="text"
                  value={editForm.header_banner_url}
                  onChange={e => setEditForm(prev => ({ ...prev, header_banner_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingDesign(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEditDesign}
                disabled={savingEdit}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-lime-400 hover:bg-lime-300 cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-lg"
              >
                {savingEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAP FIELDS MODAL */}
      {mappingDesign && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-700 bg-slate-900 text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-lime-400" />
                <h3 className="text-base font-bold text-white">Map Dynamic Fields — {mappingDesign.title}</h3>
              </div>
              <button onClick={() => setMappingDesign(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <p className="text-xs leading-relaxed text-slate-400">
                Select which dynamic placeholders will be injected into this proposal template when generating PDFs for clients.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_FIELDS.map(field => {
                  const isMapped = mappings.some(m => m.key === field.key);
                  return (
                    <label
                      key={field.key}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none ${isMapped ? 'border-lime-400 bg-lime-400/10 text-white' : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'}`}
                    >
                      <input type="checkbox" checked={isMapped} onChange={() => toggleMapping(field)} className="w-4 h-4 cursor-pointer accent-lime-400" />
                      <div>
                        <p className="text-xs font-bold text-white">{field.label}</p>
                        <p className="text-[10px] font-mono text-slate-400">{"{{"}{field.key}{"}}"}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                <span>{mappings.length} field{mappings.length !== 1 ? "s" : ""} selected for dynamic insertion</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => setMappingDesign(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer">
                Cancel
              </button>
              <button onClick={saveMappings} disabled={savingMappings} className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-lime-400 hover:bg-lime-300 cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-lg">
                {savingMappings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Mappings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfDesignsView;
