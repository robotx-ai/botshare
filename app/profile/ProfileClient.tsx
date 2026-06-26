"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { SafeUser } from "@/types";
import { isProviderProfileComplete } from "@/lib/providerProfile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

type Props = {
  currentUser: SafeUser;
};

function ProfileClient({ currentUser }: Props) {
  const router = useRouter();
  const [name, setName] = useState(currentUser.name ?? "");
  const [businessName, setBusinessName] = useState(currentUser.businessName ?? "");
  const [phone, setPhone] = useState(currentUser.phone ?? "");
  const [saving, setSaving] = useState(false);

  const complete = isProviderProfileComplete({ name, phone, businessName });

  const onSave = async () => {
    if (!complete) {
      toast.error("Name, company, and phone are all required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName, phone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      toast.success("Profile saved.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full p-3 font-light bg-white border-2 border-neutral-300 rounded-md outline-none focus:border-black transition";

  return (
    <Container>
      <div className="max-w-2xl mx-auto py-8 flex flex-col gap-6">
        <Heading
          title="Your profile"
          subtitle="Manage the details customers and our team see."
        />

        {currentUser.userType === "PROVIDER" && !complete && (
          <div className="rounded-md border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
            Complete your profile (name, company, and phone) to start listing robots.
          </div>
        )}

        {/* Verified badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Verification:</span>
          {currentUser.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
              ✓ Verified provider
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600">
              Pending verification
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Name</span>
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Company</span>
            <input
              className={field}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your company / business name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Phone</span>
            <input
              className={field}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contact phone number"
              inputMode="tel"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              className={`${field} bg-neutral-100 text-neutral-500 cursor-not-allowed`}
              value={currentUser.email ?? ""}
              readOnly
            />
            <span className="text-xs text-neutral-400">
              Email is tied to your login and can&apos;t be changed here.
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="self-start rounded-md bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Container>
  );
}

export default ProfileClient;
