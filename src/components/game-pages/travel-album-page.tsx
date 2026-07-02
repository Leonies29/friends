"use client";

import { motion } from "framer-motion";
import { ExternalLink, Images } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { PageShell } from "@/components/game-pages/page-shell";
import { useActiveGroup } from "@/hooks/use-active-group";
import { SHARED_ALBUM_URL } from "@/lib/game-data";
import { listGames } from "@/services/game-service";

export function TravelAlbumPage() {
  const { group } = useActiveGroup();
  const [albumUrl, setAlbumUrl] = useState(SHARED_ALBUM_URL);

  useEffect(() => {
    if (!group?.id) return;
    void listGames(group.id).then((games) => {
      const photoGame = games.find((game) => game.category === "photo" && !game.archived);
      setAlbumUrl(photoGame?.settings?.albumUrl ?? SHARED_ALBUM_URL);
    });
  }, [group?.id]);

  function openAlbum() {
    if (typeof window === "undefined") return;
    window.open(albumUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <PageShell
      eyebrow="Travel Album"
      title="Shared Travel Album"
      description="All photos and videos from the trip live in our shared Apple Photos album. Nothing is stored inside Istanbul Quest."
    >
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="overflow-hidden bg-[#f6ead8] p-0">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <Badge>External album</Badge>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl">📸</span>
                <div>
                  <h2 className="text-3xl font-black">Apple Photos</h2>
                  <p className="mt-2 max-w-xl text-muted-foreground">
                    Open the shared album to browse, upload, and relive every moment from Istanbul.
                  </p>
                </div>
              </div>
            </div>
            <Button size="lg" onClick={openAlbum}>
              <ExternalLink className="h-4 w-4" />
              Open Shared Album
            </Button>
          </div>
          <div className="border-t border-border bg-white/70 p-4 text-sm text-muted-foreground">
            <Images className="mr-2 inline h-4 w-4" />
            Desktop opens a new tab. Mobile opens the album directly.
          </div>
        </Card>
      </motion.div>
    </PageShell>
  );
}
