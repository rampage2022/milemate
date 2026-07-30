import Ionicons from '@expo/vector-icons/Ionicons';

import { HOME_ICON_ION, type HomeIconToken } from '@/components/home/home-icon-tokens';

type HomeIconProps = {
  color: string;
  name: HomeIconToken;
  size: number;
};

/** Android / web: closest outline Ionicons to the approved home mockup. */
export function HomeIcon({ color, name, size }: HomeIconProps) {
  return <Ionicons color={color} name={HOME_ICON_ION[name]} size={size} />;
}
