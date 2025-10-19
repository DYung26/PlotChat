import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import { Project } from "@/types";

export function useProjects(userId: string) {
  return useQuery({
    queryKey: ["projects", userId],
    queryFn: async () => {
      const res = await axiosInstance.get("/project");
      return res.data.data as Project[];
    },
  });
}
