"use client";
import { useEffect, useState } from "react";
import { User, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", emailVerified: false, createdAt: "" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/profile").then(r => r.json()).then(d => {
      if (d.merchant) {
        setProfile(d.merchant);
        setName(d.merchant.name);
        setPhone(d.merchant.phone || "");
      }
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setProfileMsg(null);
    const r = await fetch("/api/auth/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) {
      setProfile(p => ({ ...p, name, phone }));
      setProfileMsg({ ok: true, text: "Profile updated successfully." });
    } else {
      setProfileMsg({ ok: false, text: d.error || "Failed to update." });
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "Passwords do not match." }); return; }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
    setChangingPw(true);
    const r = await fetch("/api/auth/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const d = await r.json();
    setChangingPw(false);
    if (d.success) {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwMsg({ ok: true, text: "Password changed successfully." });
    } else {
      setPwMsg({ ok: false, text: d.error || "Failed to change password." });
    }
  }

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400";
  const brand = { background: "linear-gradient(90deg,#ec1f78,#ff6e30)" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={brand}>
          <User size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Manage your account details and password</p>
        </div>
      </div>

      {/* Account info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-xl" style={brand}>
          {profile.name ? profile.name[0].toUpperCase() : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {profile.emailVerified
              ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={11} /> Email verified</span>
              : <span className="text-xs text-amber-600">Email not verified</span>}
            {profile.createdAt && (
              <span className="text-xs text-gray-400">· Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Profile + Password side by side */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Profile form */}
        <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <User size={16} className="text-gray-400" />
            <span className="font-semibold text-gray-800 text-sm">Personal Information</span>
          </div>
          <div className="px-6 py-5 space-y-4">
            {profileMsg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${profileMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {profileMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {profileMsg.text}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inp} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <input value={profile.email} disabled className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`} />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" className={inp} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={brand}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Password form */}
        <form onSubmit={changePassword} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Lock size={16} className="text-gray-400" />
            <span className="font-semibold text-gray-800 text-sm">Change Password</span>
          </div>
          <div className="px-6 py-5 space-y-4">
            {pwMsg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${pwMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {pwMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {pwMsg.text}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Your current password" className={`${inp} pr-10`} required />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters" className={`${inp} pr-10`} required />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password" className={inp} required />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button type="submit" disabled={changingPw}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={brand}>
              {changingPw ? "Updating…" : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
