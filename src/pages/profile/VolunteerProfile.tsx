import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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

interface VolunteerProfileProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function VolunteerProfile({
  user,
  onLogout,
}: VolunteerProfileProps) {
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

  const handleDocumentUpload = async (
    docType: string,
    file: File
  ): Promise<string> => {
    // In a real implementation, upload to Firebase Storage
    // For now, return a mock URL
    console.log('Uploading document:', docType, file);
    return 'mock-url';
  };

  const handleAvailabilityToggle = async (available: boolean) => {
    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isAvailable: available,
        lastAvailabilityToggle: Date.now(),
      });
      toast.success(
        `You are now ${available ? 'available' : 'unavailable'}`
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to update availability');
      throw error;
    } finally {
      setIsSaving(false);
    }
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
            onAvailabilityToggle={handleAvailabilityToggle}
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
