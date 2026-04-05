/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Send, 
  User, 
  Bot, 
  Sparkles, 
  GraduationCap, 
  Globe, 
  Cpu, 
  Palette, 
  Briefcase,
  ChevronRight,
  RefreshCcw,
  BookOpen,
  BarChart3,
  Video,
  Loader2,
  MousePointer2,
  Share2,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  User as FirebaseUser,
  isFirebaseConfigured
} from './firebase';
import { getCareerGuidance, generateCareerVideo, UserProfile } from './services/geminiService';
import { cn } from './lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
  chartData?: any[];
  trendsData?: any[];
}

interface ClickPoint {
  id: number;
  position: [number, number, number];
  color: string;
  scale: number;
  rotationSpeed: number;
  type: 'main' | 'particle';
}

const SUGGESTIONS = [
  { icon: Globe, label: "Interested in Geopolitics", prompt: "I'm really interested in geopolitics and international relations. What careers and degrees should I consider? Also, how can I start a consultancy in this field?" },
  { icon: Cpu, label: "Love Technology & AI", prompt: "I love technology and I'm fascinated by AI. What's the best path for me to become an AI engineer? What are the salary prospects for seniors?" },
  { icon: BookOpen, label: "Passionate about Science", prompt: "I'm passionate about biological sciences. What are some modern career paths beyond just being a doctor? What's the future of biotech?" },
  { icon: Briefcase, label: "Pro Sports Career", prompt: "I want to be a professional athlete or work in sports management. Which countries are best for football, and what are the club opportunities?" },
];

const LOADING_MESSAGES = [
  "Analyzing global job market trends...",
  "Calculating salary projections...",
  "Mapping out educational pathways...",
  "Evaluating AI impact on this sector...",
  "Drafting business management tips...",
  "Searching for top sports academies...",
  "Synthesizing your career roadmap...",
];

// 3D Component for Click Interaction
function FloatingObject({ point }: { point: ClickPoint }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    // Entrance animation with elastic effect
    let frame: number;
    let velocity = 0;
    const stiffness = 0.1;
    const damping = 0.8;
    let currentScale = 0;

    const animate = () => {
      const force = (point.scale - currentScale) * stiffness;
      velocity = (velocity + force) * damping;
      currentScale += velocity;
      
      setScale(currentScale);

      if (Math.abs(point.scale - currentScale) > 0.001 || Math.abs(velocity) > 0.001) {
        frame = requestAnimationFrame(animate);
      } else {
        setScale(point.scale);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [point.scale]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * point.rotationSpeed) * 0.2;
      meshRef.current.rotation.y += 0.01 * point.rotationSpeed;
      
      // Subtle color pulse
      if (point.type === 'main') {
        const pulse = (Math.sin(state.clock.getElapsedTime() * 2) + 1) * 0.2;
        (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + pulse;
      }
    }
  });

  return (
    <Float speed={point.type === 'main' ? 2 : 5} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={meshRef} position={point.position} scale={scale}>
        {point.type === 'main' ? (
          <octahedronGeometry args={[0.5, 0]} />
        ) : (
          <sphereGeometry args={[0.1, 8, 8]} />
        )}
        <meshStandardMaterial 
          color={point.color} 
          emissive={point.color} 
          emissiveIntensity={0.5}
          transparent={point.type === 'particle'}
          opacity={point.type === 'particle' ? 0.6 : 1}
        />
      </mesh>
    </Float>
  );
}

// 3D Bird Component
function Bird({ target }: { target: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const currentPos = useRef(new THREE.Vector3(0, 2, 0));

  useFrame((state) => {
    if (groupRef.current) {
      // Smoothly move towards target
      const targetVec = new THREE.Vector3(...target);
      currentPos.current.lerp(targetVec, 0.05);
      groupRef.current.position.copy(currentPos.current);

      // Look at target (with some smoothing)
      const lookAtPos = targetVec.clone().add(new THREE.Vector3(0, 0, 0.1));
      groupRef.current.lookAt(lookAtPos);

      // Flapping animation
      const flapSpeed = 10;
      const flapAngle = Math.sin(state.clock.getElapsedTime() * flapSpeed) * 0.5;
      if (leftWingRef.current) leftWingRef.current.rotation.z = flapAngle;
      if (rightWingRef.current) rightWingRef.current.rotation.z = -flapAngle;
      
      // Gentle bobbing
      groupRef.current.position.y += Math.sin(state.clock.getElapsedTime() * 2) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshStandardMaterial color="#4f46e5" />
      </mesh>
      {/* Left Wing */}
      <mesh ref={leftWingRef} position={[-0.2, 0, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.2]} />
        <meshStandardMaterial color="#818cf8" />
      </mesh>
      {/* Right Wing */}
      <mesh ref={rightWingRef} position={[0.2, 0, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.2]} />
        <meshStandardMaterial color="#818cf8" />
      </mesh>
      {/* Beak */}
      <mesh position={[0, 0.3, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi there! I'm **PathFinder AI**. I'm here to help you navigate your future. Tell me about your interests, your favorite subjects, or even a problem you'd love to solve, and we'll find the perfect career path for you!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
  const [birdTarget, setBirdTarget] = useState<[number, number, number]>([0, 2, 0]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    academicBackground: '',
    skills: [],
    preferences: []
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showSetupBanner, setShowSetupBanner] = useState(!isFirebaseConfigured);
  const [isCopied, setIsCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthReady(true);
      // Load from local storage
      const savedMessages = localStorage.getItem('pathfinder_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      const savedProfile = localStorage.getItem('pathfinder_profile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Load profile
        const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        }

        // Load conversation
        const convDoc = await getDoc(doc(db, 'conversations', currentUser.uid));
        if (convDoc.exists()) {
          const data = convDoc.data();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } else {
        // Reset to default if logged out
        setMessages([
          { role: 'model', content: "Hi there! I'm **PathFinder AI**. I'm here to help you navigate your future. Tell me about your interests, your favorite subjects, or even a problem you'd love to solve, and we'll find the perfect career path for you!" }
        ]);
        setProfile({ academicBackground: '', skills: [], preferences: [] });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, videoUrl]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Save to local storage as fallback
    localStorage.setItem('pathfinder_messages', JSON.stringify(updatedMessages));

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const response = await getCareerGuidance(text, history, profile.academicBackground ? profile : undefined);
    
    // Extract JSON for chart if present
    let chartData: any[] | undefined;
    let trendsData: any[] | undefined;
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        chartData = parsed.chartData;
        trendsData = parsed.trendsData;
      } catch (e) {
        console.error("Failed to parse chart JSON", e);
      }
    }

    const finalMessages: Message[] = [...updatedMessages, { role: 'model', content: response, chartData, trendsData }];
    setMessages(finalMessages);
    setIsLoading(false);

    // Save to local storage
    localStorage.setItem('pathfinder_messages', JSON.stringify(finalMessages));

    // Save to Firestore if logged in
    if (user && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'conversations', user.uid), {
          uid: user.uid,
          messages: finalMessages,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to save conversation", e);
      }
    }
  };

  const handleGenerateVideo = async () => {
    const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');
    if (!lastModelMessage) return;

    setIsVideoLoading(true);
    setVideoUrl(null);
    try {
      const url = await generateCareerVideo(lastModelMessage.content.substring(0, 100));
      setVideoUrl(url);
    } catch (e) {
      alert("Failed to generate video. Please try again.");
    } finally {
      setIsVideoLoading(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Basic 3D click placement logic
    const x = (e.clientX / window.innerWidth) * 10 - 5;
    const y = -(e.clientY / window.innerHeight) * 10 + 5;
    const baseColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    
    // Main object
    const mainPoint: ClickPoint = {
      id: Date.now(),
      position: [x, y, 0],
      color: baseColor,
      scale: 0.8 + Math.random() * 0.5,
      rotationSpeed: 0.5 + Math.random() * 2,
      type: 'main'
    };

    // Burst particles
    const particles: ClickPoint[] = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i + 1,
      position: [
        x + (Math.random() - 0.5) * 2,
        y + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ],
      color: baseColor,
      scale: 0.2 + Math.random() * 0.3,
      rotationSpeed: 2 + Math.random() * 3,
      type: 'particle'
    }));

    setClickPoints(prev => [...prev, mainPoint, ...particles].slice(-30)); // Keep last 30
    setBirdTarget([x, y, 0]);
  };

  const handleLogin = async () => {
    setLoginError(null);
    if (!isFirebaseConfigured) {
      setIsGuestMode(true);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error("Login failed", e);
      setLoginError(e.message || "Login failed. Please try again.");
      // Fallback to guest mode on error
      setIsGuestMode(true);
    }
  };

  const handleLogout = async () => {
    if (!isFirebaseConfigured) {
      setIsGuestMode(false);
      return;
    }
    try {
      await auth.signOut();
      setIsGuestMode(false);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const saveProfile = async () => {
    setIsProfileOpen(false);
    localStorage.setItem('pathfinder_profile', JSON.stringify(profile));
    
    if (user && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...profile,
          uid: user.uid
        });
      } catch (e) {
        console.error("Failed to save profile", e);
      }
    }
  };

  const resetChat = async () => {
    const initialMessages: Message[] = [
      { role: 'model', content: "Hi there! I'm **PathFinder AI**. I'm here to help you navigate your future. Tell me about your interests, your favorite subjects, or even a problem you'd love to solve, and we'll find the perfect career path for you!" }
    ];
    setMessages(initialMessages);
    setVideoUrl(null);
    setClickPoints([]);
    setBirdTarget([0, 2, 0]);
    recenterCamera();
    localStorage.removeItem('pathfinder_messages');

    if (user && isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'conversations', user.uid), {
          messages: initialMessages,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to reset conversation in Firestore", e);
      }
    }
  };

  const recenterCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden" onClick={handleCanvasClick}>
      {/* 3D Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <OrbitControls 
              ref={controlsRef} 
              enablePan={false} 
              enableZoom={true} 
              makeDefault 
              autoRotate 
              autoRotateSpeed={0.5}
            />
            {clickPoints.map(point => (
              <FloatingObject key={point.id} point={point} />
            ))}
            <Bird target={birdTarget} />
            <ContactShadows position={[0, -4.5, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
          </Suspense>
        </Canvas>
      </div>

      {/* Setup Banner */}
      <AnimatePresence>
        {showSetupBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-200 z-50 overflow-hidden"
          >
            <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Firebase is not fully configured. Authentication and cloud sync are disabled. Using local storage instead.</span>
              </div>
              <button 
                onClick={() => setShowSetupBanner(false)}
                className="text-amber-500 hover:text-amber-700 p-1"
              >
                <RefreshCcw className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">
              PathFinder <span className="text-indigo-600">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {(user || isGuestMode) ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsProfileOpen(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                >
                  {(user && user.photoURL) ? (
                    <img src={user.photoURL} alt="Profile" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  {(user && user.displayName) ? user.displayName.split(' ')[0] : (isGuestMode ? 'Guest' : 'Profile')}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {loginError && (
                  <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md">
                    {loginError}
                  </span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleLogin(); }}
                  className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                >
                  <User className="w-4 h-4" />
                  Login
                </button>
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
              <MousePointer2 className="w-3 h-3" />
              Click anywhere for 3D
            </div>
            <button 
              onClick={handleShare}
              className={cn(
                "p-2 rounded-full transition-all flex items-center gap-2",
                isCopied ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
              )}
              title="Share App"
            >
              {isCopied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              {isCopied && <span className="text-xs font-bold">Copied!</span>}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); recenterCamera(); }}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Recenter Camera"
            >
              <Compass className="w-5 h-5" />
            </button>
            <button 
              onClick={resetChat}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Reset Conversation"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6" />
                  <h2 className="text-xl font-display font-bold">Your Student Profile</h2>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <RefreshCcw className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">Academic Background</label>
                  <textarea 
                    value={profile.academicBackground}
                    onChange={(e) => setProfile(prev => ({ ...prev, academicBackground: e.target.value }))}
                    placeholder="e.g. 3rd year Computer Science student, GPA 3.8, interested in AI and Ethics."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">Skills (comma separated)</label>
                  <input 
                    type="text"
                    value={profile.skills.join(', ')}
                    onChange={(e) => setProfile(prev => ({ ...prev, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
                    placeholder="e.g. Python, Public Speaking, Data Analysis"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">Preferences (comma separated)</label>
                  <input 
                    type="text"
                    value={profile.preferences.join(', ')}
                    onChange={(e) => setProfile(prev => ({ ...prev, preferences: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
                    placeholder="e.g. Remote work, High salary, Social impact, Europe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    This information helps PathFinder AI tailor recommendations specifically to your strengths and goals.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={saveProfile}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Save Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6 p-4 md:p-6 overflow-hidden z-10">
        {/* Sidebar - Suggestions */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Quick Starts
            </h2>
            <div className="space-y-3">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); handleSend(s.prompt); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <s.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-900">{s.label}</span>
                  </div>
                  <div className="flex items-center text-[11px] text-slate-400 group-hover:text-indigo-400">
                    Try this <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
              <GraduationCap className="w-24 h-24" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2 relative z-10">Visual Career Roadmap</h3>
            <p className="text-indigo-100 text-sm leading-relaxed relative z-10">
              We now generate interactive charts and AI-powered videos to help you visualize your future success.
            </p>
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 md:gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-md",
                    msg.role === 'user' ? "bg-indigo-600" : "bg-white border border-slate-200"
                  )}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[90%] md:max-w-[80%] space-y-4",
                    msg.role === 'user' ? "text-right" : "text-left"
                  )}>
                    <div className={cn(
                      "rounded-2xl p-4 text-sm md:text-base leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100"
                    )}>
                      <div className="prose prose-sm md:prose-base max-w-none prose-slate">
                        <Markdown
                          components={{
                            p: ({ children }) => <p className={cn("mb-3 last:mb-0", msg.role === 'user' ? "text-white" : "text-slate-800")}>{children}</p>,
                            strong: ({ children }) => <strong className={cn("font-bold", msg.role === 'user' ? "text-white" : "text-indigo-700")}>{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-indigo-800">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-indigo-700">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-indigo-600">{children}</h3>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                                <table className="w-full text-sm text-left">{children}</table>
                              </div>
                            ),
                            th: ({ children }) => <th className="bg-slate-100 p-2 font-bold border-b border-slate-200">{children}</th>,
                            td: ({ children }) => <td className="p-2 border-b border-slate-100">{children}</td>,
                          }}
                        >
                          {msg.content.replace(/```json[\s\S]*?```/g, '')}
                        </Markdown>
                      </div>
                    </div>

                    {/* Chart Visualization */}
                    {msg.chartData && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg"
                      >
                        <div className="flex items-center gap-2 mb-4 text-indigo-600">
                          <BarChart3 className="w-5 h-5" />
                          <h4 className="text-sm font-bold uppercase tracking-wider">Salary Projection Trend</h4>
                        </div>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={msg.chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="stage" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12 }}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(value) => `$${value / 1000}k`}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Bar dataKey="max" name="Max Salary" radius={[4, 4, 0, 0]}>
                                {msg.chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 2 ? '#4f46e5' : '#818cf8'} />
                                ))}
                              </Bar>
                              <Bar dataKey="min" name="Min Salary" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}

                    {/* Trends Visualization */}
                    {msg.trendsData && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg"
                      >
                        <div className="flex items-center gap-2 mb-4 text-emerald-600">
                          <BarChart3 className="w-5 h-5" />
                          <h4 className="text-sm font-bold uppercase tracking-wider">Market Demand Growth</h4>
                        </div>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={msg.trendsData}>
                              <defs>
                                <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="year" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12 }}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="demand" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorDemand)" 
                                strokeWidth={3}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="mt-4 text-[10px] text-slate-400 italic">
                          * Data synthesized from real-time job market trends and growth projections.
                        </p>
                      </motion.div>
                    )}

                    {/* Video Generation Trigger */}
                    {msg.role === 'model' && idx === messages.length - 1 && !isLoading && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={handleGenerateVideo}
                        disabled={isVideoLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm disabled:opacity-50"
                      >
                        {isVideoLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                        {isVideoLoading ? "Generating Career Video..." : "Generate Career Visualization Video"}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Video Display */}
            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-indigo-600/20"
              >
                <div className="p-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-between">
                  <span>AI Generated Career Visualization</span>
                  <Sparkles className="w-3 h-3" />
                </div>
                <video src={videoUrl} controls autoPlay className="w-full aspect-video" />
              </motion.div>
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-indigo-600 animate-bounce" />
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl rounded-tl-none p-4 flex flex-col gap-2 min-w-[240px] shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMessageIndex}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs font-medium text-indigo-600 italic"
                    >
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 bg-white/80 backdrop-blur-md">
            <div className="relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about careers, degrees, or your interests..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none min-h-[56px] max-h-32 shadow-inner"
                rows={1}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSend(); }}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 bottom-2 p-2 rounded-lg transition-all",
                  input.trim() && !isLoading 
                    ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              PathFinder AI uses real-time data for projections. Click anywhere in the background to interact with the 3D space.
            </p>
          </div>
        </div>
      </main>

      {/* Mobile Suggestions */}
      <div className="lg:hidden p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-20">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Suggestions</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); handleSend(s.prompt); }}
              className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center gap-2 shadow-sm"
            >
              <s.icon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
