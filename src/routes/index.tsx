import { createFileRoute } from "@tanstack/react-router";
import { MahoragaConsole } from "@/components/mahoraga/console";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MahoragaConsole />;
}
