"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { exportDatabase, mergeDatabase } from "@/lib/db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  RefreshCw,
  Send,
  Smartphone,
  CheckCircle2,
  Copy,
  QrCode,
  Camera,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function SyncPage() {
  const router = useRouter();
  const [peerId, setPeerId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "syncing" | "success"
  >("idle");
  const [log, setLog] = useState<string>("Waiting to connect...");
  const [isScanning, setIsScanning] = useState(false);

  const peerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    // Dynamically import PeerJS because it requires the browser `window`
    import("peerjs").then(({ default: Peer }) => {
      if (!active) return;

      const p = new Peer();
      peerRef.current = p;

      p.on("open", (id) => {
        setPeerId(id);
        setLog("Ready! Share this ID with your other device.");
      });

      // When another device connects to US
      p.on("connection", (conn) => {
        setStatus("syncing");
        setLog("Connected to remote peer. Receiving data...");

        conn.on("data", async (data) => {
          try {
            await mergeDatabase(data);
            setLog("Data merged successfully! Sending back our local data...");

            // Send back our data so they can merge it too
            const myData = await exportDatabase();
            conn.send(myData);

            setStatus("success");
            toast.success("Sync completed successfully!");
          } catch (e) {
            console.error(e);
            setLog("Error merging received data.");
            setStatus("idle");
          }
        });

        conn.on("error", () => {
          setLog("Connection error occurred.");
          setStatus("idle");
        });
      });
    });

    return () => {
      active = false;
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  const connectAndSync = async () => {
    if (!peerRef.current || !targetId.trim()) return;
    setStatus("connecting");
    setLog(`Connecting to ${targetId}...`);

    const conn = peerRef.current.connect(targetId.trim());

    conn.on("open", async () => {
      setStatus("syncing");
      setLog("Securely connected! Exporting and sending local data...");

      try {
        // Send our data to them
        const myData = await exportDatabase();
        conn.send(myData);

        // Wait to receive their data back
        conn.on("data", async (data: unknown) => {
          setLog("Receiving their data...");
          await mergeDatabase(data);

          setStatus("success");
          setLog("All data completely synced!");
          toast.success("Sync completed successfully!");
        });
      } catch (err) {
        console.error(err);
        setLog("Error processing sync operation.");
        setStatus("idle");
      }
    });

    conn.on("error", (err: any) => {
      console.error(err);
      setLog("Connection failed. Check the code.");
      setStatus("idle");
    });
  };

  const copyId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      toast.success("Sync Code copied!");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-xl space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sync Devices</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Nootle saves everything purely on this device. To keep your work
          synced across your phone and laptop, ensure both devices are open on
          this page. They will securely connect directly to each other without
          any central servers.
        </p>

        <Card className="border-2 border-primary/20 shadow-sm relative overflow-hidden">
          {status === "success" && (
            <div className="absolute inset-0 bg-emerald-500/10 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-2" />
              <p className="font-bold text-lg text-emerald-600">Synced</p>
            </div>
          )}

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" /> Your Sync Code
            </CardTitle>
            <CardDescription>
              Enter this code on your other device to establish a link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="flex-1 bg-muted p-4 rounded-md font-mono text-center tracking-wider text-xl relative break-all selection:bg-primary selection:text-primary-foreground min-h-[60px] flex items-center justify-center">
                {peerId ? (
                  peerId
                ) : (
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                size="icon"
                className="h-[60px] w-[60px]"
                variant="secondary"
                onClick={copyId}
                disabled={!peerId}
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>
            {peerId && (
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-border/50 mx-auto w-fit">
                <QRCodeSVG value={peerId} size={160} level="H" />
                <p className="text-xs text-muted-foreground mt-3 font-medium text-center">
                  Scan to copy code
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" /> Connect to Device
            </CardTitle>
            <CardDescription>
              Input the code displayed on your other device here to begin the
              synchronization process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {isScanning ? (
                <div className="rounded-xl overflow-hidden bg-black aspect-square relative w-full max-w-sm mx-auto shadow-inner border border-primary/20">
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        setTargetId(result[0].rawValue);
                        setIsScanning(false);
                        toast.success("QR Code scanned successfully!");
                      }
                    }}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-4 right-4 z-10"
                    onClick={() => setIsScanning(false)}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2 py-6 bg-primary/5 hover:bg-primary/10 transition-colors border-dashed border-2"
                  onClick={() => setIsScanning(true)}
                >
                  <Camera className="w-5 h-5" />
                  <span className="font-semibold">
                    Scan QR Code from other device
                  </span>
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">
                    Or
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Paste the target code manually..."
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={status !== "idle"}
                  className="font-mono text-center tracking-widest text-sm"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4 items-stretch">
            <Button
              size="lg"
              className="w-full relative overflow-hidden group"
              onClick={connectAndSync}
              disabled={status !== "idle" || !targetId.trim() || !peerId}
            >
              {status === "idle" && "Start Sync"}
              {status === "connecting" && "Connecting..."}
              {status === "syncing" && (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Transferring
                  Data...
                </span>
              )}
            </Button>
            <div className="text-center text-sm font-medium text-muted-foreground bg-muted p-2 rounded-md">
              Status: {log}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
