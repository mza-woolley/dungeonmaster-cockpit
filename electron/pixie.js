/**
 * electron/pixie.js — SAL Pixie RGB Strip Controller (LT8915RGB/BT)
 *
 * Protocol: Telink BLE Mesh (reverse-engineered via google/python-dimond)
 * Credentials: mesh name + password (defaults: telink_mesh1 / 123)
 *
 * Pairing flow:
 *   1. Generate 8 random bytes
 *   2. Compute key_encrypt(name, password, randomBytes) → enc_data
 *   3. Write [0x0c, ...randomBytes, ...enc_data[0:8]] to Pair char (1914)
 *   4. Read back from Pair char → data2
 *   5. session_key = generate_sk(name, password, randomBytes, data2[1:9])
 *   6. All subsequent commands encrypted with session_key
 */

const noble  = require('@abandonware/noble');
const crypto = require('crypto');

// ── Telink mesh credentials ───────────────────────────────────────────────────
// SAL Pixie may use non-default credentials — try each until one works
// 421017430 = 0x191EBE56
const MESH_NET_LE = Buffer.from([0x56, 0xBE, 0x1E, 0x19]); // little-endian
const MESH_NET_BE = Buffer.from([0x19, 0x1E, 0xBE, 0x56]); // big-endian

const CREDENTIAL_SETS = [
  { name: 'Smart Light',  password: '209999' },   // confirmed working
  { name: 'Smart Light',  password: '123' },
  { name: 'Smart Light',  password: '209999' },   // netID
  { name: 'Smart Light',  password: '529' },      // ManufactureID
  { name: 'Smart Light',  password: 'Skytone' },  // OEM name
  { name: 'Smart Light',  password: 'skytone' },
  { name: 'Smart Light',  password: '000000' },
  { name: 'Smart Light',  password: '888888' },
  { name: 'Smart Light',  password: '666666' },
  { name: 'Smart Light',  password: '421017430' },
  { name: 'Smart Light',  password: MESH_NET_LE },
  { name: 'Smart Light',  password: MESH_NET_BE },
  { name: 'out_of_mesh',  password: '123' },
  { name: 'out_of_mesh',  password: '209999' },
  { name: 'out_of_mesh',  password: 'Skytone' },
  { name: 'telink_mesh1', password: '123' },
];
let MESH_NAME     = CREDENTIAL_SETS[0].name;
let MESH_PASSWORD = CREDENTIAL_SETS[0].password;
const VENDOR_ID   = 0x6969;  // confirmed from plist scene command bytes

// Known MAC address from Device Information characteristic
const DEVICE_MAC = '00:21:4D:44:61:1B';

// ── BLE characteristic UUIDs ──────────────────────────────────────────────────
const NOTIF_UUID  = '000102030405060708090a0b0c0d1911';
const CMD_UUID    = '000102030405060708090a0b0c0d1912';
const PAIR_UUID   = '000102030405060708090a0b0c0d1914';

// ── Telink AES crypto ─────────────────────────────────────────────────────────

function aesEncrypt(key, data) {
  const rKey  = Buffer.from(key).reverse();
  const rData = Buffer.from(data).reverse();
  const cipher = crypto.createCipheriv('aes-128-ecb', rKey, null);
  cipher.setAutoPadding(false);
  const enc = cipher.update(rData);
  return Array.from(enc).reverse();
}

function toCredBytes(val) {
  if (Buffer.isBuffer(val)) {
    const b = Buffer.alloc(16, 0); val.copy(b); return b;
  }
  return Buffer.from(String(val).padEnd(16, '\0'));
}

function generateSk(name, password, data1, data2) {
  const nb  = toCredBytes(name);
  const pb  = toCredBytes(password);
  const key = Array.from(nb).map((b, i) => b ^ pb[i]);
  const data = [...data1.slice(0, 8), ...data2.slice(0, 8)];
  return aesEncrypt(key, data);
}

function keyEncrypt(name, password, key) {
  const nb  = toCredBytes(name);
  const pb  = toCredBytes(password);
  const data = Array.from(nb).map((b, i) => b ^ pb[i]);
  return aesEncrypt(key, data);
}

function encryptPacket(sk, macData, packet) {
  const authNonce = [
    macData[0], macData[1], macData[2], macData[3], 0x01,
    packet[0], packet[1], packet[2], 15, 0, 0, 0, 0, 0, 0, 0
  ];
  const authenticator = aesEncrypt(sk, authNonce);
  for (let i = 0; i < 15; i++) authenticator[i] ^= packet[i + 5];
  const mac = aesEncrypt(sk, authenticator);
  packet[3] = mac[0];
  packet[4] = mac[1];

  const iv = [
    0, macData[0], macData[1], macData[2], macData[3], 0x01,
    packet[0], packet[1], packet[2], 0, 0, 0, 0, 0, 0, 0
  ];
  const tempBuffer = aesEncrypt(sk, iv);
  for (let i = 0; i < 15; i++) packet[i + 5] ^= tempBuffer[i];
  return packet;
}

// ── State ─────────────────────────────────────────────────────────────────────

let _peripheral    = null;
let _chars         = {};
let _sk            = null;
let _macData       = null;
let _packetCount   = Math.floor(Math.random() * 0xffff);
let _connected     = false;
let _connectPromise = null;

// ── BLE helpers ───────────────────────────────────────────────────────────────

function waitForPoweredOn() {
  return new Promise((resolve) => {
    if (noble.state === 'poweredOn') return resolve();
    noble.once('stateChange', s => { if (s === 'poweredOn') resolve(); });
  });
}

function scan() {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { noble.stopScanning(); reject(new Error('Scan timeout')); }, 12000);
    noble.on('discover', (p) => {
      const name = p.advertisement?.localName || '';
      if (name === 'Smart Light' || name.toLowerCase().includes('pixie')) {
        clearTimeout(t); noble.stopScanning(); noble.removeAllListeners('discover');
        console.log('[Pixie] Advertisement data:');
        console.log('  localName:', p.advertisement?.localName);
        console.log('  address:', p.address);
        console.log('  addressType:', p.addressType);
        if (p.advertisement?.manufacturerData) {
          console.log('  manufacturerData:', p.advertisement.manufacturerData.toString('hex'));
        }
        if (p.advertisement?.serviceData?.length) {
          p.advertisement.serviceData.forEach(sd => {
            console.log('  serviceData:', sd.uuid, sd.data.toString('hex'));
          });
        }
        resolve(p);
      }
    });
    noble.startScanning([], false);
  });
}

function discoverAll(peripheral) {
  return new Promise((resolve, reject) => {
    peripheral.discoverAllServicesAndCharacteristics((err, _s, chars) => {
      if (err) return reject(err);
      const map = {};
      chars.forEach(c => { map[c.uuid] = c; });
      resolve(map);
    });
  });
}

function writeChar(uuid, bytes) {
  return new Promise((resolve, reject) => {
    const c = _chars[uuid];
    if (!c) return reject(new Error(`Char ${uuid} not found`));
    c.write(Buffer.from(bytes), false, e => e ? reject(e) : resolve());
  });
}

function readChar(uuid) {
  return new Promise((resolve, reject) => {
    const c = _chars[uuid];
    if (!c) return reject(new Error(`Char ${uuid} not found`));
    c.read((e, d) => e ? reject(e) : resolve(d));
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Pairing ───────────────────────────────────────────────────────────────────

function waitForNotification(char, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { char.removeAllListeners('data'); resolve(null); }, timeoutMs);
    char.once('data', (data) => { clearTimeout(t); resolve(Array.from(data)); });
  });
}

async function pair() {
  const notifChar = _chars[NOTIF_UUID];

  for (const creds of CREDENTIAL_SETS) {
    MESH_NAME     = creds.name;
    MESH_PASSWORD = creds.password;

    const randomBytes = Array.from(crypto.randomBytes(8));
    const data        = [...randomBytes, 0, 0, 0, 0, 0, 0, 0, 0];
    const encData     = keyEncrypt(MESH_NAME, MESH_PASSWORD, data);
    const packet      = [0x0c, ...data.slice(0, 8), ...encData.slice(0, 8)];

    console.log(`[Pixie] Trying credentials: "${MESH_NAME}" / "${MESH_PASSWORD}"`);
    await writeChar(PAIR_UUID, packet);

    // Pair response arrives via notification, not by reading the pair char
    const notif = notifChar ? await waitForNotification(notifChar, 1000) : null;
    const data2 = notif || Array.from(await readChar(PAIR_UUID));
    console.log(`[Pixie] Pair response (${data2.length} bytes): ${Buffer.from(data2).toString('hex')}`);

    if (data2.length >= 9) {
      _sk = generateSk(MESH_NAME, MESH_PASSWORD, randomBytes, data2.slice(1, 9));
      console.log(`[Pixie] ✓ Paired with "${MESH_NAME}" / "${MESH_PASSWORD}"`);
      console.log('[Pixie] Session key:', Buffer.from(_sk).toString('hex'));
      return;
    }
  }
  throw new Error('All credential sets rejected — SAL Pixie may use proprietary credentials');
}

// ── Packet sending ────────────────────────────────────────────────────────────

async function sendPacket(target, command, data) {
  const packet = new Array(20).fill(0);
  packet[0] = _packetCount & 0xff;
  packet[1] = (_packetCount >> 8) & 0xff;
  packet[5] = target & 0xff;
  packet[6] = (target >> 8) & 0xff;
  packet[7] = command;
  packet[8] = VENDOR_ID & 0xff;
  packet[9] = (VENDOR_ID >> 8) & 0xff;
  for (let i = 0; i < data.length; i++) packet[10 + i] = data[i];

  const enc = encryptPacket(_sk, _macData, packet);
  _packetCount = (_packetCount + 1) % 65536 || 1;
  await writeChar(CMD_UUID, enc);
}

// ── Connection ────────────────────────────────────────────────────────────────

async function connect() {
  if (_connected) return;
  if (_connectPromise) return _connectPromise;

  _connectPromise = (async () => {
    await waitForPoweredOn();

    if (!_peripheral) {
      console.log('[Pixie] Scanning...');
      _peripheral = await scan();
      console.log(`[Pixie] Found: ${_peripheral.advertisement?.localName} (${_peripheral.address})`);
    }

    if (_peripheral.state !== 'connected') {
      await new Promise((res, rej) => _peripheral.connect(e => e ? rej(e) : res()));
      console.log('[Pixie] Connected');

      // Use known MAC address (macOS noble doesn't expose real BT MAC)
      const mac = DEVICE_MAC.split(':').map(b => parseInt(b, 16));
      _macData = [mac[5], mac[4], mac[3], mac[2], mac[1], mac[0]];

      _peripheral.once('disconnect', () => {
        console.log('[Pixie] Disconnected');
        _connected = false; _chars = {}; _sk = null; _peripheral = null; _connectPromise = null;
      });
    }

    _chars = await discoverAll(_peripheral);

    // Subscribe to notifications
    const notif = _chars[NOTIF_UUID];
    if (notif) {
      notif.subscribe();
      notif.on('data', d => console.log('[Pixie] Notify:', d.toString('hex')));
      await writeChar(NOTIF_UUID, [0x01]);
    }

    await pair();
    _connected = true;
    console.log('[Pixie] Ready');
  })();

  try { await _connectPromise; } finally { _connectPromise = null; }
}

function disconnect() {
  return new Promise(r => {
    if (!_peripheral || _peripheral.state !== 'connected') return r();
    _peripheral.disconnect(r);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

const DEVICE_ADDR = 0x001B; // mesh address assigned during provisioning

async function turnOn() {
  await connect();
  await sendPacket(0xffff, 0xed, [0x01]);
  console.log('[Pixie] On');
}

async function turnOff() {
  await connect();
  await sendPacket(0xffff, 0xed, [0x00]);
  console.log('[Pixie] Off');
}

async function setBrightness(percent) {
  await connect();
  // Brightness via color command keeping white, scaling brightness 0-255
  const br = Math.round(Math.max(0, Math.min(100, percent)) * 2.55);
  await sendPacket(DEVICE_ADDR, 0xC1, [0xff, 0xff, 0xff, br]);
  console.log(`[Pixie] Brightness: ${percent}%`);
}

async function setColor(r, g, b) {
  await connect();
  // Color: op=1 compound (0xC1), dst=device addr, data=[R,G,B,brightness]
  await sendPacket(DEVICE_ADDR, 0xC1, [r, g, b, 0xff]);
  console.log(`[Pixie] Color: rgb(${r},${g},${b})`);
}

// ── Test runner ───────────────────────────────────────────────────────────────

async function probeCommands() {
  await connect();
  await delay(500);

  const target = 0x001B; // device mesh address = 27
  _macData = [0x1B, 0x61, 0x44, 0x4D, 0x21, 0x00];

  // ON
  await writeChar(CMD_UUID, buildPacket(0xffff, 0xed, [0x01]));
  await delay(800);

  // Color: op=1, op_type=3 → 0xC1, data=[R,G,B,brightness], dst=device addr
  console.log('--- Red ---');
  await writeChar(CMD_UUID, buildPacket(target, 0xC1, [0xff, 0x00, 0x00, 0xff]));
  await delay(1500);

  console.log('--- Green ---');
  await writeChar(CMD_UUID, buildPacket(target, 0xC1, [0x00, 0xff, 0x00, 0xff]));
  await delay(1500);

  console.log('--- Blue ---');
  await writeChar(CMD_UUID, buildPacket(target, 0xC1, [0x00, 0x00, 0xff, 0xff]));
  await delay(1500);

  console.log('--- White 50% bright ---');
  await writeChar(CMD_UUID, buildPacket(target, 0xC1, [0xff, 0xff, 0xff, 0x80]));
  await delay(1500);

  console.log('--- OFF ---');
  await writeChar(CMD_UUID, buildPacket(0xffff, 0xed, [0x00]));
}

function buildPacket(target, command, data, vendorId = VENDOR_ID) {
  const packet = new Array(20).fill(0);
  packet[0] = _packetCount & 0xff;
  packet[1] = (_packetCount >> 8) & 0xff;
  packet[5] = target & 0xff;
  packet[6] = (target >> 8) & 0xff;
  packet[7] = command;
  packet[8] = vendorId & 0xff;
  packet[9] = (vendorId >> 8) & 0xff;
  for (let i = 0; i < data.length; i++) packet[10 + i] = data[i];
  const enc = encryptPacket(_sk, _macData, packet);
  _packetCount = (_packetCount + 1) % 65536 || 1;
  return enc;
}

async function runTest() {
  setTimeout(() => { console.error('[Pixie] Global timeout — exiting'); process.exit(1); }, 30000);
  try {
    await connect();
    await turnOn();
    await delay(500);
    for (let i = 0; i < 4; i++) {
      await setColor(255, 0, 0); await delay(300);
      await setColor(0, 0, 255); await delay(300);
    }
    console.log('[Pixie] ✓ Done');
  } catch (err) {
    console.error('[Pixie] ✗', err.message);
  } finally {
    await disconnect();
    process.exit(0);
  }
}

if (require.main === module) runTest();

module.exports = { connect, disconnect, setColor, setBrightness, turnOn, turnOff };
