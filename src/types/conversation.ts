import type { ChatMessage } from "./chat";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

export const MAX_TITLE_CHARS = 200;
