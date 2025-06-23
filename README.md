# Proxy Cache Server with Custom Redis Implementation

## Overview
This project implements a secure proxy server with a custom Redis-like caching mechanism. It is designed to cache HTTP responses and reduce latency for repeated requests. Both the proxy server and the custom Redis server are implemented in Node.js. The proxy server runs on Windows, while the Redis server operates within WSL (Windows Subsystem for Linux). Communication is secured via a VPN, and packet exchange is analyzed using Wireshark.

## Architecture
- **Proxy Cache Server:** Runs on Windows using Node.js.
- **Custom Redis Server:** Runs inside WSL (Ubuntu) using Node.js.
- **VPN:** Used to tunnel and secure TCP traffic between the proxy server and Redis.
- **Wireshark:** Utilized to inspect and analyze TCP communication.

## Key Features
- Custom Redis server implemented in Node.js supporting RESP (REdis Serialization Protocol).
- URL normalization and sanitization to prevent cache poisoning.
- Efficient caching of HTTP responses.
- Support for path `/` and specified URLs.

## Setup Instructions

### 1. Prerequisites
- Windows 10/11 with WSL 2 installed
- Node.js installed on both Windows and WSL
- VPN setup (OpenVPN or WireGuard)
- Wireshark installed on Windows

### 2. Custom Redis Server in WSL
1. Launch WSL (Ubuntu shell)
2. Clone the Redis server implementation:
```bash
git clone https://github.com/your-repo/custom-redis-server.git
cd custom-redis-server
npm install
node server.js
```
3. The server listens on default Redis port `6379`.

### 3. Proxy Cache Server on Windows
1. Clone the proxy server repo:
```bash
git clone https://github.com/your-repo/proxy-cache-server.git
cd proxy-cache-server
npm install
```
2. Configure `.env` with Redis server address (use broadcast address or VPN IP):
```env
REDIS_HOST=192.168.xx.xx
REDIS_PORT=6379
```
3. Run the proxy server:
```bash
npm run dev
```

### 4. Wireshark Usage
- Open Wireshark on Windows.
- Select the network interface used by VPN.
- Set display filter: `tcp.port == 6379`
- Inspect TCP packets to monitor communication between proxy and Redis.

## Usage
- Access the proxy server using your browser:
```
http://localhost:PORT/
```
- To cache a specific site:
```
http://localhost:PORT/http://example.com
```

## RESP Protocol Implementation
- The custom Redis server follows RESP protocol:
  - `*<number of elements>\r\n`
  - `$<number of bytes of first element>\r\n`
  - `<element data>\r\n`
- Example SET command:
```text
*3
$3
SET
$3
key
$5
value
```

- Example GET command:
```text
*2
$3
GET
$3
key
```

## Notes
- Ensure VPN is active to tunnel traffic.
- Use Wireshark to verify that traffic is correctly routed via VPN and not leaking.

---

If you need further clarification or a complete zipped package with example code and this README included, feel free to ask!
