import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
  InsufficientCreditsError,
} from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError("Please log in to use this feature");
    }

    const { message, conversationId } = await request.json();

    if (!message?.trim()) {
      throw new ValidationError("Invalid request", {
        message: "Message is required",
      });
    }

    // Check if user has enough credits (1 credit per message)
    const userCredits = 100; // Hardcoded for now
    const requiredCredits = 1;

    if (userCredits < requiredCredits) {
      throw new InsufficientCreditsError(
        "Insufficient credits. You need at least 1 credit to send a message.",
        requiredCredits,
        userCredits
      );
    }

    // Get or create conversation
    let currentConversation;

    if (conversationId) {
      // Find existing conversation
      const existingConversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });

      if (existingConversation) {
        currentConversation = existingConversation;
        // Update last message timestamp
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    }

    if (!currentConversation) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: sessionResponse.user.id,
          title: message.substring(0, 20) + (message.length > 20 ? "..." : ""),
          lastMessageAt: new Date(),
        })
        .returning();

      currentConversation = newConversation;
    }

    // Store user message
    const [userMessage] = await db
      .insert(messages)
      .values({
        conversationId: currentConversation.id,
        userId: sessionResponse.user.id,
        role: "user",
        content: message,
      })
      .returning();

    // Simple mock AI response
    const responses = [
      "I understand you're asking about " +
        message.substring(0, 20) +
        ". Here's what I think...",
      "That's an interesting question! Let me help you with that.",
      "Based on what you're saying, I can suggest the following approach...",
      "Thanks for your message! Here's my response to your query.",
      "I'm here to help! Regarding your question about " +
        message.substring(0, 15) +
        "...",
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    // Store AI response
    const [aiMessage] = await db
      .insert(messages)
      .values({
        conversationId: currentConversation.id,
        userId: sessionResponse.user.id,
        role: "assistant",
        content: randomResponse,
        tokenCount: randomResponse.length, // Simple token count estimate
      })
      .returning();

    return NextResponse.json({
      response: randomResponse,
      remainingCredits: userCredits,
      creditsUsed: requiredCredits,
      conversationId: currentConversation.id,
      messageId: aiMessage.id,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return handleApiError(error);
  }
}

// GET endpoint to fetch conversation history
export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      // Get specific conversation with messages
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          messages: {
            orderBy: [messages.createdAt],
          },
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(conversation);
    } else {
      // Get all conversations for the user
      const userConversations = await db.query.conversations.findMany({
        where: eq(conversations.userId, sessionResponse.user.id),
        orderBy: [conversations.lastMessageAt],
        with: {
          messages: {
            limit: 1,
            orderBy: [messages.createdAt],
          },
        },
      });

      return NextResponse.json(userConversations);
    }
  } catch (error: any) {
    console.error("Chat GET error:", error);
    return handleApiError(error);
  }
}
