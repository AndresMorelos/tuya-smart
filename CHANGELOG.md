# Tuya Smart Changelog

## [Redesigned List, Error Handling, Light Controls, Menu Bar and AI Tools] - {PR_MERGE_DATE}

- Redesigned the device list. Devices are grouped by what they do (Controls, Sensors,
  Locks) and each one now appears exactly once; sockets used to be listed twice, once
  as a device and again as a bare "switch_1" row.
- Readings are now formatted: a temperature that arrived as "294" reads as 29.4°C, a
  contact sensor says Open or Closed instead of true or false, and battery level is
  shown next to each device that has one.
- Devices needing attention, such as a flat battery, are flagged in the list.
- Encoded internal data points are hidden from the details view; a smart lock went from
  22 rows of mostly base64 to the 11 that mean something.
- Offline devices are now marked as such.
- Device categories always show their readable name instead of codes like "cz".
- Refreshing now takes one request for the whole account instead of one per device.
- Tuya API failures are now reported instead of being swallowed. An expired IoT Core
  subscription previously showed an endless loading spinner or an empty device list
  with no explanation; it now shows what went wrong and what to do about it.
- Added brightness and colour temperature control for light devices, using each
  product's own reported range.
- Added a menu bar command to toggle pinned switches without opening Raycast.
- Added AI tools to list devices, toggle a switch, and set brightness by voice or chat.
- Fixed the device details view showing a meaningless "Active Time".
- Fixed devices with identical names hiding each other in the list.
- Fixed the On/Off filter not applying to the devices section.
- Fixed turning a switch off reporting that it had been turned on.
- The rename form now opens with the current name instead of an empty field.
- The details view of an unrecognised device category now lists its data points
  instead of rendering nothing.
- Added local network control as a fallback: when the Tuya cloud is unavailable
  because the IoT Core subscription has lapsed, the extension keeps working from its
  cached device list and sends commands directly to devices on the same network.
- Updated to Raycast API 2.0 and resolved outstanding axios security advisories.

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Fix] - 2026-05-15

Fixed a bug that caused the extension to crash when no older devices were listed

## [Enhancement] - 2026-01-15

- Added switches in root search

## [Fix] - 2026-01-07

Fixed an error that caused the extension to crash

## [Enhancement] - 2023-02-28

- Added commands to set Status and Work Mode for Light Source devices.

## [Fix Action] - 2023-02-12

- Fixed Pin Device Action

## [Initial Version] - 2023-02-09

- Added Tuya Smart Command
- Added Support for Switches
- Added Support for Courtains
- Added Support for Sockets
