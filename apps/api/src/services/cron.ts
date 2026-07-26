import cron from 'node-cron';
import { prisma } from './prisma';
import { sendSalonUpcomingAlert, sendCustomerReminder } from './whatsapp';

export function initCronJobs() {
  console.log('⏰ Initializing cron jobs for appointment reminders...');

  // Run every 5 minutes (45-min appointment alerts)
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
        }
      } catch (error) {
        console.error('❌ Error running appointment reminder cron job:', error);
      }
    },
    {
      timezone: 'America/Argentina/Buenos_Aires',
    }
  );

  // Daily 24-hour appointment confirmation check at 9:00 AM ART
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
          }
        }
      } catch (error) {
        console.error('❌ Error in 24h confirmation cron:', error);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );
}
