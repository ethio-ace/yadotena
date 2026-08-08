"use client";

import { useState } from "react";
import { Table } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, Printer, ExternalLink, Copy, Check, QrCode, Sparkles, 
  UtensilsCrossed, ShieldCheck 
} from "lucide-react";

interface TableQRModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TableQRModal({ table, isOpen, onClose }: TableQRModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !table) return null;

  // In production this uses window.location.origin, fallback to localhost for preview
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const tableUrl = `${origin}/menu?table=${table.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Table QR Stand Generator</h3>
              <p className="text-xs text-muted-foreground">Printable acrylic stand insert for {table.name}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Printable Stand Card Preview */}
        <div className="p-6 flex flex-col items-center">
          
          <div 
            id="printable-stand" 
            className="w-full max-w-sm bg-gradient-to-b from-card to-muted/30 border-2 border-primary/20 rounded-3xl p-6 flex flex-col items-center text-center shadow-xl space-y-4 relative overflow-hidden"
          >
            {/* Ambient gold glow behind QR */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Restaurant Logo Header */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-base shadow-md shadow-primary/25">
                🥛
              </div>
              <span className="font-black text-lg tracking-tight">Yadotena Milk & Foods</span>
            </div>

            {/* Table Badge */}
            <div className="bg-primary/15 border border-primary/30 px-4 py-1.5 rounded-full">
              <span className="text-sm font-extrabold text-primary">
                {table.name} · Seated Dining
              </span>
            </div>

            {/* QR Code Container with SVG matrix */}
            <div className="p-4 bg-white rounded-2xl shadow-md border border-neutral-200 relative group">
              <svg 
                viewBox="0 0 100 100" 
                className="w-44 h-44 fill-neutral-900"
                shapeRendering="crispEdges"
              >
                {/* QR Finder Top Left */}
                <rect x="0" y="0" width="28" height="28" fill="#18181b" rx="4" />
                <rect x="4" y="4" width="20" height="20" fill="white" rx="2" />
                <rect x="8" y="8" width="12" height="12" fill="#e11d48" rx="2" />

                {/* QR Finder Top Right */}
                <rect x="72" y="0" width="28" height="28" fill="#18181b" rx="4" />
                <rect x="76" y="4" width="20" height="20" fill="white" rx="2" />
                <rect x="80" y="8" width="12" height="12" fill="#e11d48" rx="2" />

                {/* QR Finder Bottom Left */}
                <rect x="0" y="72" width="28" height="28" fill="#18181b" rx="4" />
                <rect x="4" y="76" width="20" height="20" fill="white" rx="2" />
                <rect x="8" y="80" width="12" height="12" fill="#e11d48" rx="2" />

                {/* Data Matrix Bits */}
                <rect x="36" y="8" width="8" height="8" fill="#18181b" />
                <rect x="52" y="8" width="12" height="8" fill="#18181b" />
                <rect x="36" y="24" width="12" height="8" fill="#18181b" />
                <rect x="8" y="36" width="8" height="12" fill="#18181b" />
                <rect x="24" y="36" width="12" height="8" fill="#18181b" />
                <rect x="44" y="36" width="12" height="12" fill="#18181b" />
                <rect x="64" y="36" width="8" height="12" fill="#18181b" />
                <rect x="80" y="36" width="12" height="8" fill="#18181b" />
                <rect x="8" y="56" width="12" height="8" fill="#18181b" />
                <rect x="28" y="56" width="8" height="12" fill="#18181b" />
                <rect x="44" y="56" width="16" height="8" fill="#18181b" />
                <rect x="68" y="56" width="12" height="12" fill="#18181b" />
                <rect x="36" y="72" width="12" height="8" fill="#18181b" />
                <rect x="56" y="72" width="8" height="12" fill="#18181b" />
                <rect x="72" y="72" width="12" height="12" fill="#18181b" />
                <rect x="40" y="88" width="16" height="8" fill="#18181b" />
                <rect x="64" y="88" width="8" height="8" fill="#18181b" />
                <rect x="80" y="88" width="12" height="8" fill="#18181b" />

                {/* Center Badge */}
                <circle cx="50" cy="50" r="11" fill="white" />
                <circle cx="50" cy="50" r="9" fill="#e11d48" />
                <text x="50" y="54" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">Y</text>
              </svg>
            </div>

            {/* Instruction */}
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-foreground">
                Scan with Phone Camera to Order
              </h4>
              <p className="text-xs text-muted-foreground">
                Browse menu · Custom orders · Contactless service
              </p>
            </div>

            {/* Capacity & WiFi Note */}
            <div className="pt-2 border-t border-muted/50 w-full flex items-center justify-around text-[11px] text-muted-foreground">
              <span>🪑 {table.capacity} Guest Seats</span>
              <span>📶 Guest WiFi: Yadotena_Milk_5G</span>
            </div>

          </div>

          {/* Quick Action Buttons */}
          <div className="w-full space-y-2.5 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl font-bold flex items-center justify-center gap-2 h-11"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "Link Copied!" : "Copy URL"}</span>
              </Button>

              <a 
                href={tableUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="w-full"
              >
                <Button 
                  variant="secondary" 
                  className="w-full rounded-2xl font-bold flex items-center justify-center gap-2 h-11"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Test Session</span>
                </Button>
              </a>
            </div>

            <Button 
              className="w-full rounded-2xl font-bold h-12 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span>Print Table Stand Insert (PDF)</span>
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}
