import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../axiosInstance";
import { Chat } from "@/types";

export function useProjectChats(projectId: string) {
  return useQuery({
    queryKey: ["projectChats", projectId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/project/${projectId}/chats`);
      return res.data.data.chats as Chat[];
    },
    enabled: !!projectId,
  });
}
