// Loaded only by `lazy` in lesson 04, so Vite emits it as its own chunk and the
// browser never downloads it unless someone visits /settings. Watch the network
// tab: the request happens on the navigation.
import { useLoaderData } from "react-router";

export async function loader(): Promise<{ loadedAt: string }> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { loadedAt: new Date().toLocaleTimeString() };
}

export default function SettingsPanel() {
  const { loadedAt } = useLoaderData<{ loadedAt: string }>();

  return (
    <div data-testid="settings">
      <h4>Settings</h4>
      <p>
        This component and its loader arrived together, in a chunk requested when you navigated
        here. Loaded at {loadedAt}.
      </p>
    </div>
  );
}
