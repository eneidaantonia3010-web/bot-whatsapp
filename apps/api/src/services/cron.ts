import cron from 'node-cron';
import { prisma } from './prisma';
import { sendSalonUpcomingAlert, sendCustomerReminder } from './whatsapp';
import { config } from '../config';

const EVOLUTION_API_URL = config.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = config.EVOLUTION_API_KEY;
const INSTANCE_NAME = config.INSTANCE_NAME;

export function initCronJobs() {
  console.log('⏰ Initializing cron jobs for appointment reminders and WhatsApp keepalive...');

  // 1. Run every 10 minutes: Evolution API Connection Keepalive & Health Check
  cron.schedule(
    '*/10 * * * *',
    async () => {
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return;

      try {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
          headers: { 'apikey': EVOLUTION_API_KEY },
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const state = data.instance?.state || data.state;
          if (state === 'open') {
            console.log(`💚 [Cron Health Check] Evolution API WhatsApp Connection OPEN (${INSTANCE_NAME})`);
          } else {
            console.warn(`⚠️ [Cron Health Check] Evolution API WhatsApp State: ${state}. Attempting reconnect...`);
            await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
              headers: { 'apikey': EVOLUTION_API_KEY },
            });
          }
        }
      } catch (error: any) {
        console.error('❌ Error checking Evolution API WhatsApp health in cron:', error.message);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  // 2. Run every 5 minutes (45-min appointment alerts)
  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        const now = new Date();
        
        // Look 40 to 45 minutes into the future
        const targetStart = new Date(now.getTime() + 40 * 60000);
        const targetEnd = new Date(now.getTime() + 45 * 60000);

        const upcomingAppointments = await prisma.appointment.findMany({
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            reminderSent1h: false,
            date: {
              gt: targetStart,
              lte: targetEnd,
            },
          },
          include: {
            customer: true,
            service: true,
          },
        });

        for (const apt of upcomingAppointments) {
          const timeStr = apt.date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires',
          }) + 'hs';

          // 1. Send alert to the salon
          await sendSalonUpcomingAlert({
            customerName: apt.customer.name,
            serviceName: apt.service.name,
            timeStr,
          });

          // 2. Send reminder to the customer (if they have a phone number)
          if (apt.customer.phone) {
            await sendCustomerReminder({
              customerPhone: apt.customer.phone,
              customerName: apt.customer.name,
              serviceName: apt.service.name,
              timeStr,
            });
          }

          // Mark reminder sent
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderSent1h: true },
          }).catch(() => {});
        }
      } catch (error) {
        console.error('❌ Error running appointment reminder cron job:', error);
      }
    },
    {
      timezone: 'America/Argentina/Buenos_Aires',
    }
  );

  // 3. Daily 24-hour appointment confirmation check at 9:00 AM ART
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        console.log('⏰ Running daily 24h appointment confirmation job...');
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const pendingTomorrow = await prisma.appointment.findMany({
          where: {
            status: 'PENDING',
            reminderSent24h: false,
            date: {
              gte: tomorrowStart,
              lte: tomorrowEnd,
            },
          },
          include: { customer: true, service: true },
        });

        for (const apt of pendingTomorrow) {
          if (apt.customer.phone) {
            const timeStr = apt.date.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/Argentina/Buenos_Aires',
            }) + 'hs';

            await sendCustomerReminder({
              customerPhone: apt.customer.phone,
              customerName: apt.customer.name,
              serviceName: apt.service.name,
              timeStr,
            });

            await prisma.appointment.update({
              where: { id: apt.id },
              data: { reminderSent24h: true },
            }).catch(() => {});
          }
        }
      } catch (error) {
        console.error('❌ Error in 24h confirmation cron:', error);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  // 4. Post-Service Review Request (runs every hour for appointments completed 2 hours ago)
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

        const completedRecently = await prisma.appointment.findMany({
          where: {
            status: 'COMPLETED',
            date: {
              gte: threeHoursAgo,
              lte: twoHoursAgo,
            },
            review: null,
          },
          include: { customer: true, service: true },
        });

        for (const apt of completedRecently) {
          if (apt.customer?.phone) {
            const reviewMsg = `✨ *¡Hola ${apt.customer.name}!* 💕\n\nEsperamos que hayas disfrutado mucho tu atención en *Glow Studio* con *${apt.service.name}*.\n\n¿Cómo calificarías tu experiencia hoy del 1 al 5? ⭐\n\n_¡Tu opinión nos ayuda a seguir brindándote la mejor atención!_ ✨`;
            const { sendWhatsAppMessage } = await import('./whatsapp');
            await sendWhatsAppMessage({
              to: apt.customer.phone,
              message: reviewMsg,
            });
            console.log(`⭐ Sent post-service review request to ${apt.customer.phone}`);
          }
        }
      } catch (error) {
        console.error('❌ Error in post-service review cron:', error);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  // 5. Func 2: Expire Old Waitlist Offers (runs every 30 minutes)
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const expiredOffers = await prisma.waitlist.findMany({
          where: {
            status: 'OFFERED',
            offeredAt: { lt: twoHoursAgo },
          },
          include: { service: true },
        });

        for (const exp of expiredOffers) {
          await prisma.waitlist.update({
            where: { id: exp.id },
            data: { status: 'EXPIRED' },
          });

          // Offer to next waiting client
          const nextClient = await prisma.waitlist.findFirst({
            where: {
              serviceId: exp.serviceId,
              preferredDate: exp.preferredDate,
              status: 'WAITING',
            },
            include: { customer: true, service: true },
            orderBy: { createdAt: 'asc' },
          });

          if (nextClient && nextClient.customer?.phone) {
            const dateStr = nextClient.preferredDate.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            const msg = (
              `🎉 *¡Buenas noticias ${nextClient.customer.name}!* 💕\n\n` +
              `Hay un lugar disponible para *${nextClient.service.name}* el *${dateStr}* en *Glow Studio*.\n\n` +
              `👉 *Respondé SÍ para reservarlo ahora.*`
            );
            const { sendWhatsAppMessage } = await import('./whatsapp');
            await sendWhatsAppMessage({
              to: nextClient.customer.phone,
              message: msg,
            });
            await prisma.waitlist.update({
              where: { id: nextClient.id },
              data: { status: 'OFFERED', offeredAt: new Date() },
            });
          }
        }
      } catch (error) {
        console.error('❌ Error in waitlist expiry cron:', error);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  // 6. Func 4: Recurring Service Renewal Reminder (Daily at 10:30 AM ART)
  cron.schedule(
    '30 10 * * *',
    async () => {
      try {
        const now = new Date();
        const threeWeeksAgoStart = new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000);
        const threeWeeksAgoEnd = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

        const pastAppointments = await prisma.appointment.findMany({
          where: {
            status: 'COMPLETED',
            date: { gte: threeWeeksAgoStart, lte: threeWeeksAgoEnd },
            OR: [
              { recurrence: { in: ['BIWEEKLY', 'MONTHLY', 'WEEKLY'] } },
              { service: { category: { in: ['unas', 'cabello'] } } },
            ],
          },
          include: { customer: true, service: true },
        });

        for (const apt of pastAppointments) {
          if (!apt.customer?.phone) continue;

          // Check if customer already has a future appointment
          const futureApt = await prisma.appointment.findFirst({
            where: {
              customerId: apt.customerId,
              date: { gte: now },
              status: { in: ['PENDING', 'CONFIRMED'] },
            },
          });

          if (!futureApt) {
            const reminderText = (
              `✨ *¡Hola ${apt.customer.name}!* 💕\n\n` +
              `Ya pasaron unas semanas desde tu último servicio de *${apt.service.name}* en *Glow Studio*.\n\n` +
              `¿Te gustaría agendar tu próximo turno para mantenerlo impecable? ✨\n\n` +
              `👉 Respondé *RESERVAR* o escribinos el día que te quede más cómodo.`
            );
            const { sendWhatsAppMessage } = await import('./whatsapp');
            await sendWhatsAppMessage({
              to: apt.customer.phone,
              message: reminderText,
            });
            console.log(`🔄 Sent recurrence re-engagement to ${apt.customer.name} (${apt.customer.phone})`);
          }
        }
      } catch (error) {
        console.error('❌ Error in recurring appointment reminder cron:', error);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );
}

