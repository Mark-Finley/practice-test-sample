'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, UserProfile } from '@/store/auth';
import { api } from '@/services/api';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, setUser, isLoading } = useAuthStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [isAuthenticated, user, isLoading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setIsUpdatingProfile(true);

    try {
      const updated = await api.patch<UserProfile>('/users/me', {
        firstName,
        lastName,
      });
      setUser(updated);
      setProfileSuccess('Profile details successfully updated!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    if (password !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await api.patch('/users/me', {
        password,
      });
      setPassword('');
      setConfirmPassword('');
      setPwSuccess('Password successfully updated!');
    } catch (err: any) {
      setPwError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarSuccess(null);
    setAvatarError(null);
    setIsUploadingAvatar(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const updated = await api.post<UserProfile>('/users/me/avatar', formData);
      setUser(updated);
      setAvatarSuccess('Avatar image updated successfully!');
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload image.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500"></div>
      </div>
    );
  }

  // Navigate back to appropriate workspace dashboard
  const dashboardLink = user.role === 'SYSTEM_ADMIN' || user.role === 'ORG_ADMIN'
    ? '/admin/dashboard'
    : '/dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background blur glows */}
      <div className="absolute top-[-10%] left-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-15%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={dashboardLink} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <span className="text-sm font-bold text-white">A</span>
            </Link>
            <span className="font-semibold tracking-wide text-white">Settings Portal</span>
          </div>

          <div>
            <Link
              href={dashboardLink}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-4xl w-full px-6 py-10">
        <h1 className="text-3xl font-extrabold text-white mb-8 bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-transparent">
          Account Settings
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Avatar Upload Column */}
          <div className="md:col-span-1 flex flex-col items-center p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 h-fit">
            <h3 className="text-sm font-bold text-slate-200 mb-6 w-full text-left">Profile Picture</h3>
            
            <div className="relative group cursor-pointer mb-6" onClick={triggerFileInput}>
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`http://localhost:3001${user.avatarUrl}`}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 group-hover:opacity-85 transition-opacity"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-3xl border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-slate-950/70 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />

            <button
              onClick={triggerFileInput}
              disabled={isUploadingAvatar}
              className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Upload Photo
            </button>

            {avatarError && <p className="mt-4 text-[11px] text-rose-400 text-center">{avatarError}</p>}
            {avatarSuccess && <p className="mt-4 text-[11px] text-emerald-400 text-center">{avatarSuccess}</p>}
          </div>

          {/* Settings forms Column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Profile form */}
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-200 mb-6">Personal Details</h3>
              {profileError && <div className="mb-4 text-xs text-rose-400">{profileError}</div>}
              {profileSuccess && <div className="mb-4 text-xs text-emerald-400">{profileSuccess}</div>}
              
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 font-mono">Email Address (Read Only)</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="block w-full rounded-xl border-0 bg-slate-950/20 py-2.5 px-3.5 text-slate-500 ring-1 ring-inset ring-slate-800/30 text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 transition-all"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password form */}
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-200 mb-6">Security & Password</h3>
              {pwError && <div className="mb-4 text-xs text-rose-400">{pwError}</div>}
              {pwSuccess && <div className="mb-4 text-xs text-emerald-400">{pwSuccess}</div>}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    placeholder="Enter at least 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border-0 bg-slate-950/60 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ring-slate-800/80 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/80 transition-all text-xs"
                    placeholder="Confirm password"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 transition-all"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
