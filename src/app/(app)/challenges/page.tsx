import { CheckCircle2, LockKeyhole, Upload } from "lucide-react";
import { Badge, Button, Card, Field, TextArea } from "@/components/ui";
import { challenges, currentUser } from "@/lib/mock-data";

const examples = {
  Easy: ["Get someone to say \"Amazing\"", "Use \"This feels surprisingly historical\" three times"],
  Medium: ["Have a conversation using only questions", "Convince someone cats secretly run Istanbul"],
  Hard: ["Make the whole group laugh", "Get a stranger to rate your imaginary invention"]
};

export default function ChallengesPage() {
  const myChallenges = challenges.filter((challenge) => challenge.ownerId === currentUser.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section className="grid gap-4">
        <div>
          <Badge>Secret Daily Challenges</Badge>
          <h1 className="mt-3 font-display text-5xl font-black">Only You Can See This</h1>
          <p className="mt-2 text-muted-foreground">Submit proof, let an admin approve it, and collect XP. Totally normal vacation behavior.</p>
        </div>
        {myChallenges.map((challenge) => (
          <Card key={challenge.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge>{challenge.difficulty} � {challenge.xpReward} XP</Badge>
                <h2 className="mt-3 text-3xl font-black">{challenge.title}</h2>
                <p className="mt-2 text-muted-foreground">{challenge.description}</p>
              </div>
              <LockKeyhole className="h-10 w-10 text-accent" />
            </div>
            <form className="mt-6 grid gap-4">
              <Field label="Photo proof" type="file" />
              <Field label="Video URL" placeholder="https://..." />
              <TextArea label="Description proof" placeholder="Describe exactly how ridiculous this got." />
              <Button type="button">
                <Upload className="h-4 w-4" />
                Submit Proof
              </Button>
            </form>
          </Card>
        ))}
      </section>

      <Card className="h-fit">
        <Badge>Challenge Library</Badge>
        <h2 className="mt-3 text-3xl font-black">Examples for Admins</h2>
        <div className="mt-5 grid gap-4">
          {Object.entries(examples).map(([difficulty, items]) => (
            <div key={difficulty} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
              <h3 className="font-black">{difficulty}</h3>
              <div className="mt-3 grid gap-2">
                {items.map((item) => (
                  <p key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
