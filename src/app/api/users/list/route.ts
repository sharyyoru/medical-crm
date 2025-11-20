import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (error || !data?.users) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to list users" },
        { status: 500 },
      );
    }

    const users = data.users.map((user) => {
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const first = (meta["first_name"] as string) || "";
      const last = (meta["last_name"] as string) || "";
      const fullName = [first, last].filter(Boolean).join(" ") || user.email || "";

      return {
        id: user.id,
        full_name: fullName || null,
        email: user.email ?? null,
      };
    });

    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected error listing users" },
      { status: 500 },
    );
  }
}
