import { getDevices } from "../utils/tuyaConnector";
import { extractSwitches } from "../utils/filters";

type Input = {
  /**
   * Optional case-insensitive substring to narrow the list by device name.
   * Omit it to return every device on the account.
   */
  nameContains?: string;
};

/**
 * Lists the Tuya devices on the account together with their switch data points,
 * so a later call knows which device name and switch code to act on.
 */
export default async function tool(input: Input) {
  const devices = await getDevices();
  const needle = input.nameContains?.trim().toLowerCase();

  const filtered = needle ? devices.filter((device) => device.name.toLowerCase().includes(needle)) : devices;

  return filtered.map((device) => ({
    id: device.id,
    name: device.name,
    category: device.category,
    online: device.online,
    switches: extractSwitches([device]).map(({ status }) => ({
      code: status.code,
      name: status.name ?? status.code,
      isOn: status.value === true,
    })),
  }));
}
