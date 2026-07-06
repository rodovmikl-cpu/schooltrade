import { IframeGame } from "./IframeGame";

export const TowerDefense = () => (
  <IframeGame
    src="/premium-games/td/index.html"
    title="🧱 Tower Defense"
    credit={{
      name: "HTML5 Tower Defense by oldj",
      url: "https://github.com/oldj/html5-tower-defense",
      license: "MIT",
    }}
    controls="לחץ על מגדל כדי לבנות • שדרג מגדלים • הגן על הבסיס מפני גלי אויבים"
  />
);

export default TowerDefense;
