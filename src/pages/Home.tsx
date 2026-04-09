import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { collection, query, getDocs, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, FoodDonation } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Users, Heart, Navigation } from 'lucide-react';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const customMarker = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function Home() {
  const [totalMeals, setTotalMeals] = useState(0);
  const [displayedMeals, setDisplayedMeals] = useState(0);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    // Listen to real-time donations
    const qDonations = query(collection(db, 'donations'), where('status', '==', 'delivered'));
    const unsubDonations = onSnapshot(qDonations, (snapshot) => {
      let meals = 0;
      snapshot.forEach(doc => {
        meals += doc.data().quantityInMeals || 0;
      });
      setTotalMeals(meals);
    });

    // Listen to real-time users for map
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const activeUsers: UserProfile[] = [];
      snapshot.forEach(doc => {
        const u = doc.data() as UserProfile;
        if (u.location && u.location.lat && u.location.lng) activeUsers.push(u);
      });
      
      // Keep map visual fallback if no real users populate yet
      if (activeUsers.length === 0) {
        setUsers([
          { uid: '1', email: '', role: 'donor', fullName: 'Grand Restaurant', location: { lat: 28.6139, lng: 77.2090, address: 'Delhi' }, createdAt: 0 },
          { uid: '2', email: '', role: 'organizations', fullName: 'Hope Foundation', location: { lat: 28.6239, lng: 77.2190, address: 'Delhi' }, createdAt: 0 },
          { uid: '3', email: '', role: 'volunteer', fullName: 'John Doe', location: { lat: 28.6039, lng: 77.1990, address: 'Delhi' }, createdAt: 0 }
        ]);
      } else {
        setUsers(activeUsers);
      }
    });

    return () => {
      unsubDonations();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    // Animate meals count
    if (totalMeals > 0) {
      let start = 0;
      const duration = 2000;
      const increment = totalMeals / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= totalMeals) {
          setDisplayedMeals(totalMeals);
          clearInterval(timer);
        } else {
          setDisplayedMeals(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [totalMeals]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-dark-900 text-white py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-20">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-slow"></div>
             <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-slow" style={{ animationDelay: '1s'}}></div>
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10 animate-slide-up">
          <Heart className="text-brand-500 w-16 h-16 mb-6" />
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Share Food. <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600">Give Hope.</span>
          </h1>
          <p className="max-w-2xl text-xl text-gray-300 mb-10">
            Join our mission to eliminate food waste and hunger. Connect restaurants with surplus food to organizationss and volunteers who can deliver it directly to those in need.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-brand-500/30 transition-all transform hover:-translate-y-1">
              Join the Mission
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full font-bold text-lg transition-all">
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-16 bg-white shrink-0 shadow-sm z-20 relative -mt-8 mx-4 sm:mx-8 lg:mx-auto max-w-5xl rounded-3xl">
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2">Total Impact</p>
          <div className="text-6xl md:text-8xl font-black text-brand-600 tabular-nums">
            {displayedMeals.toLocaleString()}+
          </div>
          <p className="text-xl text-gray-600 mt-4 font-medium">Meals Served to the Needy</p>
        </div>
      </section>

      {/* Map Section */}
      <section className="flex-grow py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Growing Network</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">See where our donors, organizationss, and volunteers are actively making a difference in real-time.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 bg-white p-4 rounded-3xl shadow-xl h-[500px]">
              <div className="map-container rounded-2xl">
                 <MapContainer 
                    center={[28.6139, 77.2090]} 
                    zoom={11} 
                    scrollWheelZoom={false}
                 >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {users.map(u => (
                      <Marker 
                        key={u.uid} 
                        position={[u.location!.lat, u.location!.lng]}
                        icon={customMarker(
                          u.role === 'donor' ? '#3b82f6' : 
                          u.role === 'organizations' ? '#22c55e' : 
                          '#eab308'
                        )}
                      >
                        <Popup>
                          <div className="font-bold">{u.fullName || u.organizationName}</div>
                          <div className="text-xs uppercase text-gray-500">{u.role}</div>
                        </Popup>
                      </Marker>
                    ))}
                 </MapContainer>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <MapPin />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">Donors</h3>
                  <p className="text-gray-500 text-sm">Restaurants, Hostels</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                  <Heart />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">organizationss</h3>
                  <p className="text-gray-500 text-sm">Distributing food</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0">
                  <Navigation />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">Volunteers</h3>
                  <p className="text-gray-500 text-sm">Active delivery partners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
