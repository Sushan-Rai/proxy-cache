const net = require("net");
const logger = require("./logger")("index");
const express = require("express");
const axios = require("axios");
const dns = require('dns').promises;
const { URL } = require('url');

const app = express();
const ALLOWED_DOMAINS = ['proxy-frontend-omega.vercel.app','example.com', 'wikipedia.org', 'openai.com'];

function isDomainAllowed(hostname) {
    return ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain));
}

function isPrivateIP(ip) {
    return (
        ip.startsWith('10.') ||
        ip.startsWith('172.') ||
        ip.startsWith('192.168') ||
        // ip.startsWith('127.') ||
        ip === '0.0.0.0' ||
        ip === '::1'
    );
}

const onError = (err) => {
    reject(err);
};

let redisClient = net.createConnection({ host: "10.0.0.1",port: 6379 });

const cacheMiddleware = async (req, res, next) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        logger.log(`Checking cache for: ${targetUrl}`);

        let wordlength = await sendCommand(`LLEN ${targetUrl}`);
        wordlength =  parseInt(wordlength.replace(/^:/, ""))
        logger.log(wordlength)

        if (wordlength && wordlength !== 0) {
            const cachedResponse = await sendCommand(`LRANGE ${targetUrl} 1 ${wordlength}`);
            logger.log("Cache hit!");

            const lines = cachedResponse.split(/\r?\n/); 

            const extracted = lines.filter(line => line.startsWith('"')).map(line => {
                return line.replace(/^"(.*)"$/, '$1');
            });
            
            const result = extracted.join(' ');
            
            logger.log("Extracted HTML:", result);
            
            res.setHeader('x-cache-status', 'HIT');
            res.set('Content-Type', 'text/html');
            res.send(result);
            return;
        }

        logger.log("Cache miss!");
        next();
    } catch (error) {
        console.error("Redis lookup error: " + error);
        next();
    }
};

const buildRedisCommand = (input) => {
    const args = input.split(" ");
    let command = `*${args.length}\r\n`;

    args.forEach((arg) => {
        command += `$${arg.length}\r\n${arg}\r\n`;
    });

    return command;
};

const sendCommand = (command) => {
    return new Promise((resolve, reject) => {
        if (!redisClient || redisClient.destroyed) {
            reject(new Error("Client is not connected"));
            return;
        }

        redisClient.write(buildRedisCommand(command));

        redisClient.once("data", (data) => {
            const str = data.toString();

            if (str.startsWith("$")) {
                const parts = str.split("\r\n");
                resolve(parts[1]);
            } else if (str === "$-1\r\n") {
                resolve(null);
            } else {
                resolve(str);
            }
            redisClient.removeListener("error", onError);
        });

        redisClient.once("error", onError);
    });
};

app.get("/", cacheMiddleware, async (req, res) => {
    const targetUrl = req.query.url;

    try {
        const parsedUrl = new URL(targetUrl);

        if (!isDomainAllowed(parsedUrl.hostname)) {
            return res.status(403).send('Domain not allowed.');
        }

        const addresses = await dns.lookup(parsedUrl.hostname);
        if (isPrivateIP(addresses.address)) {
            return res.status(403).send('Access to private IPs is not allowed.');
        }

        const response = await axios.get(targetUrl);
        const rawHtml = response.data;

        // Split by spaces, newlines, and tabs while keeping HTML structure
        const words = rawHtml.split(/\s+/).filter(word => word.trim().length > 0);

        for (const word of words) {
            await sendCommand(`RPUSH ${targetUrl} "${word}"`);
        }

        logger.log(`Stored ${words.length} words in Redis`);
        await sendCommand(`LPUSH ${targetUrl} ${words.length}`)
        res.setHeader('x-cache-status', 'MISS');
        res.set('Content-Type', 'text/html');
        res.send(rawHtml);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    logger.log("Server running on http://localhost:3000");
});
