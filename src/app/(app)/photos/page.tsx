import { Expand, Flame, Heart, Laugh, Trash2, Upload } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, TextArea } from "@/components/ui";
import { currentUser, photos } from "@/lib/mock-data";

const reactions = [
  { type: "Funny", icon: Laugh, xp: 5 },
  { type: "Legendary", icon: Flame, xp: 10 },
  { type: "Favorite", icon: Heart, xp: 5 }
];

export default function PhotosPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="h-fit">
        <Badge>Firebase Storage Ready</Badge>
        <h1 className="mt-3 font-display text-4xl font-black">Private Photo Wall</h1>
        <p className="mt-2 text-muted-foreground">Upload photos, react for XP, and preserve evidence of every questionable group decision.</p>
        <form className="mt-6 grid gap-4">
          <Field label="Photo file" type="file" />
          <TextArea label="Caption" placeholder="Explain this masterpiece." />
          <Button type="button">
            <Upload className="h-4 w-4" />
            Upload Photo
          </Button>
        </form>
      </Card>

      <section className="columns-1 gap-5 sm:columns-2 xl:columns-3">
        {photos.map((photo) => (
          <Card key={photo.id} className="mb-5 break-inside-avoid overflow-hidden p-0">
            <div className="relative">
              <img src={photo.imageUrl} alt={photo.caption} className="w-full object-cover" />
              <Button variant="secondary" size="sm" className="absolute right-3 top-3">
                <Expand className="h-4 w-4" />
                View
              </Button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar src={photo.ownerAvatar} alt={photo.ownerName} />
                <div>
                  <p className="font-black">{photo.ownerName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(photo.createdAt).toLocaleString("en")}</p>
                </div>
              </div>
              <p className="mt-4 text-sm">{photo.caption}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {reactions.map((reaction) => {
                  const Icon = reaction.icon;
                  return (
                    <Button key={reaction.type} variant="secondary" size="sm">
                      <Icon className="h-4 w-4" />
                      {reaction.type} +{reaction.xp}
                    </Button>
                  );
                })}
              </div>
              {photo.ownerId === currentUser.id && (
                <Button variant="ghost" size="sm" className="mt-3 text-rose-500">
                  <Trash2 className="h-4 w-4" />
                  Delete own photo
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
