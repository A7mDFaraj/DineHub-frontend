"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode as QrCodeIcon, Share2, Copy, Check, Building2, Plus, Loader2 } from "lucide-react";
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [error, setError] = useState("");

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
      setError("Failed to fetch data.");
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
    
    try {
      setIsCreating(true);
      setError("");
      await apiClient.post("/admin/tables", {
        number: parseInt(newTableNumber, 10),
        branchId: selectedBranchId
      });
      setNewTableNumber("");
      await fetchTables(selectedBranchId);
    } catch (err) {
      console.error(err);
      setError("Failed to create table. It may already exist.");
    } finally {
      setIsCreating(false);
    }
  };

  const getStoreUrl = (branchId: string, tableNumber: number) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/${branchId}?table=${tableNumber}`;
    }
    return `https://dinehub.app/${branchId}?table=${tableNumber}`;
  };

  const filteredTables = tables.sort((a, b) => a.number - b.number);

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <QrCodeIcon className="w-7 h-7 text-primary-500" />
            </div>
            Tables & QR Codes
          </h1>
          <p className="text-zinc-400 mt-2">
            Manage tables and generate QR codes for customers to access the digital menu.
          </p>
        </div>
        
        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 px-4">
            <Building2 className="w-5 h-5 text-zinc-400" />
            <select 
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer appearance-none"
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : branches.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center">
          <Building2 className="w-12 h-12 text-zinc-500 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No branches available</h3>
          <p className="text-zinc-400">You need to create a branch before managing tables.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          
          {/* Create Table Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">Add Table</h2>
              <form onSubmit={handleAddTable} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Table Number</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                    placeholder="e.g. 5"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Table
                    </>
                  )}
                </button>
              </form>
            </div>
            
            <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4 flex items-start gap-3">
              <div className="mt-1">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
              </div>
              <p className="text-sm text-primary-100/80 leading-relaxed">
                <strong className="text-primary-400">Pro Tip:</strong> Download the QR codes and print them on acrylic table tents for customers to scan and order.
              </p>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
            <div className="glass-panel flex-1 overflow-y-auto p-6">
              {filteredTables.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <QrCodeIcon className="w-12 h-12 text-zinc-500 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No tables found</h3>
                  <p className="text-zinc-400">Add tables to generate their QR codes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTables.map((table) => (
                    <TableQrCard key={table.id} table={table} url={getStoreUrl(table.branchId, table.number)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableQrCard({ table, url }: { table: Table, url: string }) {
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
      canvas.width = img.width + 80;
      canvas.height = img.height + 120; // Extra height for text
      
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Table text
        ctx.fillStyle = "black";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Table ${table.number}`, canvas.width / 2, 40);
        
        // Draw QR
        ctx.drawImage(img, 40, 60);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `table-${table.number}-qr.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-5 flex items-center gap-6 group hover:border-white/10 transition-colors">
      <div 
        ref={qrRef}
        className="bg-white p-3 rounded-xl shadow-lg ring-1 ring-black/5 shrink-0"
      >
        <QRCodeSVG 
          value={url}
          size={100}
          level={"M"}
          includeMargin={false}
          fgColor="#0a0a0c"
          bgColor="#ffffff"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-bold text-white mb-1">Table {table.number}</h3>
        <p className="text-sm text-zinc-400 truncate mb-4">{url}</p>
        
        <div className="flex gap-2">
          <button 
            onClick={copyToClipboard}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            Copy
          </button>
          <button 
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
