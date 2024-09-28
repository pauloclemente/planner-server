import fastify from 'fastify'
import { createTrip } from './routes/create-trip'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import cors from '@fastify/cors'
import { confirmTrip } from './routes/confirm-trip'

const app = fastify()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(cors, {
  origin: true,
})
app.register(createTrip)
app.register(confirmTrip)

app.listen({ port: 3333 }).then(() => {
  console.log('listening on port 3333')
})
