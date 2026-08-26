import { Tool } from "@raycast/api";
import { getDevices, sendCommand } from "../utils/tuyaConnector";
import { findDeviceByName, findSwitchOnDevice } from "../utils/deviceLookup";

type Input = {
  /** The device name as it appears in the Tuya app, for example "Living Room Lamp". */
  deviceName: string;
  /**
   * Which switch to act on when the device exposes several, given as its name or
   * data point code. Omit it for a device with a single switch.
   */
  switchName?: string;
  /** The state to set. Omit it to flip the switch to the opposite of its current state. */
  turnOn?: boolean;
};

async function resolve(input: Input) {
  const devices = await getDevices();
  const device = findDeviceByName(devices, input.deviceName);
  if (!device) {
    throw new Error(`No device named "${input.deviceName}". Use the list-devices tool to see the available names.`);
  }
  const target = findSwitchOnDevice(device, input.switchName);
  if (!target) {
    throw new Error(`"${device.name}" has no switch that can be toggled.`);
  }
  const nextValue = input.turnOn ?? target.value !== true;
  return { device, target, nextValue };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { device, target, nextValue } = await resolve(input);
  return {
    message: `Turn ${nextValue ? "on" : "off"} "${target.name ?? target.code}" on ${device.name}?`,
    info: [
      { name: "Device", value: device.name },
      { name: "Switch", value: target.name ?? target.code },
      { name: "New state", value: nextValue ? "On" : "Off" },
    ],
  };
};

/** Turns a switch on a Tuya device on or off. */
export default async function tool(input: Input) {
  const { device, target, nextValue } = await resolve(input);

  await sendCommand({
    device_id: device.id,
    commands: [{ code: target.code, value: nextValue }],
  });

  return `Turned ${nextValue ? "on" : "off"} "${target.name ?? target.code}" on ${device.name}.`;
}
