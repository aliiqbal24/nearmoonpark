"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ParkHub } from "@/app/components/park-hub";
import type { Config } from "@/lib/moon/near";
import cfg from "@/public/moon-v8-config.json";
import "../../moonpark.css";

export default function ArchivedParks() {
  const router = useRouter();
  const [identity, setIdentity] = useState({ name: "Moonpark", emblem: 0 });
  const [message, setMessage] = useState("");
  return (
    <main className="mp-legacy-claims">
      <Link href="/">← Return to Moonpark</Link>
      <h1>Your earlier parks</h1>
      <p>
        This desk opens the v8 contract using the account keys saved in this
        browser. Your published parks, licenses and creator earnings belong to
        that version. You can back up an account, claim its park or collect its
        earnings here. A saved permanent park resumes from the main game.
      </p>
      {message && <p role="status">{message}</p>}
      <ParkHub
        cfg={cfg as Config}
        state={null}
        identity={identity}
        onIdentity={setIdentity}
        action={() =>
          setMessage("Open the main game to resume an earlier saved day.")
        }
        onUse={() => setMessage("This license belongs to your v8 park.")}
        onPlay={() => router.push("/?resumeVersion=moonpark-v8")}
      />
      <p>
        <Link href="/archive/v7">Earlier v7 parks</Link>
      </p>
    </main>
  );
}
