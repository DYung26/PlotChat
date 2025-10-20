import { create } from "zustand";

type ChatStore = {
  pendingMessage?: string;
  pendingInstructions?: string[];
  pendingExtension?: string;
  pendingFiles?: File[];
  setPendingMessage: (msg?: string) => void;
  setPendingInstructions: (instructions?: string[]) => void;
  setPendingExtension: (extension?: string) => void;
  setPendingFiles: (files?: File[]) => void;
  clearPending: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  pendingMessage: undefined,
  pendingFiles: undefined,
  setPendingMessage: (msg) => set({ pendingMessage: msg }),
  setPendingInstructions: (instructions) => set({ pendingInstructions: instructions }),
  setPendingExtension: (extension) => set({ pendingExtension: extension }),
  setPendingFiles: (files) => set({ pendingFiles: files }),
  clearPending: () => set({ pendingMessage: undefined, pendingInstructions: undefined, pendingFiles: undefined }),
}));
