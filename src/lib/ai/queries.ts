import { queryOptions } from "@tanstack/react-query";

import { $getChatRuntime } from "#/lib/ai/functions.ts";

export const chatRuntimeQueryOptions = () =>
  queryOptions({
    queryKey: ["chat-runtime"],
    queryFn: ({ signal }) => $getChatRuntime({ signal }),
    staleTime: Infinity,
  });
