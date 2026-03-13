import { useState, useRef, useEffect } from "react";
import { Bell, X, CheckCheck, Trash2, Calendar, User, Building2, Users, CreditCard, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useNotifications, useMarkAsRead, useMarkAllAsRead,
  useDeleteNotification, useClearAllNotifications,
  AppNotification,
} from "@/hooks/useNotifications";

const typeIcon: Record<string, any> = {
  calendar: Calendar,
  lead:     User,
  property: Building2,
  team:     Users,
  plan:     CreditCard,
};

const typeColor: Record<string, string> = {
  calendar: "bg-purple-100 text-purple-600",
  lead:     "bg-blue-100 text-blue-600",
  property: "bg-green-100 text-green-600",
  team:     "bg-amber-100 text-amber-600",
  plan:     "bg-red-100 text-red-600",
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: notifications, unreadCount } = useNotifications();
  const { mutate: markAsRead }    = useMarkAsRead();
  const { mutate: markAllAsRead } = useMarkAllAsRead();
  const { mutate: deleteOne }     = useDeleteNotification();
  const { mutate: clearAll }      = useClearAllNotifications();

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notif: AppNotification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.link) window.location.href = notif.link;
    setOpen(false);
  };

  const isEmpty = !notifications || notifications.length === 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão sino */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open ? "bg-purple-100 text-[#7E22CE]" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#7E22CE] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Painel de notificações */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 z-50",
              "w-[340px] max-w-[calc(100vw-2rem)]",
              "bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
            )}
          >
            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#7E22CE]" />
                <span className="font-semibold text-sm">Notificações</span>
                {unreadCount > 0 && (
                  <span className="bg-[#7E22CE] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    title="Marcar todas como lidas"
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {!isEmpty && (
                  <button
                    onClick={() => { if (confirm("Limpar todas as notificações?")) clearAll(); }}
                    title="Limpar tudo"
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-[420px] overflow-y-auto">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-sm text-slate-600">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhuma notificação por enquanto.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications!.map((notif) => {
                    const Icon = typeIcon[notif.type] ?? Bell;
                    const colorClass = typeColor[notif.type] ?? "bg-slate-100 text-slate-600";
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, height: 0 }}
                        className={cn(
                          "group flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/40",
                          !notif.read && "bg-purple-50/60 dark:bg-purple-950/10"
                        )}
                        onClick={() => handleClick(notif)}
                      >
                        {/* Ícone do tipo */}
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm leading-snug", !notif.read ? "font-semibold text-card-foreground" : "font-medium text-muted-foreground")}>
                            {notif.title}
                          </p>
                          {notif.body && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(parseISO(notif.created_at), { locale: ptBR, addSuffix: true })}
                          </p>
                        </div>

                        {/* Indicador não lida + ações */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {!notif.read && (
                            <div className="w-2 h-2 bg-[#7E22CE] rounded-full mt-1" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteOne(notif.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 text-red-400"
                            title="Remover"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {notif.link && (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {!isEmpty && (
              <div className="px-4 py-2 border-t border-border bg-muted/30 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {notifications!.length} notificaç{notifications!.length === 1 ? "ão" : "ões"}
                </span>
                {unreadCount > 0 && (
                  <button onClick={() => markAllAsRead()} className="text-xs text-[#7E22CE] hover:underline underline-offset-2">
                    Marcar todas como lidas
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};