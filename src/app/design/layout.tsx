import { PageTransition } from "@/components/site/page-transition";

/** Design → Preview → Order: the same page slide as the shop (its own header). */
export default function DesignLayout({ children }: LayoutProps<"/design">) {
  return <PageTransition>{children}</PageTransition>;
}
