import { SiteFooter } from "@/components/site/site-footer";
import { PreviewBanner } from "@/components/site/preview-banner";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";

/** Shop pages: site header with cart, footer. The editor flow has its own header. */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner />
      <SiteHeader />
      <div className="flex-1">
        <PageTransition>{children}</PageTransition>
      </div>
      <SiteFooter />
    </div>
  );
}
