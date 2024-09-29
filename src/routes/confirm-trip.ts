/* eslint-disable camelcase */
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getMailClient } from '../lib/mail'
import { dayjs } from '../lib/dayjs'
import nodemailer from 'nodemailer'

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/confirm',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tripId } = request.params
      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          participants: {
            where: {
              is_owner: false,
            },
          },
        },
      })

      if (!trip) {
        throw new Error('Trip not found')
      }

      if (trip.is_confirmed) {
        return reply.redirect(`http://localhost:3000/trips/${tripId}`)
      }

      await prisma.trip.update({
        where: { id: tripId },
        data: { is_confirmed: true },
      })

      const formattedStartDate = dayjs(trip.starts_at).format('LL')
      const formattedEndDate = dayjs(trip.ends_at).format('LL')

      const mail = await getMailClient()

      await Promise.all(
        trip.participants.map(async (participant) => {
          const confimationLink = `http://localhost:3333/trips/${trip.id}/confirm/${participant.id}`

          const message = await mail.sendMail({
            from: {
              name: 'Planner time',
              address: 'oi@planner.net',
            },
            to: participant.email,
            subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartDate}`,
            html: `
          <div>
            <p>Você foi convidado(a) paraa participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
            <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
            <p>
              <a href="${confimationLink}">Confirmar viagem</a>
            </p>
            <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
          </div>
          `.trim(),
          })

          console.log(nodemailer.getTestMessageUrl(message))
        }),
      )

      return reply.redirect(`http://localhost:3000/trips/${tripId}`)
    },
  )
}
