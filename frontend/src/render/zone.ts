export const renderZone = (zone: string) => {
  switch (zone) {
    case "SPACE":
      return "우주";
    case "EARTH":
      return "지구";
    default:
      return "";
  }
};
