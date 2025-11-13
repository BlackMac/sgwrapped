import { signIn, signOut } from "@/auth";

type ButtonVariant = "primary" | "ghost";

const styles: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
  ghost:
    "inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
};

const signInWithSipgate = async () => {
  "use server";
  await signIn("sipgate", { redirectTo: "/" });
};

const signOutOfSipgate = async () => {
  "use server";
  await signOut({ redirectTo: "/" });
};

type AuthButtonProps = {
  label: string;
  variant?: ButtonVariant;
};

const AuthButton = ({ label, variant = "primary" }: AuthButtonProps) => (
  <button className={styles[variant]} type="submit">
    {label}
  </button>
);

export const SignInButton = ({ variant = "primary" }: { variant?: ButtonVariant }) => (
  <form action={signInWithSipgate}>
    <AuthButton label="Sign in with sipgate" variant={variant} />
  </form>
);

export const SignOutButton = ({ variant = "ghost" }: { variant?: ButtonVariant }) => (
  <form action={signOutOfSipgate}>
    <AuthButton label="Sign out" variant={variant} />
  </form>
);
