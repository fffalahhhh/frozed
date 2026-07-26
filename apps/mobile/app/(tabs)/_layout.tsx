import { useTheme } from "@react-navigation/native";
import {
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor="#1B4332"
    >
      <NativeTabs.Trigger name="index">
        <Label>Orders</Label>
        <Icon
          sf="fork.knife"
          androidSrc={require("../../assets/icon.png")}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <Label>History</Label>
        <Icon
          sf="doc.plaintext"
          androidSrc={require("../../assets/icon.png")}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inventory">
        <Label>Inventory</Label>
        <Icon
          sf="shippingbox"
          androidSrc={require("../../assets/icon.png")}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analytics">
        <Label>Analytics</Label>
        <Icon
          sf="chart.bar.fill"
          androidSrc={require("../../assets/icon.png")}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
