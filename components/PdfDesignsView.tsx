import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  RefreshCw,
  CheckCircle2,
  X,
  AlertCircle,
  Grid3X3
} from "lucide-react";
import * as api from "../services/apiService";

interface PdfDesign {
  id: string;
  title: string;
  page_count: number;
  field_mappings: string;
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

export const PdfDesignsView: React.FC = () => {
  const [designs, setDesigns] = useState<PdfDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newDesignName, setNewDesignName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mappingDesign, setMappingDesign] = useState<PdfDesign | null>(null);
  const [mappings, setMappings] = useState<{ key: string; label: string; page?: number }[]>([]);
  const [savingMappings, setSavingMappings] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
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
    if (!selectedFile) { setUploadError("Please choose a PDF file."); return; }
    setUploading(true);
    setUploadError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      await api.savePdfDesign({
        title: newDesignName.trim(),
        pdf_file_data: base64,
        page_count: 1,
        is_active: designs.length === 0,
      });
      setNewDesignName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showMsg("Design uploaded successfully!");
      loadDesigns();
    } catch (err) {
      console.error(err);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try { await api.activatePdfDesign(id); showMsg("Design activated."); loadDesigns(); }
    catch { showMsg("Failed to activate design."); }
  };

  const handleDeactivate = async (id: string) => {
    try { await (api as any).deactivatePdfDesign(id); showMsg("Design deactivated."); loadDesigns(); }
    catch { showMsg("Failed to deactivate design."); }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this design? This cannot be undone.")) return;
    try { await api.deletePdfDesign(id); showMsg("Design removed."); loadDesigns(); }
    catch { showMsg("Failed to remove design."); }
  };

  const openMapFields = (design: PdfDesign) => {
    setMappingDesign(design);
    try { setMappings(JSON.parse(design.field_mappings || "[]") || []); }
    catch { setMappings([]); }
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
      showMsg(`${mappings.length} field${mappings.length !== 1 ? "s" : ""} mapped.`);
      setMappingDesign(null);
      loadDesigns();
    } catch { showMsg("Failed to save mappings."); }
    finally { setSavingMappings(false); }
  };

  const getMappingCount = (design: PdfDesign) => {
    try { const arr = JSON.parse(design.field_mappings || "[]"); return Array.isArray(arr) ? arr.length : 0; }
    catch { return 0; }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>PDF designs</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Uploaded proposal designs. Map dynamic fields onto each design, then activate it for agents.
        </p>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {actionMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: Uploaded designs table */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Uploaded designs</h2>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3" style={{ color: "var(--text-muted)" }}>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-xs">Loading designs...</span>
              </div>
            ) : designs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3" style={{ color: "var(--text-muted)" }}>
                <FileText className="w-8 h-8 opacity-30" />
                <span className="text-xs">No designs uploaded yet. Upload your first PDF design</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Design</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pages</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Mapping</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {designs.map((design, idx) => {
                    const mappingCount = getMappingCount(design);
                    const isActive = design.is_active === 1;
                    return (
                      <tr key={design.id} className="border-b" style={{ borderColor: idx === designs.length - 1 ? "transparent" : "var(--border)" }}>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{design.title}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{design.page_count || "—"}</td>
                        <td className="px-4 py-3.5 text-sm">
                          {mappingCount > 0
                            ? <span className="text-emerald-500 font-medium">{mappingCount} field{mappingCount !== 1 ? "s" : ""} mapped</span>
                            : <span style={{ color: "var(--text-muted)" }}>Not mapped</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {isActive
                            ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>
                            : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Inactive</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 text-xs font-medium">
                            <button onClick={() => openMapFields(design)} className="text-emerald-500 hover:underline cursor-pointer">Map fields</button>
                            {isActive
                              ? <button onClick={() => handleDeactivate(design.id)} className="text-amber-500 hover:underline cursor-pointer">Deactivate</button>
                              : <button onClick={() => handleActivate(design.id)} className="text-emerald-500 hover:underline cursor-pointer">Activate</button>}
                            <button onClick={() => handleRemove(design.id)} className="text-rose-500 hover:underline cursor-pointer">Remove</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Upload form */}
        <div className="rounded-xl border p-5 space-y-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upload a design</h2>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Design name<span className="text-rose-500"> *</span>
            </label>
            <input
              type="text"
              value={newDesignName}
              onChange={e => setNewDesignName(e.target.value)}
              placeholder="e.g. Premium Blue 2026"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Design PDF<span className="text-rose-500"> *</span>
            </label>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              The finished artwork exported as PDF — up to 20 MB.
              Dynamic fields are placed on top of it in the next step.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <label
                className="flex items-center px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                Choose File
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
              <span className="text-xs truncate max-w-[130px]" style={{ color: "var(--text-muted)" }}>
                {selectedFile ? selectedFile.name : "No file chosen"}
              </span>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {uploadError}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
            style={{ background: "var(--primary)", color: "#000" }}
          >
            {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload design</>}
          </button>

          <p className="text-[10px] leading-relaxed border-t pt-3" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
            After uploading, click <strong style={{ color: "var(--text-secondary)" }}>Map fields</strong> to assign dynamic placeholders.
          </p>
        </div>
      </div>

      {/* MAP FIELDS MODAL */}
      {mappingDesign && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Map Fields — {mappingDesign.title}</h3>
              </div>
              <button onClick={() => setMappingDesign(null)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Select which dynamic fields should be placed on this PDF design. These will be filled automatically when generating proposal PDFs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_FIELDS.map(field => {
                  const isMapped = mappings.some(m => m.key === field.key);
                  return (
                    <label
                      key={field.key}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all select-none"
                      style={{
                        borderColor: isMapped ? "var(--primary)" : "var(--border)",
                        background: isMapped ? "rgba(198,241,53,0.08)" : "var(--surface-raised)",
                      }}
                    >
                      <input type="checkbox" checked={isMapped} onChange={() => toggleMapping(field)} className="w-3.5 h-3.5 cursor-pointer" />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{field.label}</p>
                        <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{"{{"}{field.key}{"}}"}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                <span>{mappings.length} field{mappings.length !== 1 ? "s" : ""} selected</span>
              </div>
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-3 shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setMappingDesign(null)} className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={saveMappings} disabled={savingMappings} className="px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60 flex items-center gap-2" style={{ background: "var(--primary)", color: "#000" }}>
                {savingMappings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
