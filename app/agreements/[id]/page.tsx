import getCurrentUser from "@/app/actions/getCurrentUser";
import AgreementDocument from "@/components/agreement/AgreementDocument";
import Container from "@/components/Container";
import { isAdminEmail } from "@/lib/adminAuth";
import prisma from "@/lib/prismadb";
import type { AgreementSnapshot } from "@/lib/agreementTemplate";
import { redirect } from "next/navigation";

interface Props {
  params: { id: string };
}

function PrintButton() {
  return (
    <form action="javascript:window.print()">
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 transition"
      >
        Download PDF
      </button>
    </form>
  );
}

export default async function AgreementPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");

  const agreement = await prisma.agreement.findUnique({
    where: { id: params.id },
  });

  if (!agreement) redirect("/");

  const isOwner = agreement.userId === currentUser.id;
  const isAdmin = isAdminEmail(currentUser.email);
  if (!isOwner && !isAdmin) redirect("/");

  const snapshot = agreement.fieldSnapshot as unknown as AgreementSnapshot;
  const signature = {
    name: agreement.signedName,
    title: agreement.signedTitle,
    date: agreement.signedAt.toISOString().slice(0, 10),
  };

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-8 print:py-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-xl font-semibold text-black">
            Signed Agreement {agreement.agreementNo}
          </h1>
          <PrintButton />
        </div>
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <AgreementDocument snapshot={snapshot} signature={signature} />
        </div>
      </div>
    </Container>
  );
}
