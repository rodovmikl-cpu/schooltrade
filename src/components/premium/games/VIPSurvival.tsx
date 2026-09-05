import { IframeGame } from "./IframeGame";

export const VIPSurvival = () => (
  <IframeGame
    src={`${import.meta.env.BASE_URL}premium-games/arena/index.html`}
    title="⚔️ Arena Survival"
    credit={{
      name: "canvas-vampire-survivors by ricardo-foundry",
      url: "https://github.com/ricardo-foundry/canvas-vampire-survivors",
      license: "MIT",
    }}
    controls="WASD / חצים לתנועה • מכה אוטומטית • אסוף XP • בחר שדרוגים בכל עלייה ברמה"
  />
);

export default VIPSurvival;
