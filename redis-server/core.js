const logger = require("./logger")("core")
const config = require("./config.json");
const persistence = require("./persistence");
const { store, expiryTime } = persistence;

const isExpired = (key) =>{
    // logger.log(`${expiryTime[key]}`)
    return expiryTime[key] && expiryTime[key] < Date.now();
}

const checkExpiry = (key) => {
    if(isExpired(key)){
        delete store[key]
        delete expiryTime[key]
        // logger.log(`${store} ${expiryTime}`)
        return true
    }
    return false
}

const executeCommand = (command, args) => {
    logger.log(`Received ${command} ${args}`)
    switch(command){
        case "PING":
            return "+PONG\r\n"
        case "SET":
            if(args.length < 2){
                return "-ERR wrong number of arguments for SET command\r\n";
            }

            const [key, val] = args
            store[key] = {type: "string", val}

            return "+OK\r\n"
        case "GET":
            if(args.length < 1){
                return "-ERR wrong number of arguments for GET command\r\n";
            }

            const [keyget] = args; 
            if (checkExpiry(keyget) || !store[keyget] || store[keyget].type !== "string"){
                return "$-1\r\n"
            }

            const value = store[keyget].val
            logger.log(store[keyget])
            logger.log(expiryTime[keyget])

            return `$${value.length}\r\n${value}\r\n`;
        case "DEL":
            if(args.length < 1){
                return "-ERR wrong number of arguments for DEL command\r\n";
            }

            const [keydel] = args;
            if(store[keydel]){
                delete store[keydel];
                delete expiryTime[keydel];

                return ":1\r\n"
            }else{
                return ":0\r\n"
            }
        case "EXPIRE":
            if(args.length < 2){
                return "-ERR wrong number of arguments for the EXPIRE command\r\n"
            }

            const [expKey, seconds] = args
            if(!store[expKey]) return ":0\r\n";
            expiryTime[expKey] = Date.now() + seconds * 1000;
            logger.log(expiryTime[expKey])

            return ":1\r\n";
        case "LPUSH":
            if(args.length < 2){
                return "-ERR wrong number of arguments for the LPUSH command\r\n"
            }

            const [keypush, ...values] = args

            if(!store[keypush]){
                store[keypush] = {type: "list", val:[]}
            }

            if(store[keypush].type !== "list"){
                return "-ERR wrong type of key\r\n"
            }

            store[keypush].val.unshift(...values);

            return `:${store[keypush].val.length}\r\n`;
        case "RPUSH":
            if (args.length < 2) {
                return "-ERR wrong number of arguments for the RPUSH command\r\n";
            }
        
            const [keyrpush, ...valuespush] = args;
        
            if (!store[keyrpush]) {
                store[keyrpush] = { type: "list", val: [] };
            }
        
            if (store[keyrpush].type !== "list") {
                return "-ERR wrong type of key\r\n";
            }
        
            store[keyrpush].val.push(...valuespush);
        
            return `:${store[keyrpush].val.length}\r\n`;
        case "LPOP":
            if (args.length < 1) {
                return "-ERR wrong number of arguments for the LPOP command\r\n";
            }
        
            const [keylpop] = args;
        
            if (
                checkExpiry(keylpop) ||
                !store[keylpop] ||
                store[keylpop].type !== "list" ||
                store[keylpop].val.length === 0
            ) {
                return "$-1\r\n";
            }
        
            const valuelpop = store[keylpop].val.shift();
        
            return `$${valuelpop.length}\r\n${valuelpop}\r\n`;
        case "RPOP":
            if (args.length < 1) {
                return "-ERR wrong number of arguments for the RPOP command\r\n";
            }
        
            const [keyrpop] = args;
        
            if (
                checkExpiry(keyrpop) ||
                !store[keyrpop] ||
                store[keyrpop].type !== "list" ||
                store[keyrpop].val.length === 0
            ) {
                return "$-1\r\n";
            }
        
            const valuerpop = store[keyrpop].val.pop();
        
            return `$${valuerpop.length}\r\n${valuerpop}\r\n`;
        case "LRANGE":
            if(args.length < 3){
                return "-ERR wrong number of arguments for the LRANGE command\r\n"
            }

            const [keyrange, start,stop] = args;

            if (checkExpiry(keyrange) || !store[keyrange] || store[keyrange].type !== "list"){
                return "$-1\r\n"
            }

            const list = store[keyrange].val
            const startIndex = parseInt(start, 10)
            const stopIndex = parseInt(stop, 10)
            const range = list.slice(startIndex,stopIndex + 1)
            let response = `*${range.length}\r\n`

            range.forEach((val)=>{
                response += `$${val.length}\r\n${val}\r\n`
            })

            return response
        case "LLEN":
            if (args.length < 1) {
                return "-ERR wrong number of arguments for the LLEN command\r\n";
            }
        
            const [keyLlen] = args;
            if (!store[keyLlen] || store[keyLlen].type !== "list") {
                return ":0\r\n";  // If the key doesn't exist or isn't a list, return length 0
            }
        
            return `:${store[keyLlen].val.length}\r\n`;  
        case "TTL":
            if(args.length < 1){
                return "-ERR wrong number of arguments for the TTL command\r\n"
            }
            const [keyttl] = args;
            if (checkExpiry(keyttl) || !store[keyttl]) return ":-2\r\n"

            if (!expiryTime[keyttl]) return ":-1\r\n";

            const ttl = Math.floor((expiryTime[keyttl] - Date.now()) / 1000) //No of seconds

            return ttl > 0 ? `:${ttl}\r\n` : ":-2\r\n";
        case "INCR":
            if(args.length < 1){
                return "-ERR wrong number of arguments for the INCR command\r\n"
            }

            const [keyincr] = args
            if(!store[keyincr]){
                store[keyincr] = {type: "string", val: "1"};
                return ":1\r\n"
            }

            const valueincr = parseInt(store[keyincr].val,10);

            if (isNaN(valueincr)) return "-ERR value is not an integer or out of range\r\n";
            store[keyincr].val = (valueincr + 1).toString();
            return `:${valueincr + 1}\r\n`
        case "DECR":
            if (args.length < 1) {
                return "-ERR wrong number of arguments for the DECR command\r\n";
            }
        
            const [keydecr] = args;
        
            if (!store[keydecr]) {
                store[keydecr] = { type: "string", val: "-1" };
        
                return ":-1\r\n";
            }
        
            const valuedecr = parseInt(store[keydecr].val, 10);
        
            if (isNaN(valuedecr)) {
                return "-ERR value is not an integer or out of range\r\n";
            }
        
            store[keydecr].val = (valuedecr - 1).toString();
        
            return `:${valuedecr - 1}\r\n`;
        case "COMMAND":
            return "+OK\r\n"
        default:
            return "-ERR unknown command\r\n"
    }
}

const parseCommand = (data)=>{
    const lines = data
        .toString()
        .split("\r\n")
        .filter((line) => !!line)
    
    const command =  lines[2].toUpperCase();
    const args = lines.slice(4).filter((_,idx) => idx%2 == 0)
    // logger.log(command)
    logger.log(args)

    return {command, args}
}

const init = ()=>{
    if (config.snapshot) {
        logger.log("Persistence mode: 'snapshot'");
        persistence.loadSnapshotSync();
    
        setInterval(async () => {
          await persistence.saveSnapshot();
        }, config.snapshotInterval);
    } else {
    logger.log("Persistence mode: 'in-memory'");
    }
}

module.exports = {init,parseCommand, executeCommand}