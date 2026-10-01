import { buttonClass } from "@/components/ui/button";
import { LogOutIcon } from "@/components/ui/icons";
import { signOutAction } from "@/features/auth/actions";

/** Sign out: an outlined pill with an icon; it tints on hover/press like every secondary button. */
export function SignOutButton({
  className = "",
  testId = "sign-out",
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <form action={signOutAction} className={className}>
      <button
        type="submit"
        className={`${buttonClass("secondary")} group lg:w-full`}
        data-testid={testId}
      >
        <LogOutIcon
          width={18}
          height={18}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
        />
        Sign out
      </button>
    </form>
  );
}
