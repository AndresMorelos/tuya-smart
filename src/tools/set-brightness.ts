import { Tool } from "@raycast/api";
import { controlDevice, loadDevicesWithFallback } from "../utils/deviceSource";
import { findDeviceByName } from "../utils/deviceLookup";
import { findBrightness, findColorTemp, parseRange, percentToRaw } from "../utils/lightFunctions";

type Input = {
  /** The light's name as it appears in the Tuya app. */
  deviceName: string;
  /** Target level from 0 to 100 percent. */
  percent: number;
  /**
   * Which property to set. "brightness" is the default; "colorTemperature" moves the
   * white balance from warmest at 0 to coolest at 100.
   */
  property?: "brightness" | "colorTemperature";
};

async function resolve(input: Input) {
  const { devices } = await loadDevicesWithFallback();
  const device = findDeviceByName(devices, input.deviceName);
  if (!device) {
    throw new Error(`No device named "${input.deviceName}". Use the list-devices tool to see the available names.`);
  }

  const wantsColorTemp = input.property === "colorTemperature";
  const target = wantsColorTemp ? findColorTemp(device) : findBrightness(device);
  if (!target) {
    throw new Error(`"${device.name}" does not support ${wantsColorTemp ? "colour temperature" : "brightness"}.`);
  }

  const range = parseRange(target.values);
  return { device, target, raw: percentToRaw(input.percent, range), wantsColorTemp };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { device, wantsColorTemp } = await resolve(input);
  return {
    message: `Set ${wantsColorTemp ? "colour temperature" : "brightness"} on ${device.name} to ${input.percent}%?`,
    info: [
      { name: "Device", value: device.name },
      { name: "Property", value: wantsColorTemp ? "Colour temperature" : "Brightness" },
      { name: "Level", value: `${input.percent}%` },
    ],
  };
};

/** Sets the brightness or colour temperature of a Tuya light, as a percentage. */
export default async function tool(input: Input) {
  const { device, target, raw, wantsColorTemp } = await resolve(input);

  const transport = await controlDevice(device, { ...target, value: raw });
  const via = transport === "local" ? " over the local network" : "";

  return `Set ${wantsColorTemp ? "colour temperature" : "brightness"} on ${device.name} to ${input.percent}%${via}.`;
}
