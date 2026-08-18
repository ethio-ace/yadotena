"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Camera, QrCode, Upload, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const router = useRouter();
  const { setTableId } = useCustomerDineIn();

  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedResult(null);
      setCameraError(null);
      setManualCode("");
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access failed or unavailable:", err);
      setCameraError("Camera access denied or unequipped. You can enter table number below.");
      setCameraActive(false);
    }
  };

  const processScannedValue = (raw: string) => {
    if (!raw) return;
    setScannedResult(raw);
    stopCamera();

    // Check if raw text is a full URL with ?table= parameter or order URL
    try {
      if (raw.includes("/menu") && raw.includes("table=")) {
        const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
        const tableParam = url.searchParams.get("table");
        if (tableParam) {
          setTableId(tableParam);
          onClose();
          router.push(`/menu?table=${encodeURIComponent(tableParam)}`);
          return;
        }
      } else if (raw.includes("/order/")) {
        const match = raw.match(/\/order\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          onClose();
          router.push(`/order/${encodeURIComponent(match[1])}`);
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    // Direct table code (e.g. "tbl-04" or "4")
    const cleanTable = raw.trim();
    setTableId(cleanTable);
    onClose();
    router.push(`/menu?table=${encodeURIComponent(cleanTable)}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScannedValue(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Scan Table QR Code</h3>
              <p className="text-xs text-muted-foreground">Scan table stand QR to connect mobile ordering</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-center">
          {/* Video Viewfinder */}
          <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden border-2 border-primary/30 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              playsInline
              muted
            />

            {!cameraActive && (
              <div className="p-6 flex flex-col items-center justify-center text-white space-y-3">
                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xs text-neutral-300 max-w-xs font-medium">
                  {cameraError || "Point camera at the table QR code stand to connect."}
                </p>
                <Button
                  onClick={startCamera}
                  className="rounded-full font-bold text-xs px-6 shadow-md shadow-primary/30"
                >
                  Start Camera Scanner
                </Button>
              </div>
            )}

            {/* Viewfinder Target Overlays */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
                <div className="w-full h-full border-2 border-primary border-dashed rounded-2xl relative animate-pulse">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                </div>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2 text-left pt-2">
            <label className="text-xs font-extrabold text-foreground block">
              Or Enter Table Number / Code
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Table 04 or tbl-01"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="rounded-2xl h-11 text-sm bg-muted/20"
              />
              <Button type="submit" className="rounded-2xl font-bold h-11 px-5">
                Connect
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
