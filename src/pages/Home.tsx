import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import L from 'leaflet';
// @ts-ignore
import 'leaflet/dist/leaflet.css';
import { MapPin, Users, Heart, Navigation } from 'lucide-react';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const customMarker = (color: string) =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export default function Home() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [totalMeals, setTotalMeals] = useState(0);
  const [displayedMeals, setDisplayedMeals] = useState(0);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const qDonations = query(collection(db, 'donations'), where('status', '==', 'delivered'));
    const unsubDonations = onSnapshot(qDonations, (snapshot) => {
      let meals = 0;
      snapshot.forEach((doc) => { meals += doc.data().quantityInMeals || 0; });
      setTotalMeals(meals);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const activeUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.location?.lat && u.location?.lng) activeUsers.push(u);
      });
      setUsers(
        activeUsers.length > 0
          ? activeUsers
          : [
              { uid: '1', email: '', role: 'donor', fullName: 'Grand Restaurant', location: { lat: 28.6139, lng: 77.209, address: 'Delhi' }, createdAt: 0 },
              { uid: '2', email: '', role: 'organizations', fullName: 'Hope Foundation', location: { lat: 28.6239, lng: 77.219, address: 'Delhi' }, createdAt: 0 },
              { uid: '3', email: '', role: 'volunteer', fullName: 'John Doe', location: { lat: 28.6039, lng: 77.199, address: 'Delhi' }, createdAt: 0 },
            ]
      );
    });

    return () => { unsubDonations(); unsubUsers(); };
  }, []);

  useEffect(() => {
    if (totalMeals > 0) {
      let start = 0;
      const increment = totalMeals / (2000 / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= totalMeals) { setDisplayedMeals(totalMeals); clearInterval(timer); }
        else { setDisplayedMeals(Math.floor(start)); }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [totalMeals]);

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800 text-gray-300 dark:text-gray-300 py-32 overflow-hidden">

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
          <Heart className="text-brand-500 w-16 h-16 mb-6" />
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-green-400 dark:text-green-400">
            Share Food, Give Hope.
          </h1>
          <p className="max-w-2xl text-xl text-gray-400 dark:text-gray-400 mb-10">
            Join our mission to eliminate food waste and hunger. Connect restaurants with surplus
            food to organizations and volunteers who deliver it directly to those in need.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {userProfile ? (
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-gray-100 rounded-full font-bold text-lg shadow-lg transition-all hover:-translate-y-1"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-gray-100 rounded-full font-bold text-lg shadow-lg transition-all hover:-translate-y-1"
                >
                  Join the Mission
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-gray-200 backdrop-blur-md rounded-full font-bold text-lg transition-all"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Impact Counter ── */}
      <section className="py-14 bg-gray-100 dark:bg-gray-800 transition-colors duration-300 shadow-sm z-20 relative -mt-8 mx-4 sm:mx-8 lg:mx-auto lg:w-full max-w-5xl rounded-3xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center px-6">
          <p className="text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-2">
            Total Impact
          </p>
          <div className="text-6xl md:text-8xl font-black text-brand-600 tabular-nums">
            {displayedMeals.toLocaleString()}+
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mt-4 font-medium">
            Meals Served to the Needy
          </p>

          {/* Impact boxes row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full">
            {[
              { icon: <MapPin size={28} />, color: 'text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30', label: 'Donors', sub: 'Restaurants & Events', path: '/donors' },
              { icon: <Heart size={28} />, color: 'text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/30', label: 'Organizations', sub: 'Distributing food', path: '/organizations' },
              { icon: <Navigation size={28} />, color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30', label: 'Volunteers', sub: 'Delivery partners', path: '/volunteers' },
            ].map(({ icon, color, label, sub, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center justify-between h-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl p-6 gap-3 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${color}`}>
                  {icon}
                </div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-gray-200">{label}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{sub}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-12 lg:mb-0">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-6">
                About Our Mission
              </h2>
              <div className="w-20 h-2 bg-brand-500 rounded-full mb-8"></div>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We believe that no one should go hungry while perfectly good food goes to waste. Our platform serves as a bridge, connecting those with surplus food to those who need it the most.
              </p>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                By bringing together generous restaurants, local businesses, dedicated organizations, and passionate volunteers, we ensure that fresh, nutritious meals are safely collected and delivered directly to the communities that need them.
              </p>
              <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100">
                <p className="text-lg text-brand-800 font-medium italic">
                  "Together, we are not just sharing food—we are delivering hope, building community, and taking a stand against food insecurity."
                </p>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
               <div className="absolute inset-0 bg-brand-600 mix-blend-multiply opacity-20 z-10 transition-opacity group-hover:opacity-10"></div>
               <img 
                 src="/campaign_poster.png" 
                 alt="Food Donation Campaign" 
                 className="w-full h-full object-cover object-center min-h-[450px] transition-transform duration-700 group-hover:scale-105" 
               />
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="flex-grow py-24 bg-slate-50 relative">
      {/* ── Network Map ── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-4">
              Our Growing Network
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              See where our donors, organizations, and volunteers are actively making a difference in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Map */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-3xl shadow-xl h-[500px] transition-colors duration-300 border border-gray-200 dark:border-gray-700">
              <div className="map-container rounded-2xl">
                <MapContainer center={[28.6139, 77.209]} zoom={11} scrollWheelZoom={false}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  {users.map((u) => (
                    <Marker
                      key={u.uid}
                      position={[u.location!.lat, u.location!.lng]}
                      icon={customMarker(
                        u.role === 'donor' ? '#3b82f6' : u.role === 'organizations' ? '#22c55e' : '#eab308'
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
          </div>
        </div>
      </section>

    </div>
  );
}
