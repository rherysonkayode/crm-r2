import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Invite = {
  id: string;
  company_id: string;
  email: string | null;
  token: string;
  tipo: 'manual' | 'link';
  status: 'pendente' | 'aceito' | 'expirado' | 'cancelado';
  expires_at: string;
  created_by: string;
  created_at: string;
  accepted_at: string | null;
};

export const useInvites = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: invites, isLoading } = useQuery({
    queryKey: ["team_invites", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      // Usando 'as any' para contornar a tipagem ausente
      const { data, error } = await (supabase
        .from("team_invites" as any)
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })) as any;
      if (error) throw error;
      return data as Invite[];
    },
    enabled: !!profile?.company_id,
  });

  const generateInviteLink = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("Empresa não identificada");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await (supabase
        .from("team_invites" as any)
        .insert({
          company_id: profile.company_id,
          tipo: 'link',
          status: 'pendente',
          expires_at: expiresAt.toISOString(),
          created_by: profile.id,
        })
        .select()
        .single()) as any;

      if (error) throw error;
      return data as Invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
    },
  });

  const sendEmailInvite = useMutation({
    mutationFn: async (emails: string[]) => {
      if (!profile?.company_id) throw new Error("Empresa não identificada");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitesToInsert = emails.map(email => ({
        company_id: profile.company_id,
        email,
        tipo: 'manual' as const,
        status: 'pendente',
        expires_at: expiresAt.toISOString(),
        created_by: profile.id,
      }));

      const { data, error } = await (supabase
        .from("team_invites" as any)
        .insert(invitesToInsert)
        .select()) as any;

      if (error) throw error;
      return data as Invite[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await (supabase
        .from("team_invites" as any)
        .update({ status: 'cancelado' })
        .eq("id", inviteId)) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
      toast.success("Convite cancelado");
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (invite: Invite) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await (supabase
        .from("team_invites" as any)
        .update({
          token: crypto.randomUUID(),
          expires_at: expiresAt.toISOString(),
          status: 'pendente',
        })
        .eq("id", invite.id)) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
      toast.success("Convite reenviado");
    },
  });

  return {
    invites,
    isLoading,
    generateInviteLink,
    sendEmailInvite,
    cancelInvite,
    resendInvite,
  };
};