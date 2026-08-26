import type { JSX } from "react";
import { Device, FunctionItem } from "../utils/interfaces";
import { findBrightness, findColorTemp } from "../utils/lightFunctions";
import { CommandList } from "./list";

/** Status entries a user can actually act on from the command list. */
function actionableStatuses(device: Device): FunctionItem[] {
  return (device.status ?? []).filter(
    (status) => typeof status.value === "boolean" || typeof status.value === "number",
  );
}

export function DeviceCommands(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  let commands: FunctionItem[];

  switch (device.category) {
    case "Switch":
    case "kg":
    case "Socket": {
      commands = (device.status ?? []).filter((status) => typeof status.value === "boolean");
      break;
    }
    case "cl":
    case "Curtain": {
      commands = [
        { code: "control", value: "open", name: "Open" },
        { code: "control", value: "close", name: "Close" },
        { code: "control", value: "stop", name: "Stop" },
      ];
      break;
    }
    case "dj":
    case "Light Source": {
      const brightness = findBrightness(device);
      const colorTemp = findColorTemp(device);
      commands = [
        {
          code: "switch_led",
          value: (device.status ?? []).find((status) => status.code === "switch_led")?.value,
          name: "Toggle On/Off",
        },
        ...(brightness ? [{ ...brightness, name: "Brightness" }] : []),
        ...(colorTemp ? [{ ...colorTemp, name: "Colour Temperature" }] : []),
        { code: "work_mode", value: "white", name: "Workmode: White" },
        { code: "work_mode", value: "colour", name: "Workmode: Colour" },
        { code: "work_mode", value: "scene", name: "Workmode: Scene" },
        { code: "work_mode", value: "music", name: "Workmode: Music" },
      ];
      break;
    }
    default:
      // Previously an empty view; now it lists whatever the device actually reports.
      commands = actionableStatuses(device);
  }

  return <CommandList commands={commands} device={device} onAction={props.onAction} />;
}
