"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Button variant="secondary" size="sm" onClick={() => setEnabled((value) => !value)} aria-label="Toggle sound effects">
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      <span className="hidden sm:inline">SFX {enabled ? "On" : "Off"}</span>
    </Button>
  );
}
