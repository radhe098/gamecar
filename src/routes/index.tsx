import { createFileRoute } from "@tanstack/react-router";
import { DriftApp } from "@/game/DriftApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <DriftApp />;
}
