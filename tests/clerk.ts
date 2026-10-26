export const testIdentity = { userId: "review-ui-user" as string | null };
export const ClerkProvider = ({ children }: any) => children;
export const Show = ({ when, children }: any) =>
  when === "signed-in" ? children : null;
export const SignIn = () => null;
export const SignUp = () => null;
export const useClerk = () => ({
  signOut: () => Promise.resolve(),
  addListener: () => () => {},
});
export const useUser = () => ({
  user: {
    id: testIdentity.userId,
    fullName: "Review Customer",
    primaryEmailAddress: { emailAddress: "review@example.com" },
  },
});
export const publishableKeyFromHost = () => "review-key";
