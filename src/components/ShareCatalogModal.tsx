// src/components/ShareCatalogModal.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Copy, 
  Check, 
  Share2, 
  Mail, 
  MessageCircle, 
  Linkedin, 
  Facebook, 
  Twitter,
  QrCode,
  Download
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ShareCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogLink: string;
  corretorName?: string;
}

export const ShareCatalogModal = ({ open, onOpenChange, catalogLink, corretorName }: ShareCatalogModalProps) => {
  const [copied, setCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(catalogLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Olá! Confira o catálogo de imóveis de ${corretorName || "meu catálogo"}:`);
    const url = encodeURIComponent(catalogLink);
    window.open(`https://wa.me/?text=${text} ${url}`, "_blank");
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(`Olá! Confira o catálogo de imóveis de ${corretorName || "meu catálogo"}:`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(catalogLink)}&text=${text}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Catálogo de Imóveis - ${corretorName || "CRM R2"}`);
    const body = encodeURIComponent(`Olá! Confira os imóveis disponíveis no catálogo de ${corretorName || "nosso catálogo"}:\n\n${catalogLink}\n\nAcesse e encontre o imóvel dos seus sonhos!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaLinkedIn = () => {
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(catalogLink)}&title=${encodeURIComponent(`Catálogo de Imóveis - ${corretorName || "CRM R2"}`)}&summary=${encodeURIComponent(`Confira os imóveis disponíveis no catálogo de ${corretorName || "CRM R2"}.`)}`, "_blank");
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(catalogLink)}`, "_blank");
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(`Confira o catálogo de imóveis de ${corretorName || "CRM R2"}!`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(catalogLink)}`, "_blank");
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: `Catálogo - ${corretorName || "Imóveis"}`,
        text: `Confira os imóveis disponíveis de ${corretorName || "nosso catálogo"}!`,
        url: catalogLink,
      }).catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Erro ao compartilhar:", err);
          copyToClipboard();
        }
      });
    } else {
      copyToClipboard();
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qrcode-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "catalogo_qrcode.png";
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("QR Code baixado!");
      };
      img.src = "data:image/svg+xml," + encodeURIComponent(svgData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#7E22CE]" />
            Compartilhar Catálogo
          </DialogTitle>
          <DialogDescription>
            Compartilhe seu catálogo de imóveis com clientes e parceiros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Link do catálogo */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Link do catálogo</Label>
            <div className="flex gap-2">
              <Input
                value={catalogLink}
                readOnly
                className="bg-slate-50 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0 gap-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> QR Code
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQRCode(!showQRCode)}
                className="text-xs h-6"
              >
                {showQRCode ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            {showQRCode && (
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    id="qrcode-svg"
                    value={catalogLink}
                    size={120}
                    level="H"
                    includeMargin
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQRCode}
                  className="gap-1 text-xs"
                >
                  <Download className="w-3 h-3" />
                  Baixar QR Code
                </Button>
                <p className="text-[10px] text-slate-400 text-center">
                  Escaneie com a câmera do celular para acessar o catálogo
                </p>
              </div>
            )}
          </div>

          {/* Apps de compartilhamento */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-slate-500">Compartilhar via</Label>
            
            <div className="grid grid-cols-4 gap-2">
              {/* WhatsApp */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-green-50 hover:border-green-300"
                onClick={shareViaWhatsApp}
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-[10px]">WhatsApp</span>
              </Button>

              {/* Telegram */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-blue-50 hover:border-blue-300"
                onClick={shareViaTelegram}
              >
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.66-.35-1.02.22-1.61.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2-.07-.06-.17-.04-.24-.02-.1.02-1.75 1.11-4.95 3.27-.47.32-.89.48-1.27.47-.42-.01-1.22-.24-1.82-.43-.74-.24-1.32-.37-1.27-.79.03-.22.33-.44.92-.68 3.57-1.55 5.96-2.57 7.17-3.07 3.42-1.4 4.13-1.64 4.59-1.65.1 0 .33.02.48.15.12.1.16.24.18.38.01.11.02.22.01.33z"/>
                </svg>
                <span className="text-[10px]">Telegram</span>
              </Button>

              {/* E-mail */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-slate-50"
                onClick={shareViaEmail}
              >
                <Mail className="w-5 h-5 text-slate-600" />
                <span className="text-[10px]">E-mail</span>
              </Button>

              {/* Nativo (iOS/Android) */}
              {navigator.share && (
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-purple-50 hover:border-purple-300"
                  onClick={shareNative}
                >
                  <Share2 className="w-5 h-5 text-purple-600" />
                  <span className="text-[10px]">Compartilhar</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* LinkedIn */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-blue-50 hover:border-blue-300"
                onClick={shareViaLinkedIn}
              >
                <Linkedin className="w-5 h-5 text-blue-700" />
                <span className="text-[10px]">LinkedIn</span>
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-blue-50 hover:border-blue-300"
                onClick={shareViaFacebook}
              >
                <Facebook className="w-5 h-5 text-blue-600" />
                <span className="text-[10px]">Facebook</span>
              </Button>

              {/* X (Twitter) */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-slate-50"
                onClick={shareViaTwitter}
              >
                <Twitter className="w-5 h-5 text-slate-700" />
                <span className="text-[10px]">X (Twitter)</span>
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-center text-slate-400 pt-2">
            Compartilhe este link com seus clientes. Eles poderão ver todos os seus imóveis disponíveis.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};