"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type DealStage = {
  id: string;
  name: string;
  type: string;
  sort_order: number;
};

type WorkflowRow = {
  id: string;
  name: string;
  trigger_type: string;
  active: boolean;
  config: unknown;
};

type WorkflowActionRow = {
  id: string;
  workflow_id: string;
  action_type: string;
  config: unknown;
  sort_order: number;
};

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [stages, setStages] = useState<DealStage[]>([]);

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState("Deal: Request info → Request processed");
  const [active, setActive] = useState(true);
  const [fromStageId, setFromStageId] = useState<string>("");
  const [toStageId, setToStageId] = useState<string>("");
  const [pipeline, setPipeline] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState(
    "Your information request has been processed",
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    [
      "Hi {{patient.first_name}}",
      "",
      "We wanted to let you know that your request for information has now been processed.",
      "",
      "Deal: {{deal.title}}",
      "Pipeline: {{deal.pipeline}}",
      "",
      "Best regards,",
      "Your clinic team",
    ].join("\n"),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [stagesResult, workflowsResult, actionsResult] = await Promise.all([
          supabaseClient
            .from("deal_stages")
            .select("id, name, type, sort_order")
            .order("sort_order", { ascending: true }),
          supabaseClient
            .from("workflows")
            .select("id, name, trigger_type, active, config")
            .eq("trigger_type", "deal_stage_changed")
            .order("created_at", { ascending: true }),
          supabaseClient
            .from("workflow_actions")
            .select("id, workflow_id, action_type, config, sort_order")
            .order("sort_order", { ascending: true }),
        ]);

        if (cancelled) return;

        const stagesData = (stagesResult.data ?? []) as DealStage[];
        setStages(stagesData);

        const workflows = (workflowsResult.data ?? []) as WorkflowRow[];
        const existing = workflows[0];

        if (existing) {
          setWorkflowId(existing.id);
          setName(existing.name);
          setActive(existing.active);

          const config = (existing.config || {}) as {
            from_stage_id?: string | null;
            to_stage_id?: string | null;
            pipeline?: string | null;
          };

          setFromStageId(config.from_stage_id ?? "");
          setToStageId(config.to_stage_id ?? "");
          setPipeline(config.pipeline ?? "");

          const actions = (actionsResult.data ?? []) as WorkflowActionRow[];
          const action = actions.find(
            (candidate) =>
              candidate.workflow_id === existing.id &&
              candidate.action_type === "draft_email_patient",
          );

          if (action) {
            const actionConfig = (action.config || {}) as {
              subject_template?: string;
              body_template?: string;
            };

            if (actionConfig.subject_template) {
              setSubjectTemplate(actionConfig.subject_template);
            }
            if (actionConfig.body_template) {
              setBodyTemplate(actionConfig.body_template);
            }
          }
        } else {
          const infoStage = stagesData.find((stage) =>
            stage.name.toLowerCase().includes("request for information"),
          );
          const processedStage = stagesData.find((stage) =>
            stage.name.toLowerCase().includes("request processed"),
          );

          if (infoStage) {
            setFromStageId(infoStage.id);
          }
          if (processedStage) {
            setToStageId(processedStage.id);
          }
        }

        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load workflows.");
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!toStageId) {
      setError("Please select the 'to' stage.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const trimmedName = name.trim() || "Deal stage change automation";
      const pipelineValue = pipeline.trim() || null;
      const config = {
        from_stage_id: fromStageId || null,
        to_stage_id: toStageId,
        pipeline: pipelineValue,
      };

      let id = workflowId;

      if (!id) {
        const { data, error } = await supabaseClient
          .from("workflows")
          .insert({
            name: trimmedName,
            trigger_type: "deal_stage_changed",
            active,
            config,
          })
          .select("id")
          .single();

        if (error || !data) {
          throw error ?? new Error("Failed to create workflow.");
        }

        id = (data as any).id as string;
        setWorkflowId(id);
      } else {
        const { error } = await supabaseClient
          .from("workflows")
          .update({
            name: trimmedName,
            active,
            config,
          })
          .eq("id", id);

        if (error) {
          throw error;
        }
      }

      if (id) {
        const { data: actions, error: actionsError } = await supabaseClient
          .from("workflow_actions")
          .select("id")
          .eq("workflow_id", id)
          .eq("action_type", "draft_email_patient")
          .limit(1);

        if (actionsError) {
          throw actionsError;
        }

        const actionConfig = {
          subject_template: subjectTemplate,
          body_template: bodyTemplate,
        };

        if (actions && actions.length > 0) {
          const actionId = (actions[0] as any).id as string;
          const { error: updateError } = await supabaseClient
            .from("workflow_actions")
            .update({ config: actionConfig })
            .eq("id", actionId);

          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabaseClient
            .from("workflow_actions")
            .insert({
              workflow_id: id,
              action_type: "draft_email_patient",
              config: actionConfig,
              sort_order: 1,
            });

          if (insertError) {
            throw insertError;
          }
        }
      }

      setSuccess(
        "Workflow saved. A draft email will be created when a deal moves between the selected stages.",
      );
    } catch (err: any) {
      setError(err?.message ?? "Failed to save workflow.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Workflows</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure automations that react when a deal moves between pipeline stages.
            </p>
          </div>
          <Link
            href="/patients"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span>Back to patients</span>
          </Link>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-5 text-sm text-slate-800 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Deal stage change → Draft patient email
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Define an automation that runs when a deal moves between stages. For example, when a
            deal moves from <span className="font-semibold">Request for information</span> to
            <span className="font-semibold"> Request processed</span>, automatically create a draft
            email for the patient.
          </p>

          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Workflow name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-end space-x-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Workflow is active</span>
                </label>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  From stage (optional)
                </label>
                <select
                  value={fromStageId}
                  onChange={(event) => setFromStageId(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Any stage</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  To stage (required)
                </label>
                <select
                  value={toStageId}
                  onChange={(event) => setToStageId(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Select stage…</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Pipeline filter (optional)
                </label>
                <input
                  type="text"
                  value={pipeline}
                  onChange={(event) => setPipeline(event.target.value)}
                  placeholder="e.g. Geneva"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Email subject template
                </label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(event) => setSubjectTemplate(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-400">
                  You can use placeholders like
                  <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
                    {"{{patient.first_name}}"}
                  </code>
                  {" "}
                  or
                  <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
                    {"{{deal.title}}"}
                  </code>
                  .
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Email body template
                </label>
                <textarea
                  value={bodyTemplate}
                  onChange={(event) => setBodyTemplate(event.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="text-[11px] text-slate-400">
                {loading ? "Loading stages and existing workflows…" : null}
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-full border border-sky-500 bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save workflow"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
