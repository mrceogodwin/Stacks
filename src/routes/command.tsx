import { createFileRoute } from "@tanstack/react-router";
import { StudioAdmin } from "@/components/stacks/studio";

export const Route = createFileRoute("/command")({ component: StudioAdmin });
