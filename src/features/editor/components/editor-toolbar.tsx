import type { ReactNode } from "react";

interface Props {
  ready: boolean;
  onAddText: () => void;
  onAddImage: () => void;
  /** Current background colour (null = none), shown on its button. */
  background: string | null;
  onBackground: () => void;
}

/**
 * Bottom tool bar for adding things: Text, Image, Background colour. Later
 * background kinds (gradients, patterns, textures) go next to it. Actions
 * on a selected item live in the SelectionBar above it.
 */
export function EditorToolbar({
  ready,
  onAddText,
  onAddImage,
  background,
  onBackground,
}: Props) {
  return (
    <nav
      aria-label="Editor tools"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:rounded-2xl lg:border lg:pb-0 lg:shadow-sm"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 lg:max-w-none lg:gap-1 lg:p-1">
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
        <ToolButton
          label="Background colour"
          icon={<ColourDot colour={background} />}
          onClick={onBackground}
          disabled={!ready}
          haspopup
        />
      </div>
    </nav>
  );
}

/** The current background colour; a colour wheel when there is none. */
function ColourDot({ colour }: { colour: string | null }) {
  return (
    <span
      className={`block size-[18px] rounded-full ring-1 ring-zinc-400 ${
        colour
          ? ""
          : "bg-[conic-gradient(#ff3d8b,#ffe135,#14b8a6,#1d4ed8,#ff3d8b)]"
      }`}
      style={colour ? { backgroundColor: colour } : undefined}
    />
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  haspopup,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  haspopup?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup={haspopup ? "dialog" : undefined}
      className="focus-visible:ring-brand-600/20 flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 text-zinc-800 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset disabled:text-zinc-300 disabled:hover:bg-transparent lg:flex-1 lg:rounded-xl"
    >
      <span
        aria-hidden
        className="grid h-[18px] place-items-center text-lg leading-none"
      >
        {icon}
      </span>
      <span className="text-[11px] whitespace-nowrap">{label}</span>
    </button>
  );
}
