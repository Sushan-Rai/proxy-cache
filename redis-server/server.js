const net = require("net");
const {init, parseCommand, executeCommand } = require("./core");

const logger = require("./logger")("server");

const server = net.createServer();
const port = 6379;
// const host = "127.0.0.1";
const host = "0.0.0.0";

server.on("connection", (socket) => {
  socket.on("data", (data) => {
    let result;
    try{
      const {command, args} = parseCommand(data);
      result = executeCommand(command,args);
      logger.log(result)
    }catch(err){
      logger.error(err);
      result = "-ERR unknown command\r\n"
    }
    socket.write(result)
    // socket.write("res: " + reqData);
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });

  socket.on("error",(error)=>{
    logger.log(error)
  })
});

server.listen(port, host, () => {
  init();
  logger.log(`Server running at ${host}:${port}`);
});