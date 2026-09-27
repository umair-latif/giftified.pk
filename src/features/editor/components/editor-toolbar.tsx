interface Props {
  ready: boolean;
  hasSelection: boolean;
  onAddText: () => void;
  onAddImage: () => void;
  onDelete: () => void;
}

/** Bottom tool bar. Placeholder slots mark where upcoming tools will go. */
export function EditorToolbar({
  ready,
  hasSelection,
  onAddText,
  onAddImage,
  onDelete,
}: Props) {
  return (
    <nav
      aria-label="Editor tools"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        <ToolButton
          label="Text"
          icon="T"
          onClick={onAddText}
          disabled={!ready}
        />
        <ToolButton
          label="Image"
          icon="▣"
          onClick={onAddImage}
          disabled={!ready}
        />
        <ToolButton label="Layers" icon="≡" disabled soon />
        <ToolButton label="3D" icon="◎" disabled soon />
        <ToolButton
          label="Delete"
          icon="✕"
          onClick={onDelete}
          disabled={!hasSelection}
        />
      </div>
    </nav>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  soon,
}: {
  label: string;
  icon: string;
  onClick?: () => void;
  disabled?: boolean;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 text-zinc-800 disabled:text-zinc-300"
    >
      <span aria-hidden className="text-lg leading-none">
        {icon}
      </span>
      <span className="text-[11px]">{label}</span>
      {soon && <span className="sr-only">(coming soon)</span>}
    </button>
  );
}
