import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  connectionError: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", userId).single(),
        supabase.rpc("get_user_role", { _user_id: userId }),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) setRole(roleRes.data);
    } catch {
      // Supabase unreachable
    }
  };

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    // Timeout: if loading takes more than 5s, assume Supabase is unreachable
    timeout = setTimeout(() => {
      if (loading) {
        setConnectionError(true);
        setLoading(false);
      }
    }, 5000);

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setTimeout(() => fetchProfileAndRole(session.user.id), 0);
          } else {
            setProfile(null);
            setRole(null);
          }
          setLoading(false);
          clearTimeout(timeout);
        }
      );

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfileAndRole(session.user.id);
        }
        setLoading(false);
        clearTimeout(timeout);
      }).catch(() => {
        setConnectionError(true);
        setLoading(false);
        clearTimeout(timeout);
      });

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    } catch {
      setConnectionError(true);
      setLoading(false);
      clearTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Supabase unreachable
    }
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, connectionError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
