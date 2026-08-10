import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare, Mail, Phone, Compass, CheckCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  initialMessage?: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  initialMessage,
  onClose,
}) => {
  if (!isOpen) return null;

  const [message, setMessage] = useState(
    initialMessage ||
    `✈️ *TRIP VOUCHERS & ITINERARY CONFIRMATION*\n\nDear Guest,\nYour post-sales travel documents for booking *LIXKT-9102* (Thailand Phuket & Krabi) are now verified and attached!\n\n🏨 *Hotel Voucher:* Panwaburi Beach Resort (Check-in: 05 Aug)\n🚗 *Private Cab Pickup:* Toyota Commuter (Driver: Somchai +66 81 234 5678)\n\nHave a fantastic journey! For 24/7 ground support, reply directly to this message.\n\n*TravelOps Operations Team*`
  );

  const [copied, setCopied] = useState(false);
  const [markupPercent, setMarkupPercent] = useState<number>(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleOpenEmail = () => {
    const subject = encodeURIComponent('Your Travel Vouchers & Itinerary Confirmation');
    const body = encodeURIComponent(message);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Share Quotes & Vouchers Instantly
              </h3>
              <p className="text-xs text-slate-500">Formatted for WhatsApp, Email & Customer Portals</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Editor */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700">Formatted Message Text:</label>
            <span className="text-[11px] text-emerald-600 font-semibold">Ready for WhatsApp Markdown</span>
          </div>

          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 leading-relaxed focus:ring-2 focus:ring-emerald-500/30"
          />

          {/* Quick Sharing Options */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            
            <button
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleOpenEmail}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};
