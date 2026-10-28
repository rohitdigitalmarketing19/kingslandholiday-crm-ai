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
    <div className="fixed inset-0 z-50 bg-inverse/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-xl max-w-lg w-full p-6 shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-success-strong text-white">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-content text-base">
                Share Quotes & Vouchers Instantly
              </h3>
              <p className="text-sm text-secondary">Formatted for WhatsApp, Email & Customer Portals</p>
            </div>
          </div>

          <button onClick={onClose} className="text-muted hover:text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Editor */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-content">Formatted Message Text:</label>
            <span className="text-xs text-success-ink font-semibold">Ready for WhatsApp Markdown</span>
          </div>

          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-xl bg-canvas border border-line font-mono text-sm text-content leading-relaxed focus:ring-2 focus:ring-success-line/30"
          />

          {/* Quick Sharing Options */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            
            <button
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-subtle hover:bg-hover text-content font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-success-ink" /> : <Copy className="w-4 h-4 text-secondary" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-success-strong hover:bg-success-strong text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleOpenEmail}
              className="py-2.5 px-3 rounded-xl bg-brand hover:bg-brand text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
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
