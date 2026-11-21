import { MyComposition } from "./Composition";
import { CreelComposiciones } from "./creel/Root";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <CreelComposiciones />
    </>
  );
};
