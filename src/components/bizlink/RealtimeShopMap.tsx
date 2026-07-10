import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Compass, PhoneCall, Truck, Play, RotateCcw, Shield } from 'lucide-react';

interface RealtimeShopMapProps {
  shopLocation: string;
  shopName: string;
  themeColor?: string;
}

// Map of physical Kampala location keywords to coordinates
const KAMPALA_LANDMARKS: Record<string, { lat: number; lng: number }> = {
  'kampala arcade': { lat: 0.3125, lng: 32.5795 },
  'ssebaggala arcade': { lat: 0.3138, lng: 32.5810 },
  'ntinda': { lat: 0.3544, lng: 32.6105 },
  'wandegeya': { lat: 0.3292, lng: 32.5714 },
  'makerere': { lat: 0.3320, lng: 32.5700 },
  'kololo': { lat: 0.3392, lng: 32.5991 },
  'nakasero': { lat: 0.3194, lng: 32.5794 },
  'muyenga': { lat: 0.2977, lng: 32.6155 },
  'kabagala': { lat: 0.3015, lng: 32.5982 },
  'rubaga': { lat: 0.3025, lng: 32.5531 }
};

export default function RealtimeShopMap({
  shopLocation,
  shopName,
  themeColor = '#06b6d4'
}: RealtimeShopMapProps) {
  // Resolve coordinates
  const resolvedShopLoc = Object.keys(KAMPALA_LANDMARKS).find(key => 
    shopLocation.toLowerCase().includes(key)
  );
  
  const shopCoords = resolvedShopLoc 
    ? KAMPALA_LANDMARKS[resolvedShopLoc] 
    : { lat: 0.3125, lng: 32.5795 }; // Kampala Central fallback

  // State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 0.3392, lng: 32.5991 }); // Kololo start
  const [bodaCoords, setBodaCoords] = useState<{ lat: number; lng: number }>({ lat: 0.3392, lng: 32.5991 });
  const [isTracking, setIsTracking] = useState(false);
  const [eta, setEta] = useState('12 mins');
  const [distance, setDistance] = useState('2.8 km');
  const [trackingProgress, setTrackingProgress] = useState(0); // 0 to 100 %
  const [bodaStatus, setBodaStatus] = useState<'idle' | 'enroute' | 'arrived'>('idle');

  // Attempt real browser GPS location
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserCoords(coords);
          if (bodaStatus === 'idle') {
            setBodaCoords(coords);
          }
        },
        () => {
          // Fallback if rejected/error
          alert("Unable to fetch high-precision live GPS. Defaulted coordinates to Kampala Central.");
        }
      );
    }
  };

  // Tracking Simulation Interval
  useEffect(() => {
    let interval: any = null;
    if (isTracking && trackingProgress < 100) {
      setBodaStatus('enroute');
      interval = setInterval(() => {
        setTrackingProgress(prev => {
          const next = prev + 4; // increment simulation
          if (next >= 100) {
            clearInterval(interval);
            setBodaStatus('arrived');
            setEta('Arrived at Shop!');
            setDistance('0 meters');
            setIsTracking(false);
            return 100;
          }
          
          // Interpolate current Boda Boda coordinates between User and Shop
          const ratio = next / 100;
          const currentLat = userCoords.lat + (shopCoords.lat - userCoords.lat) * ratio;
          const currentLng = userCoords.lng + (shopCoords.lng - userCoords.lng) * ratio;
          setBodaCoords({ lat: currentLat, lng: currentLng });
          
          // Dynamic calculation
          const remPercent = 100 - next;
          const remainingMinutes = Math.max(1, Math.round((remPercent / 100) * 12));
          const remainingKm = ((remPercent / 100) * 2.8).toFixed(1);
          setEta(`${remainingMinutes} mins`);
          setDistance(`${remainingKm} km`);
          
          return next;
        });
      }, 800);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingProgress, userCoords, shopCoords]);

  const handleResetTracking = () => {
    setIsTracking(false);
    setTrackingProgress(0);
    setBodaCoords(userCoords);
    setBodaStatus('idle');
    setEta('12 mins');
    setDistance('2.8 km');
  };

  const handleStartTracking = () => {
    setTrackingProgress(0);
    setIsTracking(true);
  };

  // Google API Key checking
  const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  return (
    <div className="bg-[#0b0b10] border border-gray-900 rounded-2xl overflow-hidden font-mono text-xs text-gray-300">
      {/* Real-time Dashboard Header */}
      <div className="p-4 bg-[#0e0e14] border-b border-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[7px] text-cyan-400 font-black uppercase tracking-wider block">Live Operations Center</span>
          <h5 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin" />
            Kampala Physical visit guide
          </h5>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDetectLocation}
            className="px-2.5 py-1.5 bg-[#12121a] hover:bg-[#1a1a26] border border-gray-800 hover:border-cyan-500/30 text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer text-[9px]"
          >
            Detect GPS
          </button>
          {!isTracking && bodaStatus !== 'arrived' ? (
            <button
              onClick={handleStartTracking}
              className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer font-black text-[9px]"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              Simulate Path
            </button>
          ) : (
            <button
              onClick={handleResetTracking}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer font-black text-[9px]"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset Tracker
            </button>
          )}
        </div>
      </div>

      {/* Real-time Logistics Tracker Status panel */}
      <div className="grid grid-cols-4 border-b border-gray-900 bg-[#07070b]">
        <div className="p-3 border-r border-gray-900 space-y-0.5">
          <span className="text-[7px] text-gray-500 uppercase block">Courier Status</span>
          <span className={`text-[9px] font-black uppercase block ${
            bodaStatus === 'idle' ? 'text-gray-400' :
            bodaStatus === 'enroute' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
          }`}>
            {bodaStatus === 'idle' ? '⬤ Ready' : bodaStatus === 'enroute' ? '🏍️ Transiting' : '✓ Arrived'}
          </span>
        </div>
        <div className="p-3 border-r border-gray-900 space-y-0.5">
          <span className="text-[7px] text-gray-500 uppercase block">Distance</span>
          <span className="text-white text-[10px] font-bold block">{distance}</span>
        </div>
        <div className="p-3 border-r border-gray-900 space-y-0.5">
          <span className="text-[7px] text-gray-500 uppercase block">ETA Target</span>
          <span className="text-white text-[10px] font-bold block">{eta}</span>
        </div>
        <div className="p-3 space-y-0.5">
          <span className="text-[7px] text-gray-500 uppercase block">Active Link</span>
          <span className="text-cyan-400 text-[10px] font-black block truncate">{resolvedShopLoc ? resolvedShopLoc.toUpperCase() : 'FALLBACK'}</span>
        </div>
      </div>

      {/* Google Map Implementation */}
      <div className="relative w-full h-[260px] bg-slate-950">
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={shopCoords}
              defaultZoom={13}
              gestureHandling={'cooperative'}
              disableDefaultUI={true}
              mapId="bf51a910020fa25b"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Marker 1: Shop */}
              <AdvancedMarker position={shopCoords} title={shopName}>
                <Pin 
                  background={themeColor} 
                  borderColor="#ffffff" 
                  glyphColor="#ffffff" 
                />
              </AdvancedMarker>

              {/* Marker 2: User Location */}
              <AdvancedMarker position={userCoords} title="Your Location">
                <Pin 
                  background="#3b82f6" 
                  borderColor="#ffffff" 
                  glyphColor="#ffffff" 
                />
              </AdvancedMarker>

              {/* Marker 3: Boda Boda Courier (updates coordinates in real-time) */}
              {bodaStatus === 'enroute' && (
                <AdvancedMarker position={bodaCoords} title="Boda Courier">
                  <div className="flex items-center justify-center bg-amber-500 text-black font-bold p-1 rounded-full shadow-lg border border-white animate-bounce">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* High-Fidelity Simulated Map Visualizer (Falls back gracefully when key isn't verified in .env yet) */
          <div className="absolute inset-0 bg-[#0c0c14] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="relative w-full max-w-[320px] aspect-video border border-gray-800 rounded-xl overflow-hidden bg-[#07070a] p-3 flex flex-col justify-between">
              {/* Simulated streets background lines */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-full h-px bg-cyan-400 absolute top-1/4"></div>
                <div className="w-full h-px bg-cyan-400 absolute top-2/3"></div>
                <div className="h-full w-px bg-cyan-400 absolute left-1/3"></div>
                <div className="h-full w-px bg-cyan-400 absolute left-3/4"></div>
                <div className="w-full h-px bg-cyan-400 absolute top-1/2 rotate-12"></div>
              </div>

              {/* Shop Marker */}
              <div 
                className="absolute flex flex-col items-center justify-center transition-all z-10"
                style={{ top: '35%', left: '70%' }}
              >
                <div className="px-2 py-0.5 bg-cyan-950 border border-cyan-500 rounded text-[7px] text-white font-bold uppercase mb-0.5">
                  {shopName}
                </div>
                <div className="w-3.5 h-3.5 bg-cyan-500 rounded-full border-2 border-white flex items-center justify-center text-black font-bold text-[8px]">
                  S
                </div>
              </div>

              {/* User Marker */}
              <div 
                className="absolute flex flex-col items-center justify-center transition-all z-10"
                style={{ top: '75%', left: '20%' }}
              >
                <div className="px-2 py-0.5 bg-blue-950 border border-blue-500 rounded text-[7px] text-white font-bold uppercase mb-0.5">
                  You
                </div>
                <div className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[8px]">
                  U
                </div>
              </div>

              {/* Simulated Boda-Boda Courier on route */}
              {bodaStatus === 'enroute' && (
                <div 
                  className="absolute flex flex-col items-center justify-center transition-all z-20 animate-bounce"
                  style={{ 
                    top: `${75 - (75 - 35) * (trackingProgress / 100)}%`, 
                    left: `${20 + (70 - 20) * (trackingProgress / 100)}%` 
                  }}
                >
                  <div className="px-1.5 py-0.5 bg-amber-950 border border-amber-500 rounded text-[6px] text-white font-bold uppercase mb-0.5">
                    Boda
                  </div>
                  <div className="w-3 h-3 bg-amber-500 rounded-full border border-black flex items-center justify-center text-black font-bold">
                    🏍️
                  </div>
                </div>
              )}

              {/* Simple Legend */}
              <div className="absolute bottom-2 left-2 z-10 flex gap-2 text-[7px] bg-black/70 p-1.5 rounded-lg border border-gray-800">
                <span className="flex items-center gap-1 text-cyan-400">⬤ Shop</span>
                <span className="flex items-center gap-1 text-blue-400">⬤ User</span>
                <span className="flex items-center gap-1 text-amber-400">⬤ Transit</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-amber-500 font-bold bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                Interactive Sandbox active
              </span>
              <p className="text-[10px] text-gray-500 max-w-[340px] leading-normal mx-auto pt-1">
                Real-time tracking visualizer initialized successfully. Enable <strong>GOOGLE_MAPS_PLATFORM_KEY</strong> in settings to activate high-precision satellite layers.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action panel */}
      <div className="p-4 bg-[#09090d]/60 border-t border-gray-900 flex justify-between items-center text-[10px] text-gray-500 font-mono">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Kampala Secure Escrow Transit
        </span>
        <span className="text-white font-bold flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
          Call Boda Driver
        </span>
      </div>
    </div>
  );
}
