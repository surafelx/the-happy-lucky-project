"use client";

import { useState } from "react";

/**
 * A YouTube video that costs nothing until it is played: the page shows the
 * video's own thumbnail with a play button, and the player iframe is only
 * created on click, from the no-cookie domain. With no id yet, a labelled
 * placeholder holds the spot.
 */
export function YouTubeEmbed({ id, title, tone = "rose" }: { id: string; title: string; tone?: "teal" | "rose" | "gold" }) {
  const [playing, setPlaying] = useState(false);

  if (!id) {
    return (
      <div className={`yt yt-empty ${tone}`} role="img" aria-label="Video coming">
        <span className="yt-play" aria-hidden="true">▶</span>
        <span>Video coming</span>
      </div>
    );
  }

  if (playing) {
    return (
      <div className={`yt ${tone}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button type="button" className={`yt yt-poster ${tone}`} onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail, one fixed size */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
      <span className="yt-play" aria-hidden="true">▶</span>
      <span className="yt-label">{title}</span>
    </button>
  );
}
