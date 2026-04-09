import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DonorDashboard from './dashboards/DonorDashboard';
import OrganizationsDashboard from './dashboards/OrganizationsDashboard';
import VolunteerDashboard from './dashboards/VolunteerDashboard';

export default function Dashboard() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  switch (userProfile.role) {
    case 'donor':
      return <DonorDashboard />;
    case 'organizations':
      return <OrganizationsDashboard />;
    case 'volunteer':
      return <VolunteerDashboard />;
    default:
      return <div>Invalid Role Context</div>;
  }
}
