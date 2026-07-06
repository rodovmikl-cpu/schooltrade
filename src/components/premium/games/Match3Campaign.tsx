import { IframeGame } from "./IframeGame";

export const Match3Campaign = () => (
  <IframeGame
    src="/premium-games/match3/index.html"
    title="🧩 Match-3"
    credit={{
      name: "Match-3 Game HTML5 by Rembound",
      url: "https://github.com/rembound/Match-3-Game-HTML5",
      license: "MIT",
    }}
    controls="גרור אבן כדי להחליף • צור שלישיות או יותר • שרשראות משחקות אוטומטית"
    aspect="4 / 3"
  />
);

export default Match3Campaign;
