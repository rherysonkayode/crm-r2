import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseISO, isToday, isTomorrow, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type NotificationType = "calendar" | "lead" | "property" | "team" | "plan";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

// ─── Lê notificações do banco ──────────────────────────────────────────────
export const useNotifications = () => {
  const { profile, companyProfile, isCorretorVinculado } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as AppNotification[];
    },
    enabled: !!profile,
  });

  // Realtime: atualiza automaticamente quando chega nova notificação
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("notifications_realtime")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const unreadCount = query.data?.filter(n => !n.read).length ?? 0;

  return { ...query, unreadCount };
};

// ─── Marcar uma como lida ──────────────────────────────────────────────────
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { profile, companyProfile, isCorretorVinculado } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications" as any).update({ read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });
};

// ─── Marcar todas como lidas ───────────────────────────────────────────────
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { profile, companyProfile, isCorretorVinculado } = useAuth();
  return useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications" as any)
        .update({ read: true })
        .eq("user_id", profile!.id)
        .eq("read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });
};

// ─── Deletar uma notificação ───────────────────────────────────────────────
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { profile, companyProfile, isCorretorVinculado } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications" as any).delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });
};

// ─── Limpar todas ─────────────────────────────────────────────────────────
export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();
  const { profile, companyProfile, isCorretorVinculado } = useAuth();
  return useMutation({
    mutationFn: async () => {
      await supabase.from("notifications" as any).delete().eq("user_id", profile!.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });
};

// ─── Helper: criar notificação (chamado pelos hooks de evento) ─────────────
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null,
  link: string | null
) => {
  await supabase.from("notifications" as any).insert({
    user_id: userId, type, title, body, link, read: false,
  });
};

// ─── Hook: gera notificações automáticas de calendário ────────────────────
// Chamado uma vez ao carregar o app. Cria notificações para eventos de hoje
// e amanhã que ainda não geraram notificação.
export const useCalendarNotifications = () => {
  const { profile, companyProfile, isCorretorVinculado } = useAuth();

  useEffect(() => {
    if (!profile) return;
    const key = `cal_notified_${format(new Date(), "yyyy-MM-dd")}_${profile.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const run = async () => {
      const { data: events } = await supabase
        .from("calendar_events" as any)
        .select("id, title, start_at, all_day, event_type")
        .eq("completed", false)
        .or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`);

      if (!events) return;

      for (const ev of events as any[]) {
        const date = parseISO(ev.start_at);
        let title: string | null = null;
        let body: string | null = null;

        if (isToday(date)) {
          title = `📅 Hoje: ${ev.title}`;
          body  = ev.all_day ? "Dia inteiro" : `às ${format(date, "HH:mm")}`;
        } else if (isTomorrow(date)) {
          title = `⏰ Amanhã: ${ev.title}`;
          body  = ev.all_day ? "Dia inteiro" : `às ${format(date, "HH:mm")}`;
        }

        if (!title) continue;

        // Evita duplicar notificações do mesmo evento no mesmo dia
        const notifKey = `notif_cal_${ev.id}_${format(new Date(), "yyyy-MM-dd")}`;
        if (sessionStorage.getItem(notifKey)) continue;
        sessionStorage.setItem(notifKey, "1");

        await createNotification(profile.id, "calendar", title, body, "/#/calendario");
      }

      // Plano expirando em até 7 dias
      // Corretor vinculado: usa trial da imobiliária
      const trialEndRef = isCorretorVinculado
        ? companyProfile?.trial_end
        : profile.trial_end;

      // Corretor vinculado não recebe notificação de plano — é responsabilidade da imobiliária
      if (!isCorretorVinculado && trialEndRef) {
        const days = differenceInDays(parseISO(trialEndRef), new Date());
        if (days >= 0 && days <= 7) {
          const planKey = `notif_plan_${format(new Date(), "yyyy-MM-dd")}_${profile.id}`;
          if (!sessionStorage.getItem(planKey)) {
            sessionStorage.setItem(planKey, "1");
            await createNotification(
              profile.id, "plan",
              days === 0 ? "⚠️ Seu plano expira hoje!" : `⚠️ Plano expira em ${days} dia${days > 1 ? "s" : ""}`,
              "Faça upgrade para continuar usando o CRM sem interrupções.",
              "/#/subscription"
            );
          }
        }
      }
    };

    run();
  }, [profile?.id]);
};