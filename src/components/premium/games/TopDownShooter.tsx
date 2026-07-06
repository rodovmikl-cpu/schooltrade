import { IframeGame } from "./IframeGame";

export const TopDownShooter = () => (
  <IframeGame
    src="/premium-games/shooter/index.html"
    title="🔫 Onslaught Arena"
    credit={{
      name: "Onslaught! Arena by Lost Decade Games",
      url: "https://github.com/lostdecade/onslaught_arena",
      license: "MIT",
    }}
    controls="WASD לתנועה • עכבר לכיוון • קליק לירי • שרוד גלי אויבים"
  />
);

export default TopDownShooter;
