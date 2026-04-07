import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DonorDashboard from './dashboards/DonorDashboard';
import NGODashboard from './dashboards/NGODashboard';
import VolunteerDashboard from './dashboards/VolunteerDashboard';

export default function Dashboard() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  switch (userProfile.role) {
    case 'donor':
      return <DonorDashboard />;
    case 'ngo':
      return <NGODashboard />;
    case 'volunteer':
      return <VolunteerDashboard />;
    default:
      return <div>Invalid Role Context</div>;
  }
}
