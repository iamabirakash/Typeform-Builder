import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Workspace | Typeform Clone",
    template: "%s | Typeform Clone",
  },
  description: "Create, organize, and analyze your forms.",
};

export default function FormsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
