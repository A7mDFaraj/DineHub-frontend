"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Download, 
  QrCode as QrCodeIcon, 
  Copy, 
  Check, 
  Building2, 
  Plus, 
  Loader2, 
  Trash2, 
  ExternalLink, 
  Printer, 
  Search,
  Sparkles,
  UtensilsCrossed
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Branch {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
}

interface Table {
  id: string;
  number: number;
  branchId: string;
}

export default function QrCodePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchTables = async (branchId: string) => {
    try {
      const { data } = await apiClient.get(`/admin/tables/${branchId}`);
      setTables(Array.isArray(data) ? data : data?.data || data?.tables || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tables for this branch.");
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const { data } = await apiClient.get("/admin/branches");
      const branchList = Array.isArray(data) ? data : data?.data || data?.branches || [];
      setBranches(branchList);
      
      if (branchList.length > 0) {
        const activeId = selectedBranchId || branchList[0].id;
        setSelectedBranchId(activeId);
        await fetchTables(activeId);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch branches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchId(branchId);
    await fetchTables(branchId);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError("Please select a branch first.");
      return;
    }
    
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num) || num < 1) {
      setError("Please enter a valid table number.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      await apiClient.post("/admin/tables", {
        number: num,
        branchId: selectedBranchId
      });
      setNewTableNumber("");
      setSuccessMsg(`Table #${num} created successfully!`);
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchTables(selectedBranchId);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to create table. It may already exist.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTable = async (tableId: string, tableNumber: number) => {
    if (!confirm(`Are you sure you want to delete Table #${tableNumber}?`)) {
      return;
    }

    try {
      setDeletingId(tableId);
      setError("");
      await apiClient.delete(`/admin/tables/${tableId}`);
      setSuccessMsg(`Table #${tableNumber} deleted successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchTables(selectedBranchId);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete table.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStoreUrl = (branchId: string, tableNumber: number) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/menu/${branchId}/${tableNumber}`;
    }
    return `https://dinehub.app/menu/${branchId}/${tableNumber}`;
  };

  const filteredTables = tables
    .filter(t => searchQuery === "" || t.number.toString().includes(searchQuery))
    .sort((a, b) => a.number - b.number);

  const activeBranchName = branches.find(b => b.id === selectedBranchId)?.name || 
    branches.find(b => b.id === selectedBranchId)?.nameEn || 
    branches.find(b => b.id === selectedBranchId)?.nameAr || "Branch";

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <div className="p-2.5 bg-primary-500/15 border border-primary-500/30 rounded-xl text-primary-400 shrink-0">
              <QrCodeIcon className="w-6 h-6" />
            </div>
            Tables & QR Codes
          </h1>
          <p className="text-zinc-400 mt-1.5 text-xs sm:text-sm max-w-xl leading-relaxed">
            Generate and manage digital menu QR codes for each table. Customers scan with their phones to browse and order directly.
          </p>
        </div>
        
        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 px-4 backdrop-blur-md self-start sm:self-auto w-full sm:w-auto">
            <Building2 className="w-5 h-5 text-primary-400 shrink-0" />
            <select 
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer appearance-none text-sm w-full sm:w-auto pr-6"
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                  {b.name || b.nameEn || b.nameAr || "Branch"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-zinc-400 hover:text-white text-xs ml-4">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : branches.length === 0 ? (
        <div className="glass-panel p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-2xl">
          <Building2 className="w-12 h-12 text-zinc-500 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No branches available</h3>
          <p className="text-zinc-400 text-sm">You need to create a branch before managing tables.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          
          {/* Left Column: Add Table & Guide */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-4">
            <div className="glass-panel p-5 sm:p-6 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-bold text-white font-outfit">Add New Table</h2>
              </div>

              <form onSubmit={handleAddTable} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Table Number
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all font-mono text-lg"
                    placeholder="e.g. 1, 2, 10"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-[0.98]"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Table QR
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Pro Tip Card */}
            <div className="bg-gradient-to-br from-primary-500/10 via-white/[0.02] to-transparent border border-primary-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>How QR Ordering Works</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Each QR code is permanently assigned to a table. You can print them or save high-res PNGs to place on table stands.
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                <span>Active Branch:</span>
                <span className="font-semibold text-white truncate max-w-[140px]">{activeBranchName}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Tables Grid */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-4">
            
            {/* Toolbar */}
            <div className="glass-panel p-3 px-4 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search table number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50"
                />
              </div>

              <div className="text-xs text-zinc-400 flex items-center justify-between sm:justify-end gap-2">
                <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-300 font-mono">
                  {filteredTables.length} {filteredTables.length === 1 ? "Table" : "Tables"}
                </span>
              </div>
            </div>

            {/* Grid Container */}
            {filteredTables.length === 0 ? (
              <div className="glass-panel p-12 text-center flex flex-col items-center justify-center rounded-2xl border border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <UtensilsCrossed className="w-7 h-7 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">
                  {searchQuery ? "No matching tables found" : "No tables yet"}
                </h3>
                <p className="text-zinc-400 text-xs max-w-sm">
                  {searchQuery ? "Try searching for another table number." : "Add table numbers on the left to generate their customer QR codes."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredTables.map((table) => (
                  <TableQrCard 
                    key={table.id} 
                    table={table} 
                    url={getStoreUrl(table.branchId, table.number)}
                    onDelete={() => handleDeleteTable(table.id, table.number)}
                    isDeleting={deletingId === table.id}
                    branchName={activeBranchName}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TableQrCard({ 
  table, 
  url, 
  onDelete, 
  isDeleting,
  branchName
}: { 
  table: Table; 
  url: string; 
  onDelete: () => void;
  isDeleting: boolean;
  branchName: string;
}) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;
      
      if (ctx) {
        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Brand Title
        ctx.fillStyle = "#111827";
        ctx.font = "bold 26px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DineHub Menu", canvas.width / 2, 50);
        
        // Table Number
        ctx.fillStyle = "#d4af37";
        ctx.font = "bold 20px Arial, sans-serif";
        ctx.fillText(`Table #${table.number}`, canvas.width / 2, 85);
        
        // Branch Name
        ctx.fillStyle = "#6b7280";
        ctx.font = "14px Arial, sans-serif";
        ctx.fillText(branchName, canvas.width / 2, 110);
        
        // QR Code centered
        ctx.drawImage(img, 60, 135, 280, 280);

        // Scan instruction
        ctx.fillStyle = "#374151";
        ctx.font = "bold 15px Arial, sans-serif";
        ctx.fillText("Scan with your phone to order", canvas.width / 2, 455);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `dinehub-table-${table.number}-qr.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table #${table.number} QR - DineHub</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .card {
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 24px;
              padding: 40px 32px;
              text-align: center;
              width: 320px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            h1 { margin: 0 0 6px 0; font-size: 26px; color: #111827; }
            .tag {
              display: inline-block;
              background: #fef3c7;
              color: #92400e;
              font-weight: bold;
              padding: 4px 14px;
              border-radius: 9999px;
              font-size: 16px;
              margin-bottom: 8px;
            }
            .branch { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
            .qr { margin: 0 auto 20px; display: inline-block; }
            .footer { font-size: 13px; color: #4b5563; font-weight: 500; }
            @media print {
              body { background: white; }
              .card { border: none; box-shadow: none; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>DineHub</h1>
            <div class="tag">Table #${table.number}</div>
            <div class="branch">${branchName}</div>
            <div class="qr">${qrRef.current?.innerHTML || ""}</div>
            <div class="footer">Scan to browse menu & order</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 hover:border-primary-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all group shadow-sm">
      {/* Top Row: Title, Badge & Delete */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg sm:text-xl font-bold text-white font-outfit">Table #{table.number}</span>
          <span className="text-[10px] bg-primary-500/15 text-primary-400 border border-primary-500/30 px-2 py-0.5 rounded-full font-medium shrink-0">
            Active
          </span>
        </div>

        {/* Delete Button pinned to top right */}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 hover:bg-red-500/15 text-zinc-400 hover:text-red-400 rounded-xl transition-colors shrink-0 disabled:opacity-50"
          title="Delete Table"
          aria-label={`Delete Table ${table.number}`}
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* QR Code Center Box */}
      <div className="flex flex-col items-center justify-center my-2">
        <div 
          ref={qrRef}
          className="bg-white p-3 rounded-2xl shadow-xl ring-1 ring-black/5 transition-transform group-hover:scale-105"
        >
          <QRCodeSVG 
            value={url}
            size={130}
            level={"H"}
            includeMargin={false}
            fgColor="#0a0a0c"
            bgColor="#ffffff"
          />
        </div>
        <p className="text-[11px] text-zinc-400 truncate mt-3 w-full text-center px-2" title={url}>
          {url}
        </p>
      </div>
      
      {/* Action Buttons: 2x2 on mobile, 4 in row when space permits */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-2 border-t border-white/5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium text-zinc-200 hover:text-white transition-colors"
          title="Open Customer Menu"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open</span>
        </a>

        <button 
          onClick={copyToClipboard}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium text-zinc-200 hover:text-white transition-colors"
          title="Copy Menu Link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <button 
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-medium transition-colors"
          title="Download PNG Table Card"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium text-zinc-200 hover:text-white transition-colors"
          title="Print Table Tent"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>
    </div>
  );
}
