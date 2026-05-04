import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { auth } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { UserProfile } from '../../types';
import Sidebar from '../../components/profile/Sidebar';
import ProfileHeader from '../../components/profile/ProfileHeader';
import Overview from '../../components/profile/sections/Overview';
import PersonalInfo from '../../components/profile/sections/PersonalInfo';
import Verification from '../../components/profile/sections/Verification';
import History from '../../components/profile/sections/History';
import Achievements from '../../components/profile/sections/Achievements';
import Settings from '../../components/profile/sections/Settings';
import toast from 'react-hot-toast';

type SidebarSection =
  | 'overview'
  | 'personal'
  | 'verification'
  | 'history'
  | 'achievements'
  | 'settings';

interface OrganizationProfileProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function OrganizationProfile({
  user,
  onLogout,
}: OrganizationProfileProps) {
  const [activeSection, setActiveSection] = useState<SidebarSection>(
    'overview'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (updatedData: Partial<UserProfile>) => {
    if (!user.uid) return;
    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, updatedData);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    if (!auth.currentUser) throw new Error('Not logged in.');
    try {
      if (password) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || '', password);
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(auth.currentUser, provider);
      }
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(auth.currentUser);
      onLogout();
    } catch (err: any) {
      throw new Error(err.message || 'Re-authentication failed. Please try again.');
    }
  };

  const handleDocumentUpload = async (
    docType: string,
    file: File
  ): Promise<string> => {
    // In a real implementation, upload to Firebase Storage
    // For now, return a mock URL
    console.log('Uploading document:', docType, file);
    return 'mock-url';
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview user={user} />;
      case 'personal':
        return (
          <PersonalInfo
            user={user}
            onSave={handleSaveProfile}
            isLoading={isSaving}
          />
        );
      case 'verification':
        return (
          <Verification
            user={user}
            onDocumentUpload={handleDocumentUpload}
            isLoading={isSaving}
          />
        );
      case 'history':
        return <History user={user} />;
      case 'achievements':
        return <Achievements user={user} />;
      case 'settings':
        return (
          <Settings
            user={user}
            onLogout={onLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={onLogout}
      />

      <div className="ml-64 flex-1 p-8 max-w-6xl mx-auto">
        <ProfileHeader user={user} onEditClick={() => setActiveSection('personal')} />

        {renderSection()}
      </div>
    </div>
  );
}
