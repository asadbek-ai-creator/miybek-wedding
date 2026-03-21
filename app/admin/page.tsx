"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: "", coupleName: "", date: "" });
  const [creating, setCreating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      if (u && u.email) {
        setUser({ uid: u.uid, email: u.email });
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;
    const q = query(
      collection(getFirebaseDb(), "events"),
      where("hostUID", "==", user.uid)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
    items.sort((a, b) => b.createdAt - a.createdAt);
    setEvents(items);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch {
      setLoginError("Invalid email or password");
    }
    setLoginLoading(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEvent.name.trim()) return;
    setCreating(true);

    try {
      await addDoc(collection(getFirebaseDb(), "events"), {
        name: newEvent.name.trim(),
        coupleName: newEvent.coupleName.trim(),
        date: newEvent.date,
        createdAt: Date.now(),
        hostUID: user.uid,
        guestCount: 0,
        photoCount: 0,
      });
      setNewEvent({ name: "", coupleName: "", date: "" });
      setShowCreate(false);
      await loadEvents();
    } catch {
      // handle error
    }
    setCreating(false);
  };

  if (!authChecked) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // Login form
  if (!user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm fade-in">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-gold text-center mb-8">
            Host Login
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl bg-dark-surface border border-dark-border text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
              autoFocus
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-dark-surface border border-dark-border text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gold text-dark font-semibold py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {loginError && (
            <p className="text-red-400 text-sm text-center mt-4">
              {loginError}
            </p>
          )}

          <a
            href="/"
            className="block text-center text-white/40 text-sm mt-6 hover:text-white/60 transition-colors"
          >
            &larr; Back to home
          </a>
        </div>
      </main>
    );
  }

  // Dashboard
  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-gold">
          My Events
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-gold text-dark text-sm font-semibold px-4 py-2 rounded-full hover:bg-gold-light transition-colors"
          >
            + New Event
          </button>
          <button
            onClick={() => signOut(getFirebaseAuth())}
            className="text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreateEvent}
          className="mb-8 p-4 bg-dark-surface rounded-xl border border-dark-border space-y-3 fade-in"
        >
          <input
            type="text"
            value={newEvent.name}
            onChange={(e) =>
              setNewEvent((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Event name (e.g. Sarah & John's Wedding)"
            className="w-full px-4 py-3 rounded-xl bg-dark border border-dark-border text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
            autoFocus
          />
          <input
            type="text"
            value={newEvent.coupleName}
            onChange={(e) =>
              setNewEvent((prev) => ({ ...prev, coupleName: e.target.value }))
            }
            placeholder="Couple name (e.g. Sarah & John)"
            className="w-full px-4 py-3 rounded-xl bg-dark border border-dark-border text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
          />
          <input
            type="date"
            value={newEvent.date}
            onChange={(e) =>
              setNewEvent((prev) => ({ ...prev, date: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-xl bg-dark border border-dark-border text-white focus:outline-none focus:border-gold transition-colors"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating || !newEvent.name.trim()}
              className="bg-gold text-dark text-sm font-semibold px-6 py-2 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p>No events yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => router.push(`/admin/event/${event.id}`)}
              className="w-full p-4 bg-dark-surface rounded-xl border border-dark-border hover:border-gold/30 transition-colors text-left"
            >
              <h3 className="text-gold font-semibold">{event.name}</h3>
              <p className="text-white/40 text-sm mt-1">
                {event.coupleName} &bull; {event.date || formatDate(event.createdAt)}
              </p>
              <div className="flex gap-4 mt-2 text-xs text-white/30">
                <span>{event.photoCount || 0} photos</span>
                <span>{event.guestCount || 0} guests</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
