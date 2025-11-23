import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable for OpenAI client");
}

const client = new OpenAI({ apiKey });

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as {
      messages?: ChatMessage[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages array" },
        { status: 400 },
      );
    }

    const trimmed = messages
      .map((message) => ({
        role: message.role,
        content: message.content?.toString().slice(0, 8000) ?? "",
      }))
      .filter((message) => message.content.trim().length > 0);

    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: "Messages must contain non-empty content" },
        { status: 400 },
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Aliice, an AI assistant embedded inside a medical CRM. You help staff with bookings, post-op documentation, deals/pipelines, workflows, and patient or insurance communication. Be concise, precise, and always respect that this is an internal staff-facing tool.",
        },
        ...trimmed,
      ],
      temperature: 0.6,
    });

    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage || !assistantMessage.content) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: {
        role: assistantMessage.role,
        content: assistantMessage.content,
      },
    });
  } catch (error) {
    console.error("Error in /api/chat", error);
    return NextResponse.json(
      { error: "Failed to generate chat response" },
      { status: 500 },
    );
  }
}
