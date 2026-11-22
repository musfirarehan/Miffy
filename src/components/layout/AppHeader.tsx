import { Menu, Settings, SquarePen } from "lucide-react";

import { BunnyAvatar } from "@/components/avatar";
import { ASSISTANT_NAME } from "@/config/assistant";
import type { BunnyExpression } from "@/types/avatar";

interface AppHeaderProps {
  expression: BunnyExpression;
  onOpenSidebar: () => void;
  onNewChat: () => void;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={disabled ? `${label} (coming soon)` : label}
      className="flex size-10 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush-100 hover:text-mauve-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink-500"
    >
      {children}
    </button>
  );
}

export function AppHeader({
  expression,
  onOpenSidebar,
  onNewChat,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-blush-100 bg-cream-50/90 px-3 sm:px-5">
      <div className="lg:hidden">
        <IconButton label="Open conversations" onClick={onOpenSidebar}>
          <Menu className="size-5" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blush-100">
          <div className="mt-2">
            <BunnyAvatar expression={expression} size={34} animated={false} />
          </div>
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-lg font-medium text-ink-900">
            {ASSISTANT_NAME}
          </p>
          <p className="truncate text-xs text-ink-500">
            Your honest little best friend
          </p>
        </div>
      </div>

      <IconButton label="New conversation" onClick={onNewChat}>
        <SquarePen className="size-5" aria-hidden="true" />
      </IconButton>
      <IconButton label="Settings" disabled>
        <Settings className="size-5" aria-hidden="true" />
      </IconButton>
    </header>
  );
}
