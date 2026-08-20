import { TermsContent } from "@/lib/termsContent";

export const metadata = {
  title: "Terms of Service | Hifivebot",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-neutral-800 leading-relaxed">
      <TermsContent />
    </main>
  );
}
