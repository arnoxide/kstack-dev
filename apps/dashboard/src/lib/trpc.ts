"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@kasify/api";

export const trpc = createTRPCReact<AppRouter>();
