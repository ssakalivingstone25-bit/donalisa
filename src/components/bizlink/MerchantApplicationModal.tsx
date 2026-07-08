import React, { useState, useEffect } from 'react';
import { X, Briefcase, ChevronRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { db } from '@/firebase/config';
import { collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { MerchantApplication } from './MarketplaceTypes';

interface MerchantApplicationModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onApplicationSuccess: () => void;
}

export default function MerchantApplicationModal({
  userId,
  userName,
  userEmail,
  onClose,
  onApplicationSuccess
}: MerchantApplicationModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessType, setBusinessType] = useState('Retail');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingApp, setExistingApp] = useState<MerchantApplication | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // Check if there is already an application
  useEffect(() => {
    const q = query(
      collection(db, 'merchant_applications'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setExistingApp({ id: docSnap.id, ...docSnap.data() } as MerchantApplication);
      } else {
        setExistingApp(null);
      }
      setLoadingCheck(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !businessDescription.trim() || !whatsappNumber.trim()) return;

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'merchant_applications'), {
        userId,
        userName,
        userEmail,
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        businessType,
        whatsappNumber: whatsappNumber.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => {
        onApplicationSuccess();
      }, 2500);
    } catch (err) {
      console.error("Error submitting merchant application:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0b0b10] border border-[#222] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-widest uppercase">Merchant Registration</h3>
              <p className="text-[10px] text-gray-500 font-mono">BIZLINK UGANDA COMMERCIAL PORTAL</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form or Status display */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {loadingCheck ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-xs font-mono text-gray-400">Verifying secure tenant credentials...</span>
            </div>
          ) : success ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto text-2xl animate-bounce">
                ✓
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-xs font-black text-emerald-400 tracking-widest uppercase">Application Submitted!</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                  Your business credentials have been securely logged onto the platform. The landlord (super admin) will review your application soon.
                </p>
              </div>
            </div>
          ) : existingApp ? (
            <div className="py-6 space-y-6">
              <div className="p-5 rounded-2xl bg-cyan-950/10 border border-cyan-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-mono text-cyan-400 uppercase">Application State</h4>
                    <p className="text-sm font-bold text-white mt-0.5">{existingApp.businessName}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono uppercase font-black tracking-wider ${
                    existingApp.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                    existingApp.status === 'approved' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' :
                    existingApp.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                    'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  }`}>
                    {existingApp.status}
                  </span>
                </div>

                <div className="h-px bg-cyan-500/10"></div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Business Type</span>
                    <span className="text-gray-300 font-mono">{existingApp.businessType}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Registered WhatsApp</span>
                    <span className="text-gray-300 font-mono">{existingApp.whatsappNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Submission Date</span>
                    <span className="text-gray-300 font-mono">{new Date(existingApp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {existingApp.status === 'pending' && (
                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center space-y-1">
                  <p className="text-xs font-bold text-gray-300">Under Review</p>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-normal">
                    The Platform Owner is verifying your shop details. Direct message can be initiated if credentials need adjustment.
                  </p>
                </div>
              )}

              {existingApp.status === 'approved' && (
                <div className="p-5 rounded-2xl bg-[#0e1610] border border-emerald-500/20 space-y-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-emerald-400 tracking-wider uppercase">Congratulations, approved!</h5>
                    <p className="text-[10px] text-gray-400 leading-normal font-mono">
                      Your tenant request is approved. Pay the required one-time digital shop setup fee to receive the ready-to-use premium storefront.
                    </p>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 rounded-xl p-3 border border-emerald-500/10">
                    <span className="text-[10px] text-gray-400 font-mono">One-Time Rental Fee</span>
                    <span className="text-xs font-black text-white font-mono">100,000 UGX</span>
                  </div>
                  {/* Payment placeholder button which simulates gateway */}
                  <button 
                    onClick={async () => {
                      try {
                        const applicationRef = doc(db, 'merchant_applications', existingApp.id);
                        await updateDoc(applicationRef, { status: 'paid', paidAt: new Date().toISOString() });
                      } catch (err) {
                        console.error("Payment setup error:", err);
                      }
                    }}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    Simulate Payment (100,000 UGX)
                  </button>
                </div>
              )}

              {existingApp.status === 'paid' && (
                <div className="p-5 rounded-2xl bg-[#090b10] border border-cyan-500/20 space-y-3.5 text-center">
                  <ShieldCheck className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-cyan-400 tracking-wider uppercase">Payment Received & Verified</h5>
                    <p className="text-[10px] text-gray-400 leading-normal font-mono">
                      Your transaction has been securely cleared. Wait for the Landlord (Super Admin) to allocate your customized premium shop template.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  BizLink Uganda allows local Kampala merchants, artisans, and business owners to secure their own virtual storefront within this platform. Submit your request below:
                </p>
              </div>

              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase block tracking-wider">Desired Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mukono Electronics, Kampala Craft Hub"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase block tracking-wider">Business Category</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="Electronics">Electronics & Hardware</option>
                  <option value="Fashion">Fashion & Apparel</option>
                  <option value="Crafts">Artisans, Crafts & Souvenirs</option>
                  <option value="Groceries">Groceries & Produce</option>
                  <option value="Restaurants">Catering & Local Meals</option>
                  <option value="Services">Professional Local Services</option>
                </select>
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase block tracking-wider">WhatsApp Number (For Client Negotiations)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +256 700 123 456"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              {/* Business Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase block tracking-wider">Brief Business Pitch</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tell clients and platform owners what premium products or services you provide..."
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[10px] text-yellow-400/80 leading-normal">
                💡 **Platform Notice**: After registration approval, a physical or digital checkout of 100,000 UGX is required to transfer the complete automated storefront ownership to your account.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Tenant Application</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
