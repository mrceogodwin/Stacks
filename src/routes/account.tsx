import { createFileRoute } from "@tanstack/react-router";
import { AccountDesk } from "@/components/stacks/account-desk";

export const Route = createFileRoute("/account")({ component: AccountDesk });
