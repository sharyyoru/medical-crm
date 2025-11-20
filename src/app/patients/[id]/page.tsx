import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import CollapseSidebarOnMount from "@/components/CollapseSidebarOnMount";
import EditPatientDetailsButton from "./EditPatientDetailsButton";
import PatientModeToggle from "./PatientModeToggle";
import PatientDetailsTabs from "./PatientDetailsTabs";
import PatientCrmPreferencesCard from "./PatientCrmPreferencesCard";
import PatientActivityCard from "./PatientActivityCard";

interface PatientDetailsProps {
  params: Promise<{ id: string }>;
}

async function getPatientWithDetails(id: string) {
  const { data: patient, error } = await supabaseClient
    .from("patients")
    .select(
      "id, first_name, last_name, email, phone, gender, dob, marital_status, nationality, street_address, postal_code, town, profession, current_employer, source, notes, avatar_url, language_preference, clinic_preference, lifecycle_stage, contact_owner_name, contact_owner_email, created_by, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !patient) {
    return { patient: null, insurance: [] } as const;
  }

  const { data: insurance } = await supabaseClient
    .from("patient_insurances")
    .select("id, provider_name, card_number, insurance_type, created_at")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  return { patient, insurance: insurance ?? [] } as const;
}

export default async function PatientPage({ params }: PatientDetailsProps) {
  const { id } = await params;
  const { patient, insurance } = await getPatientWithDetails(id);

  if (!patient) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm">
        Patient not found.
      </div>
    );
  }

  const rawDob = (patient as any).dob as string | null | undefined;
  let age: number | null = null;
  if (rawDob) {
    const dobDate = new Date(rawDob);
    if (!Number.isNaN(dobDate.getTime())) {
      const today = new Date();
      let years = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        years -= 1;
      }
      age = years;
    }
  }

  const genderRaw = (patient as any).gender as string | null | undefined;
  const gender = genderRaw ? genderRaw.toLowerCase() : null;

  let genderClasses = "bg-slate-50 text-slate-700 border-slate-200";
  if (gender === "male") {
    genderClasses = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (gender === "female") {
    genderClasses = "bg-pink-50 text-pink-700 border-pink-200";
  }

  return (
    <div className="space-y-6">
      <CollapseSidebarOnMount />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3 relative z-10">
          <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <PatientModeToggle />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs">
            {genderRaw ? (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${genderClasses}`}
              >
                {(gender === "male" || gender === "female")
                  ? gender.charAt(0).toUpperCase() + gender.slice(1)
                  : genderRaw}
              </span>
            ) : null}
            {age !== null ? (
              <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-50">
                <span className="opacity-80">Age</span>
                <span className="ml-1 font-semibold">{age}</span>
              </span>
            ) : null}
          </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/patients/${patient.id}?composeEmail=1`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300/80 bg-gradient-to-b from-slate-50/90 via-slate-100/90 to-slate-200/90 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur hover:from-slate-100 hover:to-slate-300"
            >
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                <svg
                  className="h-3.5 w-3.5 text-slate-700"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3 17L17 10L3 3L5.2 9.2L11 10L5.2 10.8L3 17Z" />
                </svg>
              </span>
              <span>Send an email</span>
            </Link>
            <EditPatientDetailsButton patientId={patient.id} />
            <Link
              href="/patients"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                <svg
                  className="h-3.5 w-3.5 text-slate-600"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                  <path d="M4 20a6 6 0 0 1 8-5.29A6 6 0 0 1 20 20" />
                </svg>
              </span>
              <span>All Contacts</span>
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-6 right-0 h-40 w-40 overflow-hidden">
          <div className="crm-glow h-full w-full" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <PatientDetailsTabs patient={patient} insurance={insurance} />
        <PatientCrmPreferencesCard patient={patient} />
      </div>

      <PatientActivityCard
        patientId={patient.id}
        createdAt={(patient as any).created_at ?? null}
        createdBy={(patient as any).created_by ?? null}
        patientEmail={(patient as any).email ?? null}
      />
    </div>
  );
}
