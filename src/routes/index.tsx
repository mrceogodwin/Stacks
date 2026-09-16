import { createFileRoute } from "@tanstack/react-router";
import { StacksHome } from "@/components/stacks/home";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <StacksHome />;
}
