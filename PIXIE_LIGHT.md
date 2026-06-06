# SAL Pixie RGB Strip Controller — BLE Integration Notes

## Device
- **Model:** LT8915RGB/BT ("Smart Light" in BLE)
- **MAC:** `00:21:4D:44:61:1B`
- **Mesh Address:** 27 (0x1B) — assigned by Pixie app during provisioning

## BLE Credentials (Telink Mesh)
- **Mesh Name:** `Smart Light`
- **Mesh Password:** `209999` (the home's netID from the Pixie app)
- These are set by the Pixie app when the device is added. If the device is factory reset, it temporarily accepts `Smart Light` / `123` until re-provisioned.

## GATT Characteristics
All under service `00010203-0405-0607-0809-0A0B0C0D1910`:
| UUID suffix | Name   | Properties              | Purpose                     |
|-------------|--------|-------------------------|-----------------------------|
| `...1911`   | Status | Read, Write, Notify     | Pair response / status      |
| `...1912`   | Command| Read, Write, WriteNoResp| Encrypted command channel   |
| `...1913`   | OTA    | Read, WriteNoResp       | Firmware (do NOT write here)|
| `...1914`   | Pair   | Read, Write             | Pairing handshake           |

## Protocol: Telink Proprietary Mesh
Implemented in `electron/pixie.js` based on `google/python-dimond`.

### Pairing (on every connect)
1. Generate 8 random bytes + 8 zero bytes = 16-byte `data`
2. `enc = keyEncrypt(name, password, data)` — AES-ECB with reversed (name XOR password) as key
3. Write `[0x0C, ...data[0:8], ...enc[0:8]]` to Pair char (1914)
4. Read back from Pair char — expect 17-byte `0x0D...` response
5. `sessionKey = generateSk(name, password, data[0:8], response[1:9])`

### Packet Encryption
All commands sent to Command char (1912) are 20-byte AES-encrypted packets.
See `encryptPacket()` in `electron/pixie.js`.

## Command Opcodes
Compound byte = `(op_type << 6) | op`

| Command     | op | op_type | Byte | Vendor   | Destination | Data              |
|-------------|-----|---------|------|----------|-------------|-------------------|
| Turn ON     | 45  | 3       | 0xED | 0x6969   | 0xFFFF      | `[0x01]`          |
| Turn OFF    | 45  | 3       | 0xED | 0x6969   | 0xFFFF      | `[0x00]`          |
| Set Color   | 1   | 3       | 0xC1 | 0x6969   | 0x001B      | `[R, G, B, br]`   |

- `br` = brightness 0–255
- Destination for color/brightness is device mesh address (27 = 0x1B), not broadcast
- ON/OFF uses broadcast destination (0xFFFF)

## Source File
`electron/pixie.js` — full implementation including connect, pair, setColor, setBrightness, turnOn, turnOff.

## Factory Reset
Power cycle the controller 5× rapidly (off→on×5). Light flashes to confirm.
After reset, device accepts `Smart Light` / `123` until re-provisioned by Pixie app.
Re-provisioning changes password to netID (`209999`).

## Confirmed Working
- `turnOn()` / `turnOff()` — works via broadcast (0xFFFF)
- `setColor(r, g, b)` — works, sends to device addr 0x001B
- `setBrightness(percent)` — implemented (untested standalone, uses setColor with white)
- Rapid flash test (red/blue × 4 at 300ms intervals) — confirmed working ✓

## Next Task
Integrate into DM Cockpit UI:
- Add Pixie tab/section alongside existing Nanoleaf controls
- Configurable color picker + brightness slider
- Link Pixie color to Nanoleaf scene changes (when a Nanoleaf scene is activated, also set a matching Pixie color)
- IPC channel: `pixie:setColor`, `pixie:setBrightness`, `pixie:turnOn`, `pixie:turnOff`
- Add `electron/pixie.js` handlers to `electron/main.js` (same pattern as `nanoleaf.js`)

## Key Discovery Path
- Credentials found via Pixie app plist: `~/Library/Containers/3E174C99-.../com.sal.pixie.plist`
- Command opcodes found via app log: `~/Library/Containers/3E174C99-.../Documents/widgets/logs/log-YYYY-MM-DD.log`
- Vendor ID (0x6969) and ON/OFF opcode (0xED) from stored scene bytes in plist
- Color opcode (0xC1) from `send pkt` entries in app log (`st_pkt_setState_t`)
