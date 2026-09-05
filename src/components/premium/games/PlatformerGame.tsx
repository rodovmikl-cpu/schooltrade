import { IframeGame } from "./IframeGame";

export const PlatformerGame = () => (
  <IframeGame
    src={`${import.meta.env.BASE_URL}premium-games/platformer/index.html`}
    title="⬛ Infinite Mario"
    credit={{
      name: "Infinite Mario HTML5 by Robert Kleffner (port of Notch's Infinite Mario)",
      url: "https://github.com/robertkleffner/marioHTML5",
      license: "Unlicense (Public Domain)",
    }}
    controls="חצים לתנועה • S לקפיצה • A לריצה/ירי • שלבים אינסופיים"
    aspect="4 / 3"
  />
);

export default PlatformerGame;
