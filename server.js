const mysql = require('mysql2/promise');
require('dotenv').config()
const fastify = require('fastify')({ logger: false })
const port = process.env.PORT || 3000
fastify.register(require('fastify-websocket'))
const pool = mysql.createPool({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DB_PASSWD,
  database: process.env.DBNAME,
  port: process.env.DBPORT
});
console.log("application started on port: " + port)
const start = async () => {
  try {
    console.log("fastify has started")
    await fastify.listen(port,'0.0.0.0')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
fastify.register(require('fastify-static'), {
  root: __dirname,
  prefix: '/', // optional: default '/'
})
fastify.get('/entry', function (req, reply) {
  return reply.sendFile('./entry/index.html')
})

function dbQuery(dataExpression) {
  return pool.query(dataExpression)
}

fastify.get('/wss/', { websocket: true }, async (connection /* SocketStream */, req /* FastifyRequest */) => {
  console.log("client connected!");
  connection.socket.send(JSON.stringify({
    operation: "wssUpdate",
    content: {
      universidades: await dbQuery("SELECT DISTINCT universidad FROM `facultades`"),
      data: await dbQuery("SELECT * from `examenes`")
    }
  }))
  connection.socket.on('message', async message => {
    let msg = JSON.parse(message)
    if (msg.operation == "getFromDb") {
      connection.socket.send(JSON.stringify({
        operation: "updateFromDb",
        context: msg.context,
        get: msg.get,
        content: await dbQuery(msg.content)
      }))
    }
    if(msg.operation == "sendToDb" /* TODO on production origin check*/){
      let response = await dbQuery(msg.content)
      console.log("----------------")
      console.log(response)
      connection.socket.send(JSON.stringify({
        operation: "ResponseFromDb",
        type: "QueryResponse",
        response: response
      }))
    }
  })
})

start()